import {
  buildArchiveArtifacts,
  filterArchiveArtifacts,
  calculateArchiveSummary,
  resolveDomainColor,
  formatArchiveDate,
  formatArchiveMonth
} from '../utils/archiveEvidenceResolver';

describe('Archive Living Museum & Artifact Evidence Landscape', () => {

  const sampleRoadmap = [
    {
      id: 'subj-elec',
      name: 'Electronics Engineering',
      phases: [
        {
          id: 'ph-1',
          name: 'Fundamental Circuits',
          tasks: [
            {
              id: 'tk-ohm',
              name: 'Ohm\'s Law & DC Basics',
              completed: true,
              subtasks: [
                { id: 'st-1', name: 'Voltage Measurement', completed: true },
                { id: 'st-2', name: 'Current Measurement', completed: true }
              ]
            }
          ]
        },
        {
          id: 'ph-2',
          name: 'Hardware Projects',
          tasks: [
            {
              id: 'tk-proj-temp',
              name: 'Temperature Monitor ESP32 Build',
              completed: true,
              subtasks: [
                { id: 'st-p1', name: 'Build schematic breadboard', completed: true },
                { id: 'st-p2', name: 'Test ADC noise curve', completed: true },
                { id: 'st-p3', name: 'Measure thermistor linearity', completed: true }
              ]
            }
          ]
        }
      ]
    }
  ];

  const sampleSessions = [
    {
      id: 's-ev-1',
      subjectId: 'subj-elec',
      phaseId: 'ph-1',
      taskId: 'tk-ohm',
      startedAt: '2026-10-01T10:00:00Z',
      durationMinutes: 30,
      notes: 'Derived V = IR from first principles without looking at notes.',
      explainWithoutNotes: 'yes'
    },
    {
      id: 's-gap-2',
      subjectId: 'subj-elec',
      phaseId: 'ph-2',
      taskId: 'tk-proj-temp',
      startedAt: '2026-10-08T14:00:00Z', // 7-day lapse
      durationMinutes: 45,
      notes: 'Calibrated thermistor lookup table in C code.',
      explainWithoutNotes: 'partly'
    }
  ];

  // 1. Artifact Generation & Visual Hierarchy
  test('buildArchiveArtifacts generates project artifacts with stage badges and capabilities', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: []
    });

    const projectArtifact = artifacts.find(a => a.type === 'project');
    expect(projectArtifact).toBeDefined();
    expect(projectArtifact.title).toContain('Temperature Monitor');
    expect(projectArtifact.stageBadges).toEqual(['Built', 'Tested', 'Measured']);
    expect(projectArtifact.capabilities.length).toBeGreaterThan(0);
    expect(projectArtifact.weight).toBe('hero'); // First project has hero weight
    expect(projectArtifact.isFirst).toBe(true);
    expect(projectArtifact.firstLabel).toBe('FIRST PRACTICAL BUILD');
  });

  test('buildArchiveArtifacts generates verified evidence artifacts with verbatim quotes', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: []
    });

    const evidenceArtifact = artifacts.find(a => a.type === 'evidence');
    expect(evidenceArtifact).toBeDefined();
    expect(evidenceArtifact.quote).toContain('Derived V = IR');
    expect(evidenceArtifact.subheading).toContain('Active Retrieval');
    expect(evidenceArtifact.isFirst).toBe(true);
    expect(evidenceArtifact.firstLabel).toBe('FIRST UNASSISTED RECALL');
  });

  // 2. Recovery Artifacts ("The Return")
  test('buildArchiveArtifacts generates "The Return" recovery artifact after a 7-day lapse', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: []
    });

    const recoveryArtifact = artifacts.find(a => a.type === 'recovery');
    expect(recoveryArtifact).toBeDefined();
    expect(recoveryArtifact.title).toBe('THE RETURN');
    expect(recoveryArtifact.missedDays).toBe(7);
    expect(recoveryArtifact.quote).toContain('7 days away → returned');
  });

  // 3. Concept Breakdown Checklist
  test('buildArchiveArtifacts preserves demonstrated conceptual capabilities', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: []
    });

    const conceptArtifact = artifacts.find(a => a.type === 'concept');
    expect(conceptArtifact).toBeDefined();
    expect(conceptArtifact.demonstratedPoints.length).toBeGreaterThanOrEqual(2);
    expect(conceptArtifact.demonstratedPoints[0].status).toBe('✓');
  });

  // 4. Pinning / "Keep" functionality
  test('pinnedIds are correctly mapped and surfaced in artifacts', () => {
    const pinned = ['art-proj-tk-proj-temp'];
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: [],
      pinnedIds: pinned
    });

    const project = artifacts.find(a => a.id === 'art-proj-tk-proj-temp');
    expect(project.isPinned).toBe(true);

    const evidence = artifacts.find(a => a.type === 'evidence');
    expect(evidence.isPinned).toBe(false);
  });

  // 5. Post-facto learner annotations
  test('annotations are attached to corresponding artifacts', () => {
    const annotations = {
      'art-proj-tk-proj-temp': 'Used 10k NTC thermistor with 0.1uF bypass capacitor to reduce ADC jitter.'
    };

    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: [],
      annotations
    });

    const project = artifacts.find(a => a.id === 'art-proj-tk-proj-temp');
    expect(project.annotation).toBe('Used 10k NTC thermistor with 0.1uF bypass capacitor to reduce ADC jitter.');
  });

  // 6. Filtering & Searching
  test('filterArchiveArtifacts filters cleanly by category', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: [],
      pinnedIds: ['art-proj-tk-proj-temp']
    });

    const projectsOnly = filterArchiveArtifacts(artifacts, { filter: 'projects' });
    expect(projectsOnly.every(a => a.type === 'project')).toBe(true);

    const evidenceOnly = filterArchiveArtifacts(artifacts, { filter: 'evidence' });
    expect(evidenceOnly.every(a => a.type === 'evidence')).toBe(true);

    const pinnedOnly = filterArchiveArchive(artifacts, 'pinned');
    expect(pinnedOnly.every(a => a.isPinned)).toBe(true);
  });

  function filterArchiveArchive(artifacts, filter) {
    return filterArchiveArtifacts(artifacts, { filter });
  }

  test('filterArchiveArtifacts searches across titles, quotes, and capabilities', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: []
    });

    const results = filterArchiveArtifacts(artifacts, { searchQuery: 'thermistor' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.includes('Temperature Monitor'))).toBe(true);
  });

  // 7. Summary metrics
  test('calculateArchiveSummary aggregates counts accurately', () => {
    const artifacts = buildArchiveArtifacts({
      roadmap: sampleRoadmap,
      sessions: sampleSessions,
      taskCompletions: [],
      notes: [],
      pinnedIds: ['art-proj-tk-proj-temp']
    });

    const summary = calculateArchiveSummary(artifacts);
    expect(summary.totalCount).toBe(artifacts.length);
    expect(summary.projectCount).toBe(1);
    expect(summary.evidenceCount).toBe(1);
    expect(summary.pinnedCount).toBe(1);
    expect(summary.currentYear).toBe(new Date().getFullYear());
  });

  // 8. Domain color tokens
  test('resolveDomainColor maps subjects to consistent quiet palette', () => {
    expect(resolveDomainColor('Electronics Engineering')).toBe('blue');
    expect(resolveDomainColor('Embedded Software C')).toBe('emerald');
    expect(resolveDomainColor('Quantum Physics')).toBe('violet');
    expect(resolveDomainColor('Calculus & Linear Algebra')).toBe('coral');
  });

  // 9. Date formatting
  test('formatArchiveDate and formatArchiveMonth output human-readable dates', () => {
    const formatted = formatArchiveDate('2026-10-02');
    expect(formatted).toContain('02 OCT 2026');

    const monthGroup = formatArchiveMonth('2026-10-02');
    expect(monthGroup).toBe('OCTOBER 2026');
  });

});
