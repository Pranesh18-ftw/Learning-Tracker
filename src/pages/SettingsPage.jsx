/**
 * SettingsPage.jsx
 *
 * LEARNING TRACKER — IDENTITY & REALITY CONTROL ROOM
 *
 * "Who am I trying to become, what do I currently have, and what constraints am I actually living with?"
 *
 * Sections:
 * 1. Control Room Header & Operating Context
 * 2. Reality Check Summary (Qualitative & Factual)
 * 3. Destination ("What are you building toward?")
 * 4. Resource Inventory ("What do you have? Hardware, Software, Access, Internet")
 * 5. Time Reality ("What time do you realistically have?")
 * 6. Limits & Starting Preferences ("What usually limits you? What helps you start?")
 * 7. System Knowledge Transparency ("Declared vs Observed vs Inferred", with User Override)
 * 8. Connected Devices & Data Sovereignty (Laptop, Phone Companion, Privacy, Export)
 * 9. System Controls (Theme, Timer calibration, Danger zone, Feedback)
 */

import React, { useState, useMemo, useRef } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import {
  loadIdentity,
  saveIdentity,
  DEFAULT_IDENTITY,
  getRealitySummary,
  resolveSystemKnowledge,
  syncIdentityToSettings
} from '../utils/identityRealityResolver';
import { getLocalDateKey } from '../utils/dateUtils';

import IdentityControlRoomHeader from '../components/IdentityControlRoomHeader';
import IdentityRealityCheckSummary from '../components/IdentityRealityCheckSummary';
import IdentityDestinationCard from '../components/IdentityDestinationCard';
import IdentityResourceInventory from '../components/IdentityResourceInventory';
import IdentityTimeReality from '../components/IdentityTimeReality';
import IdentityPreferencesAndLimits from '../components/IdentityPreferencesAndLimits';
import IdentitySystemKnowledgeCard from '../components/IdentitySystemKnowledgeCard';
import IdentityDevicesAndPrivacy from '../components/IdentityDevicesAndPrivacy';
import IdentitySystemSettings from '../components/IdentitySystemSettings';

const SettingsPage = () => {
  const {
    settings,
    updateSettings,
    resetProgress,
    resetDailyProgress,
    resetEverything,
    isDarkMode,
    toggleTheme,
    sessions = [],
    subjects = [],
    roadmap = []
  } = useRoadmap();

  // State: Identity Profile
  const [identity, setIdentity] = useState(() => loadIdentity());
  const [activeSection, setActiveSection] = useState('destination');

  // Section anchor references for smooth jumping
  const destinationRef = useRef(null);
  const resourcesRef = useRef(null);
  const timeRef = useRef(null);
  const limitsRef = useRef(null);
  const knowledgeRef = useRef(null);
  const systemRef = useRef(null);

  // Sync identity changes to storage
  const handleUpdateIdentity = (newIdentity) => {
    setIdentity(newIdentity);
    saveIdentity(newIdentity);

    // Sync weekday minutes to settings.dailyLearningHours if needed
    syncIdentityToSettings(newIdentity, settings, updateSettings);
  };

  // Specific section updates
  const handleUpdateDestination = (newDest) => {
    handleUpdateIdentity({
      ...identity,
      destination: newDest
    });
  };

  const handleUpdateResources = (newResources) => {
    handleUpdateIdentity({
      ...identity,
      resources: newResources
    });
  };

  const handleUpdateTimeReality = (newTime) => {
    handleUpdateIdentity({
      ...identity,
      timeReality: newTime
    });
  };

  const handleUpdateConstraints = (newConstraints) => {
    handleUpdateIdentity({
      ...identity,
      constraints: newConstraints
    });
  };

  const handleUpdateWorkEnvironment = (newEnv) => {
    handleUpdateIdentity({
      ...identity,
      workEnvironment: newEnv
    });
  };

  const handleUpdatePreferences = (newPrefs) => {
    handleUpdateIdentity({
      ...identity,
      preferences: newPrefs
    });
  };

  // User Knowledge Override ("That's not right")
  const handleOverrideKnowledge = (knowledgeId, overrideText) => {
    const updatedOverrides = {
      ...(identity.overrides || {}),
      [knowledgeId]: overrideText
    };
    handleUpdateIdentity({
      ...identity,
      overrides: updatedOverrides
    });
  };

  const handleResetOverride = (knowledgeId) => {
    const updatedOverrides = { ...(identity.overrides || {}) };
    delete updatedOverrides[knowledgeId];
    handleUpdateIdentity({
      ...identity,
      overrides: updatedOverrides
    });
  };

  // Reset entire identity profile to default
  const handleResetIdentityProfile = () => {
    setIdentity({ ...DEFAULT_IDENTITY });
    saveIdentity(DEFAULT_IDENTITY);
  };

  // Export full learning portfolio JSON
  const handleExportData = () => {
    const exportBundle = {
      exportedAt: new Date().toISOString(),
      identity,
      settings,
      sessionsCount: (sessions || []).length,
      roadmapProgress: (subjects || []).map(s => ({
        id: s.id,
        name: s.name,
        phasesCount: (s.phases || []).length
      })),
      appVersion: '2.0.0-tactile'
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `learning-tracker-identity-${getLocalDateKey()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Jump to section when header pill is clicked
  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    const map = {
      destination: destinationRef,
      resources: resourcesRef,
      time: timeRef,
      limits: limitsRef,
      knowledge: knowledgeRef,
      system: systemRef
    };
    const targetRef = map[sectionId];
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Reality summary calculations
  const realitySummary = useMemo(() => {
    return getRealitySummary(identity);
  }, [identity]);

  // System knowledge model (Declared vs Observed vs Inferred)
  const knowledgeItems = useMemo(() => {
    const currentRoadmap = (subjects && subjects.length > 0) ? subjects : roadmap;
    return resolveSystemKnowledge(identity, sessions, currentRoadmap);
  }, [identity, sessions, subjects, roadmap]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 anim-fade-in">

      {/* ── 1. CONTROL ROOM IDENTITY HEADER ── */}
      <IdentityControlRoomHeader
        identity={identity}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
      />

      {/* ── 2. REALITY CHECK SUMMARY ── */}
      <IdentityRealityCheckSummary
        realitySummary={realitySummary}
      />

      {/* ── 3. DESTINATION SECTION ── */}
      <div ref={destinationRef}>
        <IdentityDestinationCard
          destination={identity.destination}
          onUpdateDestination={handleUpdateDestination}
        />
      </div>

      {/* ── 4. WHAT I HAVE (RESOURCE INVENTORY) ── */}
      <div ref={resourcesRef}>
        <IdentityResourceInventory
          resources={identity.resources}
          onUpdateResources={handleUpdateResources}
        />
      </div>

      {/* ── 5. TIME REALITY ── */}
      <div ref={timeRef}>
        <IdentityTimeReality
          timeReality={identity.timeReality}
          onUpdateTimeReality={handleUpdateTimeReality}
        />
      </div>

      {/* ── 6. LIMITS & STARTING PREFERENCES ── */}
      <div ref={limitsRef}>
        <IdentityPreferencesAndLimits
          constraints={identity.constraints}
          workEnvironment={identity.workEnvironment}
          preferences={identity.preferences}
          onUpdateConstraints={handleUpdateConstraints}
          onUpdateWorkEnvironment={handleUpdateWorkEnvironment}
          onUpdatePreferences={handleUpdatePreferences}
        />
      </div>

      {/* ── 7. WHAT LEARNING TRACKER CURRENTLY KNOWS ── */}
      <div ref={knowledgeRef}>
        <IdentitySystemKnowledgeCard
          knowledgeItems={knowledgeItems}
          onOverrideKnowledge={handleOverrideKnowledge}
          onResetOverride={handleResetOverride}
        />
      </div>

      {/* ── 8. CONNECTED DEVICES & DATA PRIVACY ── */}
      <IdentityDevicesAndPrivacy
        connectedDevices={identity.connectedDevices}
        onExportData={handleExportData}
        onResetIdentity={handleResetIdentityProfile}
      />

      {/* ── 9. SYSTEM CONTROLS & DANGER ZONE ── */}
      <div ref={systemRef}>
        <IdentitySystemSettings
          settings={settings}
          updateSettings={updateSettings}
          resetProgress={resetProgress}
          resetDailyProgress={resetDailyProgress}
          resetEverything={resetEverything}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
      </div>

    </div>
  );
};

export default SettingsPage;
