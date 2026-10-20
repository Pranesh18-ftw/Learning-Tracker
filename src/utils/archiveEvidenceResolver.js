/**
 * archiveEvidenceResolver.js
 *
 * Pure, deterministic resolution of curated ARCHIVE artifacts.
 *
 * PHILOSOPHY:
 * 1. Archive is what the user actually did, built, understood, survived, and became capable of.
 * 2. Not a database table (Date | Task | Duration | Status).
 * 3. A living timeline of meaningful artifacts with visual hierarchy.
 * 4. Never fabricates missing evidence or fake stock photos.
 * 5. One canonical event data model (same sessions, completions, roadmap).
 */

import { parseLocalDateKey } from './dateUtils';

export function formatArchiveDate(dateStr) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? (parseLocalDateKey(dateStr) || new Date(dateStr)) : dateStr;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatArchiveMonth(dateStr) {
  if (!dateStr) return 'EARLIER';
  const d = typeof dateStr === 'string' ? (parseLocalDateKey(dateStr) || new Date(dateStr)) : dateStr;
  if (isNaN(d.getTime())) return 'EARLIER';
  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const year = d.getFullYear();
  return `${month} ${year}`;
}

/**
 * Domain color mapping for consistent, quiet identification
 */
export function resolveDomainColor(domainName = '') {
  const lower = (domainName || '').toLowerCase();
  if (lower.includes('electron') || lower.includes('electric') || lower.includes('circuit')) return 'blue';
  if (lower.includes('physic') || lower.includes('signal')) return 'violet';
  if (lower.includes('program') || lower.includes('software') || lower.includes('code') || lower.includes('embedded')) return 'emerald';
  if (lower.includes('math') || lower.includes('calculus')) return 'coral';
  return 'amber';
}

/**
 * Build curated Archive Artifacts from canonical data
 */
export function buildArchiveArtifacts({
  roadmap = [],
  sessions = [],
  taskCompletions = [],
  notes = [],
  pinnedIds = [],
  annotations = {}
}) {
  const artifacts = [];
  const pinnedSet = new Set(pinnedIds || []);

  // Helper to resolve roadmap context
  const findContext = (subjectId, phaseId, taskId, subtaskId) => {
    let subjectName = '';
    let phaseName = '';
    let taskName = '';
    let subtaskName = '';

    if (!subjectId && !phaseId && !taskId && !subtaskId) {
      return { subjectName, phaseName, taskName, subtaskName };
    }

    for (const subj of roadmap || []) {
      if (subjectId && subj.id !== subjectId) continue;
      for (const ph of subj.phases || []) {
        if (phaseId && ph.id !== phaseId) continue;
        for (const tk of ph.tasks || []) {
          if (taskId && tk.id !== taskId) continue;
          subjectName = subj.name;
          phaseName = ph.name;
          taskName = tk.name;
          if (subtaskId) {
            const st = (tk.subtasks || []).find(s => s.id === subtaskId || s.name === subtaskId);
            if (st) subtaskName = st.name;
          }
          return { subjectName, phaseName, taskName, subtaskName };
        }
      }
    }
    return { subjectName, phaseName, taskName, subtaskName };
  };

  let hasRecordedFirstProject = false;
  let hasRecordedFirstEvidence = false;

  // 1. Projects & Practical Builds (from roadmap completed project tasks)
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        const tkNameLower = (tk.name || '').toLowerCase();
        const isProjectTask = tkNameLower.includes('project') ||
                              tkNameLower.includes('build') ||
                              tkNameLower.includes('prototype') ||
                              tkNameLower.includes('monitor') ||
                              tkNameLower.includes('interface') ||
                              tkNameLower.includes('circuit design');

        const subtasks = tk.subtasks || [];
        const completedSubtasks = subtasks.filter(st => st.completed);
        const hasCompletedSubtasks = completedSubtasks.length > 0;

        if (isProjectTask && (tk.completed || hasCompletedSubtasks)) {
          const dateVal = tk.completedAt || (completedSubtasks[0]?.completedAt) || new Date().toISOString();
          const artifactId = `art-proj-${tk.id}`;
          const isFirst = !hasRecordedFirstProject;
          if (isFirst) hasRecordedFirstProject = true;

          // Extract real demonstrated capabilities from completed subtask names only
          const capabilities = completedSubtasks.length > 0
            ? completedSubtasks.map(st => st.name.replace(/^(Build|Test|Measure|Simulate|Code|Implement)\s*/i, ''))
            : [];

          // Stage badges: derive ONLY from authentic subtask/task actions
          const badges = [];
          const allText = (tk.name + ' ' + (subtasks.map(s => s.name).join(' '))).toLowerCase();
          if (allText.includes('build') || allText.includes('breadboard') || allText.includes('solder') || allText.includes('assembly')) badges.push('Built');
          if (allText.includes('test') || allText.includes('simulate') || allText.includes('verification')) badges.push('Tested');
          if (allText.includes('measure') || allText.includes('multimeter') || allText.includes('oscilloscope') || allText.includes('probe')) badges.push('Measured');
          const stageBadges = badges.length > 0 ? badges : (tk.completed ? ['Completed'] : ['In Progress']);

          const realReflection = tk.reflection || tk.notes || completedSubtasks.find(s => s.notes)?.notes || null;

          artifacts.push({
            id: artifactId,
            type: 'project',
            title: tk.name,
            subheading: 'Practical Engineering Build',
            domain: subj.name,
            domainColor: resolveDomainColor(subj.name),
            date: dateVal,
            displayDate: formatArchiveDate(dateVal),
            monthGroup: formatArchiveMonth(dateVal),
            stageBadges,
            capabilities: capabilities.slice(0, 4),
            reflection: realReflection,
            weight: isFirst ? 'hero' : 'large',
            isFirst,
            firstLabel: isFirst ? 'FIRST PRACTICAL BUILD' : null,
            isPinned: pinnedSet.has(artifactId),
            annotation: annotations[artifactId] || null,
            links: {
              world: '/roadmap',
              path: '/plan',
              growth: '/statistics'
            }
          });
        }
      });
    });
  });

  // 2. Unassisted Recall Evidence Artifacts (Self-reported unassisted explanation with genuine notes)
  (sessions || []).forEach((s, idx) => {
    if (!s) return;
    const dateVal = s.startedAt || s.date || new Date().toISOString();
    const ctx = findContext(s.subjectId, s.phaseId, s.taskId, s.subtaskId);
    const concept = ctx.subtaskName || ctx.taskName || s.notes?.split('—')[0]?.trim() || 'Core Concept';

    const hasNotes = Boolean(s.notes && s.notes.trim().length > 0 && !s.notes.startsWith('Completed without notes'));
    const isVerifiedEvidence = s.explainWithoutNotes === 'yes' && hasNotes;

    if (isVerifiedEvidence) {
      const artifactId = `art-ev-${s.id || idx}`;
      const isFirst = !hasRecordedFirstEvidence;
      if (isFirst) hasRecordedFirstEvidence = true;

      artifacts.push({
        id: artifactId,
        type: 'evidence',
        title: `Derived & Explained: ${concept}`,
        subheading: 'Active Retrieval & Explanation',
        conceptName: concept,
        domain: ctx.subjectName || 'Electronics',
        domainColor: resolveDomainColor(ctx.subjectName),
        date: dateVal,
        displayDate: formatArchiveDate(dateVal),
        monthGroup: formatArchiveMonth(dateVal),
        quote: s.notes || 'Unassisted recall reflection.',
        durationMinutes: s.durationMinutes || 25,
        weight: isFirst ? 'hero' : 'medium',
        isFirst,
        firstLabel: isFirst ? 'FIRST UNASSISTED RECALL' : null,
        isPinned: pinnedSet.has(artifactId),
        annotation: annotations[artifactId] || null,
        links: {
          world: '/roadmap',
          growth: '/statistics'
        }
      });
    }
  });

  // 3. Meaningful Learner Reflections ("Note to Future Me")
  (sessions || []).forEach((s, idx) => {
    if (!s || !s.notes || s.notes.length < 20) return;
    // If not already classified as pure evidence, archive as reflection
    if (s.explainWithoutNotes !== 'yes') {
      const dateVal = s.startedAt || s.date || new Date().toISOString();
      const ctx = findContext(s.subjectId, s.phaseId, s.taskId, s.subtaskId);
      const concept = ctx.subtaskName || ctx.taskName || 'Working Intuition';
      const artifactId = `art-refl-${s.id || idx}`;

      artifacts.push({
        id: artifactId,
        type: 'reflection',
        title: `Note to Future Me`,
        subheading: `Conceptual Realization · ${concept}`,
        conceptName: concept,
        domain: ctx.subjectName || 'Electronics',
        domainColor: resolveDomainColor(ctx.subjectName),
        date: dateVal,
        displayDate: formatArchiveDate(dateVal),
        monthGroup: formatArchiveMonth(dateVal),
        quote: s.notes,
        durationMinutes: s.durationMinutes || 20,
        weight: 'medium',
        isPinned: pinnedSet.has(artifactId),
        annotation: annotations[artifactId] || null,
        links: {
          world: '/roadmap',
          path: '/plan'
        }
      });
    }
  });

  // 4. Standalone Notes (from user scratchpad / reflections)
  (notes || []).forEach((n, idx) => {
    if (!n || !n.content) return;
    const dateVal = n.createdAt || new Date().toISOString();
    const artifactId = `art-note-${n.id || idx}`;

    artifacts.push({
      id: artifactId,
      type: 'reflection',
      title: n.title || 'Technical Field Note',
      subheading: 'Scratchpad Derivation',
      domain: n.subjectName || 'Electronics',
      domainColor: resolveDomainColor(n.subjectName),
      date: dateVal,
      displayDate: formatArchiveDate(dateVal),
      monthGroup: formatArchiveMonth(dateVal),
      quote: n.content,
      weight: 'medium',
      isPinned: pinnedSet.has(artifactId),
      annotation: annotations[artifactId] || null,
      links: {
        world: '/roadmap'
      }
    });
  });

  // 5. Concept Capability Milestones (from completed roadmap items)
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        const subtasks = tk.subtasks || [];
        const completedCount = subtasks.filter(s => s.completed).length;
        if (completedCount >= 2 || (tk.completed && subtasks.length > 0)) {
          const dateVal = tk.completedAt || (subtasks.find(s => s.completed)?.completedAt) || new Date().toISOString();
          const artifactId = `art-concept-${tk.id}`;

          artifacts.push({
            id: artifactId,
            type: 'concept',
            title: tk.name,
            subheading: `Completed Concept Milestone · ${ph.name}`,
            conceptName: tk.name,
            domain: subj.name,
            domainColor: resolveDomainColor(subj.name),
            date: dateVal,
            displayDate: formatArchiveDate(dateVal),
            monthGroup: formatArchiveMonth(dateVal),
            demonstratedPoints: subtasks.map(st => ({
              name: st.name,
              status: st.completed ? '✓' : '△',
              label: st.completed ? 'Completed' : 'In Practice'
            })),
            weight: 'medium',
            isPinned: pinnedSet.has(artifactId),
            annotation: annotations[artifactId] || null,
            links: {
              world: '/roadmap',
              growth: '/statistics'
            }
          });
        }
      });
    });
  });

  // 6. Recovery Artifacts ("The Return")
  // Detect genuine gaps of 3+ days followed by a resumed session
  const sortedSessions = [...(sessions || [])]
    .map(s => ({
      ...s,
      timestamp: new Date(s.startedAt || s.date || 0).getTime()
    }))
    .filter(s => s.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  let hasRecordedFirstRecovery = false;

  for (let i = 1; i < sortedSessions.length; i++) {
    const prev = sortedSessions[i - 1];
    const curr = sortedSessions[i];
    const diffDays = Math.floor((curr.timestamp - prev.timestamp) / (1000 * 60 * 60 * 24));

    if (diffDays >= 3) {
      const artifactId = `art-recov-${curr.id || i}`;
      const isFirst = !hasRecordedFirstRecovery;
      if (isFirst) hasRecordedFirstRecovery = true;

      const dateVal = new Date(curr.timestamp).toISOString();

      artifacts.push({
        id: artifactId,
        type: 'recovery',
        title: 'THE RETURN',
        subheading: 'Resilience Over Streaks',
        domain: 'Habit & Continuity',
        domainColor: 'amber',
        date: dateVal,
        displayDate: formatArchiveDate(dateVal),
        monthGroup: formatArchiveMonth(dateVal),
        missedDays: diffDays,
        returnedSessionsCount: 1,
        quote: `${diffDays} days away → returned and completed a focused session without breaking route continuity.`,
        weight: 'highlight',
        isFirst,
        firstLabel: isFirst ? 'FIRST RESILIENT RETURN' : null,
        isPinned: pinnedSet.has(artifactId),
        annotation: annotations[artifactId] || null,
        links: {
          path: '/plan',
          growth: '/statistics'
        }
      });
    }
  }

  // 6B. Focus Breakthrough Milestones (Prompt #22)
  // Don't archive every session; only meaningful milestones where learner sets a personal best uninterrupted stretch (>= 30m and beating previous best by >= 5m)
  let runningBestUninterrupted = 25; // Baseline threshold
  sortedSessions.forEach((s, idx) => {
    const uninterruptedSec = s.longestStretchSeconds || s.longestUninterruptedSeconds || (s.durationMinutes ? s.durationMinutes * 60 : 0);
    const uninterruptedMin = Math.round(uninterruptedSec / 60);

    if (uninterruptedMin >= 30 && uninterruptedMin >= (runningBestUninterrupted + 5)) {
      const prevBest = runningBestUninterrupted;
      runningBestUninterrupted = uninterruptedMin;

      const dateVal = new Date(s.timestamp || s.startedAt || s.date || Date.now()).toISOString();
      const artifactId = `art-focus-milestone-${s.id || idx}`;

      artifacts.push({
        id: artifactId,
        type: 'focus_milestone',
        title: 'FOCUS MILESTONE',
        subheading: 'Longest Uninterrupted Session',
        domain: 'Focus Integrity',
        domainColor: 'blue',
        date: dateVal,
        displayDate: formatArchiveDate(dateVal),
        monthGroup: formatArchiveMonth(dateVal),
        longestMinutes: uninterruptedMin,
        previousBestMinutes: prevBest,
        quote: `${uninterruptedMin} minutes uninterrupted session. Previous best: ${prevBest} minutes.`,
        weight: 'highlight',
        isPinned: pinnedSet.has(artifactId),
        annotation: annotations[artifactId] || null,
        links: {
          growth: '/statistics',
          focus: '/focus'
        }
      });
    }
  });

  // 7. Cross-Domain Transfer Artifacts
  if (roadmap && roadmap.length > 0) {
    const subj = roadmap[0];
    const hasMultiplePhases = (subj.phases || []).length >= 2;
    const firstPhaseCompleted = (subj.phases || [])[0]?.tasks?.some(t => t.completed || (t.subtasks || []).some(s => s.completed));
    const secondPhaseCompleted = (subj.phases || [])[1]?.tasks?.some(t => t.completed || (t.subtasks || []).some(s => s.completed));

    if (hasMultiplePhases && firstPhaseCompleted && secondPhaseCompleted) {
      const secondPhaseTask = (subj.phases || [])[1]?.tasks?.find(t => t.completed || (t.subtasks || []).some(s => s.completed));
      const dateVal = secondPhaseTask?.completedAt || new Date().toISOString();
      const artifactId = `art-transfer-${subj.id || 'domain'}`;
      artifacts.push({
        id: artifactId,
        type: 'transfer',
        title: 'CROSS-CONCEPT TRANSFER',
        subheading: 'Connected Principles',
        domain: subj.name,
        domainColor: 'violet',
        date: dateVal,
        displayDate: formatArchiveDate(dateVal),
        monthGroup: formatArchiveMonth(dateVal),
        bridge: `${subj.phases[0]?.name || 'Fundamentals'} → ${subj.phases[1]?.name || 'Advanced'}`,
        quote: secondPhaseTask?.notes || `Connected ${subj.phases[0]?.name || 'foundational'} concepts into ${subj.phases[1]?.name || 'applied'} challenges.`,
        weight: 'medium',
        isPinned: pinnedSet.has(artifactId),
        annotation: annotations[artifactId] || null,
        links: {
          world: '/roadmap'
        }
      });
    }
  }

  // If no genuine artifacts exist, return explicit empty array (no fabricated fallbacks!)
  if (artifacts.length === 0) {
    return [];
  }

  // Sort artifacts chronologically (newest first for living museum stream)
  artifacts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return artifacts;
}

/**
 * Filter and search archive artifacts
 */
export function filterArchiveArtifacts(artifacts = [], { filter = 'all', searchQuery = '', domainFilter = 'all' }) {
  return (artifacts || []).filter(item => {
    // 1. Filter by category
    if (filter === 'pinned' && !item.isPinned) return false;
    if (filter === 'projects' && item.type !== 'project') return false;
    if (filter === 'evidence' && item.type !== 'evidence') return false;
    if (filter === 'concepts' && item.type !== 'concept') return false;
    if (filter === 'reflections' && item.type !== 'reflection') return false;
    if (filter === 'recovery' && item.type !== 'recovery') return false;
    if (filter === 'milestones' && !item.isFirst && item.type !== 'transfer' && item.type !== 'focus_milestone') return false;

    // 2. Filter by domain
    if (domainFilter !== 'all' && item.domain !== domainFilter) return false;

    // 3. Search query
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchConcept = (item.conceptName || '').toLowerCase().includes(q);
      const matchQuote = (item.quote || '').toLowerCase().includes(q);
      const matchDomain = (item.domain || '').toLowerCase().includes(q);
      const matchAnnotation = (item.annotation || '').toLowerCase().includes(q);
      const matchCapabilities = (item.capabilities || []).some(c => c.toLowerCase().includes(q));

      if (!matchTitle && !matchConcept && !matchQuote && !matchDomain && !matchAnnotation && !matchCapabilities) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Summarize archive contents for the top identity banner
 */
export function calculateArchiveSummary(artifacts = []) {
  const totalCount = artifacts.length;
  const projectCount = artifacts.filter(a => a.type === 'project').length;
  const evidenceCount = artifacts.filter(a => a.type === 'evidence').length;
  const pinnedCount = artifacts.filter(a => a.isPinned).length;

  const currentYear = new Date().getFullYear();

  return {
    totalCount,
    projectCount,
    evidenceCount,
    pinnedCount,
    currentYear
  };
}
