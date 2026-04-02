const roadmapState = {
  // Initial state
  initialState: {
    subjects: [],
    selectedSubjectId: null,
    settings: {
      dailyGoalHours: 4,
      pomodoroWork: 25,
      pomodoroShortBreak: 5,
      pomodoroLongBreak: 15,
      theme: 'light'
    },
    sessions: [],
    achievements: [],
    newlyUnlocked: [],
    schedule: {},
    tutorialStep: 1,
    showTutorial: false,
    tutorialCompleted: false
  },

  // localStorage keys
  keys: {
    subjects: 'learningRoadmap',
    selectedSubjectId: 'selectedSubjectId',
    settings: 'learningSettings',
    sessions: 'learningSessions',
    achievements: 'learningAchievements',
    schedule: 'learningSchedule',
    tutorialStep: 'tutorialStep',
    tutorialCompleted: 'tutorialCompleted'
  },

  // Load state from localStorage
  loadState: () => {
    const state = { ...roadmapState.initialState };

    try {
      // Load subjects
      const subjectsData = localStorage.getItem(roadmapState.keys.subjects);
      if (subjectsData) {
        state.subjects = JSON.parse(subjectsData);
      }

      // Load selected subject
      const selectedSubjectId = localStorage.getItem(roadmapState.keys.selectedSubjectId);
      if (selectedSubjectId) {
        state.selectedSubjectId = selectedSubjectId;
      }

      // Load settings
      const settingsData = localStorage.getItem(roadmapState.keys.settings);
      if (settingsData) {
        state.settings = { ...state.settings, ...JSON.parse(settingsData) };
      }

      // Load sessions
      const sessionsData = localStorage.getItem(roadmapState.keys.sessions);
      if (sessionsData) {
        state.sessions = JSON.parse(sessionsData);
      }

      // Load achievements
      const achievementsData = localStorage.getItem(roadmapState.keys.achievements);
      if (achievementsData) {
        state.achievements = JSON.parse(achievementsData);
      }

      // Load schedule
      const scheduleData = localStorage.getItem(roadmapState.keys.schedule);
      if (scheduleData) {
        state.schedule = JSON.parse(scheduleData);
      }

      // Load tutorial state
      const tutorialStep = localStorage.getItem(roadmapState.keys.tutorialStep);
      if (tutorialStep) {
        state.tutorialStep = parseInt(tutorialStep);
      }

      const tutorialCompleted = localStorage.getItem(roadmapState.keys.tutorialCompleted);
      if (tutorialCompleted) {
        state.tutorialCompleted = tutorialCompleted === 'true';
      }

      // Check if tutorial should be shown
      state.showTutorial = !state.tutorialCompleted && state.subjects.length === 0;

    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }

    return state;
  },

  // Save state to localStorage
  saveState: (key, value) => {
    try {
      localStorage.setItem(roadmapState.keys[key], JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  },

  // Clear all state
  clearState: () => {
    Object.values(roadmapState.keys).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error clearing ${key} from localStorage:`, error);
      }
    });
  },

  // Get derived state
  getDerivedState: (state) => {
    return {
      hasRoadmap: state.subjects && state.subjects.length > 0,
      selectedSubject: state.subjects.find(s => s.id === state.selectedSubjectId),
      totalPhases: state.subjects.reduce((sum, subject) => sum + (subject.phases?.length || 0), 0),
      totalTasks: state.subjects.reduce((sum, subject) => 
        sum + subject.phases?.reduce((phaseSum, phase) => phaseSum + (phase.tasks?.length || 0), 0) || 0, 0),
      completedPhases: state.subjects.reduce((sum, subject) => 
        sum + subject.phases?.filter(phase => phase.tasks?.every(task => task.completed)).length || 0, 0),
      completedTasks: state.subjects.reduce((sum, subject) => 
        sum + subject.phases?.reduce((phaseSum, phase) => 
          phaseSum + phase.tasks?.filter(task => task.completed).length || 0, 0) || 0, 0)
    };
  }
};

module.exports = roadmapState;
