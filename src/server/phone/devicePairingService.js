/**
 * devicePairingService.js
 *
 * Secure Device Pairing Ceremony & Lifecycle Engine (Stage 2A).
 *
 * Rules:
 * 1. Start pairing generates a single-use 6-digit challenge valid for 5 minutes.
 * 2. The server stores ONLY the cryptographic SHA-256 hash of the pairing code.
 * 3. Complete pairing atomically redeems the challenge and binds the device to the challenge owner UID.
 * 4. Device credentials are high-entropy bearer tokens, stored only as SHA-256 hashes.
 * 5. Device revocation immediately marks the device and all associated credentials as revoked.
 */

import crypto from 'crypto';
import {
  sha256,
  hashPairingCode,
  generatePairingCode,
  generateDeviceToken
} from './phoneAuthenticationService.js';
import {
  validatePairingCompleteRequest
} from './phoneValidation.js';

const PAIRING_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initiates pairing challenge from an authenticated web workstation
 */
export async function startPairingChallenge(ownerUid, repository) {
  if (!ownerUid) {
    return { success: false, error: 'Owner UID is required.', code: 'MISSING_OWNER_UID', statusCode: 400 };
  }

  // Rate limit: max 10 challenge generations per 10 minutes per user
  const rateLimit = await repository.checkRateLimit(`pair_start_${ownerUid}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Too many pairing requests. Please wait a few minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    };
  }

  const rawCode = generatePairingCode();
  const codeHash = hashPairingCode(rawCode);
  const challengeId = `pch_${crypto.randomUUID()}`;
  const now = Date.now();
  const expiresAt = now + PAIRING_EXPIRY_MS;

  const challenge = {
    challengeId,
    codeHash,
    ownerUid,
    status: 'PENDING',
    attemptsCount: 0,
    expiresAt,
    createdAt: now
  };

  await repository.savePairingChallenge(challenge);

  return {
    success: true,
    challengeId,
    pairingCode: rawCode,
    expiresAt,
    expiresInSeconds: Math.floor(PAIRING_EXPIRY_MS / 1000)
  };
}

/**
 * Completes pairing ceremony from future Android companion
 */
export async function completePairingChallenge(payload, repository, clientIp = 'unknown_ip') {
  const validation = validatePairingCompleteRequest(payload);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: validation.code, statusCode: 400 };
  }

  const { pairingCode, deviceId, deviceName, protocolVersion, consent, challengeId } = payload;

  // Rate limit attempts per client IP: max 15 attempts per 5 minutes
  const ipLimit = await repository.checkRateLimit(`pair_attempt_ip_${clientIp}`, 15, 5 * 60 * 1000);
  if (!ipLimit.allowed) {
    return {
      success: false,
      error: 'Too many failed pairing attempts from this IP. Please wait.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    };
  }

  // Rate limit attempts per device ID: max 5 attempts per 5 minutes
  const devLimit = await repository.checkRateLimit(`pair_attempt_dev_${deviceId}`, 5, 5 * 60 * 1000);
  if (!devLimit.allowed) {
    return {
      success: false,
      error: 'Too many failed pairing attempts for this device. Please wait.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    };
  }

  const codeHash = hashPairingCode(pairingCode.trim());
  const now = Date.now();
  const rawDeviceToken = generateDeviceToken();
  const tokenHash = sha256(rawDeviceToken);

  const deviceRecord = {
    deviceId,
    deviceName: deviceName.trim(),
    protocolVersion,
    status: 'active',
    consent,
    pairedAt: now,
    lastSeenAt: now
  };

  const credentialRecord = {
    tokenHash,
    deviceId,
    status: 'active',
    createdAt: now
  };

  const redemption = await repository.redeemPairingChallengeTransaction({
    challengeId: challengeId || null,
    codeHash,
    deviceId,
    deviceRecord,
    credentialRecord
  });

  if (!redemption.success) {
    const statusCode = redemption.code === 'DEVICE_ID_CONFLICT' ? 409 : 400;
    return {
      success: false,
      error: redemption.error,
      code: redemption.code,
      statusCode
    };
  }

  return {
    success: true,
    deviceId,
    deviceToken: rawDeviceToken,
    protocolVersion,
    pairedAt: now
  };
}

/**
 * Lists all registered devices for an authenticated owner
 */
export async function listOwnerDevices(ownerUid, repository) {
  if (!ownerUid) {
    return { success: false, error: 'Owner UID required.', code: 'UNAUTHORIZED', statusCode: 401 };
  }

  const rawDevices = await repository.listDevicesByOwner(ownerUid);

  // Return clean DTOs without credential hashes
  const devices = rawDevices.map(d => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    status: d.status,
    protocolVersion: d.protocolVersion,
    pairedAt: d.pairedAt,
    lastSeenAt: d.lastSeenAt,
    revokedAt: d.revokedAt || null
  }));

  return {
    success: true,
    devices
  };
}

/**
 * Revokes a device and invalidates all associated credentials
 */
export async function revokeDevice(ownerUid, deviceId, repository) {
  if (!ownerUid || !deviceId) {
    return { success: false, error: 'Invalid parameters.', code: 'INVALID_REQUEST', statusCode: 400 };
  }

  const device = await repository.getDevice(deviceId);
  if (!device || device.ownerUid !== ownerUid) {
    return {
      success: false,
      error: 'Device not found or not owned by authenticated user.',
      code: 'DEVICE_NOT_FOUND',
      statusCode: 404
    };
  }

  const now = Date.now();
  await repository.updateDevice(deviceId, {
    status: 'revoked',
    revokedAt: now
  });

  await repository.revokeDeviceCredentials(deviceId);

  return {
    success: true,
    deviceId,
    revoked: true,
    revokedAt: now
  };
}
