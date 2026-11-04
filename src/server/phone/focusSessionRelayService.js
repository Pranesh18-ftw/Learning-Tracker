/**
 * focusSessionRelayService.js
 *
 * Focus Session Lifecycle Relay & Device Polling Engine (Stage 2A).
 *
 * Rules:
 * 1. The browser publishes SESSION_STARTED and SESSION_ENDED using canonical session IDs.
 * 2. The server distinguishes client-reported start/end timestamps from authoritative server receipt timestamps.
 * 3. Only the authenticated session owner can publish session lifecycle changes.
 * 4. Active session queries by paired devices are strictly owner-scoped and sanitized.
 * 5. If multiple sessions are active simultaneously, returns an explicit AMBIGUOUS status instead of guessing.
 */

import {
  validateSessionStartRequest,
  validateSessionEndRequest
} from './phoneValidation.js';

/**
 * Publishes session start from web workstation
 */
export async function relaySessionStart(ownerUid, payload, repository) {
  const validation = validateSessionStartRequest(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: validation.code, statusCode: 400 };
  }

  const { sessionId, startedAt, intendedDurationSeconds, taskName, subjectName } = payload;

  const existing = await repository.getFocusSession(sessionId);
  if (existing) {
    if (existing.ownerUid !== ownerUid) {
      return {
        success: false,
        error: 'Session identifier belongs to another user.',
        code: 'CROSS_ACCOUNT_SESSION',
        statusCode: 409
      };
    }
    return {
      success: true,
      session: existing,
      idempotent: true
    };
  }

  // Supersede any previously running sessions for this owner
  const activeSessions = await repository.getActiveFocusSessions(ownerUid);
  for (const s of activeSessions) {
    if (s.sessionId !== sessionId) {
      await repository.updateFocusSession(s.sessionId, { status: 'SUPERSEDED', endedAtServer: Date.now() });
    }
  }

  const now = Date.now();
  const sessionRecord = {
    sessionId,
    ownerUid,
    startedAtClient: startedAt,
    startedAtServer: now,
    endedAtClient: null,
    endedAtServer: null,
    intendedDurationSeconds,
    taskName: typeof taskName === 'string' ? taskName.slice(0, 150) : 'Focus Session',
    subjectName: typeof subjectName === 'string' ? subjectName.slice(0, 150) : 'Learning Work',
    status: 'RUNNING',
    reconciledTelemetryId: null,
    createdAt: now
  };

  await repository.saveFocusSession(sessionRecord);

  return {
    success: true,
    session: sessionRecord
  };
}

/**
 * Publishes session end/completion from web workstation
 */
export async function relaySessionEnd(ownerUid, sessionId, payload, repository) {
  const validation = validateSessionEndRequest(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: validation.code, statusCode: 400 };
  }

  const session = await repository.getFocusSession(sessionId);
  if (!session || session.ownerUid !== ownerUid) {
    return {
      success: false,
      error: 'Session not found or not owned by user.',
      code: 'SESSION_NOT_FOUND',
      statusCode: 404
    };
  }

  if (session.status === 'COMPLETE' || session.status === 'CANCELLED') {
    return {
      success: true,
      session,
      idempotent: true
    };
  }

  const now = Date.now();
  const patch = {
    endedAtClient: payload.endedAt,
    endedAtServer: now,
    status: payload.status || 'COMPLETE'
  };

  const updated = await repository.updateFocusSession(sessionId, patch);

  return {
    success: true,
    session: updated
  };
}

/**
 * Polled by paired Android companion to discover current focus session
 */
export async function getActiveSessionForDevice(ownerUid, repository) {
  if (!ownerUid) {
    return { status: 'UNAUTHORIZED', activeSession: null, statusCode: 401 };
  }

  const runningSessions = await repository.getActiveFocusSessions(ownerUid);

  if (runningSessions.length === 0) {
    return {
      status: 'NO_ACTIVE_SESSION',
      activeSession: null,
      serverTime: Date.now()
    };
  }

  if (runningSessions.length > 1) {
    return {
      status: 'AMBIGUOUS_ACTIVE_SESSIONS',
      activeSession: null,
      message: 'Multiple sessions active simultaneously; unable to associate safely.',
      serverTime: Date.now()
    };
  }

  const target = runningSessions[0];
  return {
    status: 'ACTIVE_SESSION_FOUND',
    activeSession: {
      protocolVersion: '1.0.0',
      sessionId: target.sessionId,
      startedAt: target.startedAtClient,
      intendedDurationSeconds: target.intendedDurationSeconds,
      taskName: target.taskName,
      subjectName: target.subjectName
    },
    serverTime: Date.now()
  };
}

/**
 * Retrieves specific session status and timestamps for an authenticated owner or paired device
 */
export async function getSessionStatusForDevice(ownerUid, sessionId, repository) {
  if (!ownerUid || !sessionId) {
    return { success: false, error: 'Invalid parameters.', code: 'INVALID_REQUEST', statusCode: 400 };
  }

  const session = await repository.getFocusSession(sessionId);
  if (!session || session.ownerUid !== ownerUid) {
    return {
      success: false,
      error: 'Session not found or not owned by authenticated user.',
      code: 'SESSION_NOT_FOUND',
      statusCode: 404
    };
  }

  return {
    success: true,
    sessionId: session.sessionId,
    status: session.status,
    startedAt: session.startedAtClient,
    endedAt: session.endedAtClient,
    serverStartedAt: session.startedAtServer,
    serverEndedAt: session.endedAtServer,
    intendedDurationSeconds: session.intendedDurationSeconds,
    taskName: session.taskName,
    subjectName: session.subjectName
  };
}

/**
 * Retrieves recently completed focus sessions that lack companion telemetry.
 * Authenticated for paired devices to recover missed sessions (e.g. companion closed during session).
 * Bounded to max 10 sessions within the last 24 hours.
 */
export async function getUnreconciledSessionsForDevice(ownerUid, repository, { limit = 5, since = null } = {}) {
  if (!ownerUid) {
    return { success: false, error: 'Authentication required.', code: 'UNAUTHORIZED', statusCode: 401 };
  }

  const maxLimit = Math.min(Math.max(1, parseInt(limit, 10) || 5), 10);
  const now = Date.now();
  const maxLookbackMs = 24 * 60 * 60 * 1000; // 24 hours
  const requestedSince = since ? parseInt(since, 10) : null;
  const sinceMs = requestedSince && !isNaN(requestedSince)
    ? Math.max(requestedSince, now - maxLookbackMs)
    : now - maxLookbackMs;

  const rawSessions = await repository.getUnreconciledFocusSessions(ownerUid, { limit: maxLimit, sinceMs });

  const sessions = rawSessions.map(s => ({
    sessionId: s.sessionId,
    startedAt: s.startedAtClient,
    endedAt: s.endedAtClient || s.endedAtServer || now,
    serverStartedAt: s.startedAtServer,
    serverEndedAt: s.endedAtServer,
    intendedDurationSeconds: s.intendedDurationSeconds,
    status: s.status,
    taskName: s.taskName || null,
    subjectName: s.subjectName || null
  }));

  return {
    success: true,
    sessions,
    cursor: now
  };
}
