import React, { createContext, useState, useContext, useEffect } from 'react';

export const RoadmapContext = createContext()

export const RoadmapProvider = ({ children }) => {
  // Utility function to check localStorage quota and clean up if needed
  const checkLocalStorageQuota = () => {
    try {
      const testKey = 'test_storage_quota';
      const testData = 'x'.repeat(1024 * 1024); // 1MB test data
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true; // Plenty of space available
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up old data...');
        // Clean up old sessions or other non-critical data
        try {
          const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const recentSessions = sessions.filter(session => 
            new Date(session.date) > thirtyDaysAgo
          );
          localStorage.setItem('sessions', JSON.stringify(recentSessions));
          return true;
        } catch (cleanupError) {
          console.error('Failed to cleanup localStorage:', cleanupError);
          return false;
        }
      }
      return false;
    }
  };

  // Safe localStorage setter with quota handling
  const safeLocalStorageSet = (key, value) => {
    if (!checkLocalStorageQuota()) {
      console.error('Cannot save to localStorage - quota exceeded and cleanup failed');
      return false;
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
      return false;
    }
  };

  // Roadmap data with localStorage persistence
  const [roadmap, setRoadmap] = useState(() => {
    try {
      const savedRoadmap = localStorage.getItem("roadmap");
      return savedRoadmap ? JSON.parse(savedRoadmap) : [];
    } catch (error) {
      console.error('Error loading roadmap from localStorage:', error);
      return [];
    }
  })
  
  // Add subjects getter for compatibility
  const subjects = roadmap

  // Save roadmap to localStorage when it changes
  useEffect(() => {
    safeLocalStorageSet("roadmap", JSON.stringify(roadmap));
  }, [roadmap]);

  // Last action state for undo functionality
  const [lastAction, setLastAction] = useState(null);

  // Task completion tracking for accurate time
  const [taskCompletions, setTaskCompletions] = useState(() => {
    try {
      const saved = localStorage.getItem('taskCompletions');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading task completions from localStorage:', error);
      return {};
    }
  });

  // Save task completions to localStorage
  useEffect(() => {
    safeLocalStorageSet('taskCompletions', JSON.stringify(taskCompletions));
  }, [taskCompletions]);

  // Record task completion with actual time
  const recordTaskCompletion = (taskId, actualDurationMinutes) => {
    setTaskCompletions(prev => ({
      ...prev,
      [taskId]: {
        duration: actualDurationMinutes,
        completedAt: new Date().toISOString()
      }
    }));
  };

  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark';
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      return false;
    }
  });

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    safeLocalStorageSet('theme', theme);
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      const { key, newValue } = e;
      
      try {
        if (key === 'roadmap' && newValue) {
          const newRoadmap = JSON.parse(newValue);
          setRoadmap(newRoadmap);
        } else if (key === 'learningPlan' && newValue) {
          const newLearningPlan = JSON.parse(newValue);
          setLearningPlan(newLearningPlan);
        } else if (key === 'sessions' && newValue) {
          const newSessions = JSON.parse(newValue);
          setSessions(newSessions);
        } else if (key === 'taskCompletions' && newValue) {
          const newTaskCompletions = JSON.parse(newValue);
          setTaskCompletions(newTaskCompletions);
        } else if (key === 'notes' && newValue) {
          const newNotes = JSON.parse(newValue);
          setNotes(newNotes);
        } else if (key === 'theme' && newValue) {
          setIsDarkMode(newValue === 'dark');
        }
      } catch (error) {
        console.error('Error syncing from storage event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Theme toggle function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(() => {
    // Show tutorial if no roadmap data exists and user hasn't completed tutorial
    const hasRoadmapData = subjects && subjects.length > 0;
    const tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
    return !hasRoadmapData && !tutorialCompleted;
  })
  const [tutorialStep, setTutorialStep] = useState(0)
  const [hasImportedRoadmap, setHasImportedRoadmap] = useState(() => {
    return subjects && subjects.length > 0;
  })

  // Selected subject state
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  // Settings state
  const [settings, setSettings] = useState({
    dailyLearningHours: 2,
    dailyGoalHours: 2,
    pomodoroWorkDuration: 25,
    pomodoroBreakDuration: 5
  })

  // Sessions data with localStorage persistence
  const [sessions, setSessions] = useState(() => {
    try {
      const savedSessions = localStorage.getItem("sessions");
      return savedSessions ? JSON.parse(savedSessions) : [];
    } catch (error) {
      console.error('Error loading sessions from localStorage:', error);
      return [];
    }
  })

  // Learning plan data with localStorage persistence
  const [learningPlan, setLearningPlan] = useState(() => {
    try {
      const savedPlan = localStorage.getItem("learningPlan");
      return savedPlan ? JSON.parse(savedPlan) : [];
    } catch (error) {
      console.error('Error loading learning plan from localStorage:', error);
      return [];
    }
  })

  // Notes data with localStorage persistence
  const [notes, setNotes] = useState(() => {
    try {
      const savedNotes = localStorage.getItem("notes");
      return savedNotes ? JSON.parse(savedNotes) : [];
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
      return [];
    }
  })

  // Remove duplicate useEffect - roadmap is already saved above
  
  useEffect(() => {
    safeLocalStorageSet("sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    safeLocalStorageSet("learningPlan", JSON.stringify(learningPlan));
  }, [learningPlan]);

  useEffect(() => {
    safeLocalStorageSet("notes", JSON.stringify(notes));
  }, [notes]);

  // Next task engine
  const getNextTask = (subjectId = null) => {
    const targetSubjects = subjectId 
      ? subjects.filter(s => s.id === subjectId)
      : subjects;
    
    for (const subject of targetSubjects) {
      for (const phase of subject.phases || []) {
        for (const task of phase.tasks || []) {
          for (const subtask of task.subtasks || []) {
            if (!subtask.completed) {
              return {
                subject: subject.name,
                subjectId: subject.id,
                phase: phase.name,
                phaseId: phase.id,
                task: task.name,
                taskId: task.id,
                subtask: subtask.name,
                subtaskId: subtask.id,
                name: subtask.name
              };
            }
          }
        }
      }
    }
    return null;
  };

  // Get next subtask function
  const getNextSubtask = () => {
    for (const subject of subjects) {
      for (const phase of subject.phases || []) {
        for (const task of phase.tasks || []) {
          for (const subtask of task.subtasks || []) {
            if (!subtask.completed) {
              return {
                id: subtask.id,
                name: subtask.name,
                subjectId: subject.id,
                subjectName: subject.name,
                phaseId: phase.id,
                phaseName: phase.name,
                taskId: task.id,
                taskName: task.name
              };
            }
          }
        }
      }
    }
    return null;
  };

  // Get next subtask for specific subject
  const getNextSubtaskForSubject = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return null;
    
    for (const phase of subject.phases || []) {
      for (const task of phase.tasks || []) {
        for (const subtask of task.subtasks || []) {
          if (!subtask.completed) {
            return {
              id: subtask.id,
              name: subtask.name,
              subjectId: subject.id,
              subjectName: subject.name,
              phaseId: phase.id,
              phaseName: phase.name,
              taskId: task.id,
              taskName: task.name
            };
          }
        }
      }
    }
    return null;
  };

  // Session tracking
  const addFocusSession = (sessionData) => {
    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...sessionData
    };
    setSessions(prev => [...prev, newSession]);
  }

  // Notes management
  const addNote = (noteData) => {
    const newNote = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...noteData
    };
    setNotes(prev => [...prev, newNote]);
  }

  const deleteNote = (noteId) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }

  // Learning streak calculation
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDates = sessions
      .map(s => new Date(s.date))
      .map(date => {
        date.setHours(0, 0, 0, 0);
        return date;
      })
      .filter((date, index, self) => self.findIndex(d => d.getTime() === date.getTime()) === index)
      .sort((a, b) => b - a);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (const sessionDate of sessionDates) {
      if (sessionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (sessionDate.getTime() === currentDate.getTime() + 86400000) {
        // Allow for one day grace
        streak++;
        currentDate.setDate(currentDate.getDate() - 2);
      } else {
        break;
      }
    }
    
    return streak;
  }

  // Total learning time
  const getTotalLearningTime = () => {
    return sessions.reduce((total, session) => total + (session.durationMinutes || session.duration || 0), 0);
  }

  // Tutorial functions
  const completeTutorial = () => {
    setShowTutorial(false)
    setTutorialStep(0)
    localStorage.setItem('tutorialCompleted', 'true')
  }

  const skipTutorial = () => {
    if (hasImportedRoadmap) {
      completeTutorial();
    }
  }

  const validateRoadmapImport = (importedData) => {
    if (!importedData) {
      return { valid: false, error: 'No data provided. Please enter JSON or JavaScript object.' };
    }
    
    // Try to parse if it's a string
    let parsedData;
    try {
      parsedData = typeof importedData === 'string' ? JSON.parse(importedData) : importedData;
    } catch (parseError) {
      return { valid: false, error: `Invalid JSON format: ${parseError.message}\n\nPlease check:\n- Quoted strings\n- No trailing commas\n- Matched brackets\n- Proper comma separation` };
    }
    
    if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
      return { valid: false, error: 'Missing "subjects" array. Your data should have:\n{\n  "subjects": [...]\n}' };
    }
    
    if (parsedData.subjects.length === 0) {
      return { valid: false, error: 'At least one subject is required. Add subjects to your data.' };
    }
    
    // More flexible validation - check basic structure
    const hasValidStructure = parsedData.subjects.every(subject => {
      if (!subject.name || typeof subject.name !== 'string') {
        return false;
      }
      
      if (!subject.phases || !Array.isArray(subject.phases)) {
        return false;
      }
      
      return subject.phases.every(phase => {
        if (!phase.name || typeof phase.name !== 'string') {
          return false;
        }
        
        if (!phase.tasks || !Array.isArray(phase.tasks)) {
          return false;
        }
        
        return phase.tasks.every(task => {
          if (!task.name || typeof task.name !== 'string') {
            return false;
          }
          
          // Subtasks are optional and can be in various formats
          const subtasks = task.subtasks || [];
          return Array.isArray(subtasks) && subtasks.length >= 0;
        });
      });
    });
    
    if (!hasValidStructure) {
      return { valid: false, error: 'Invalid structure. Each subject needs:\n- "name" (string)\n- "phases" (array)\n- Each phase needs:\n  * "name" (string)\n  * "tasks" (array)\n  * Each task needs "name" (string)\n  * Optional "subtasks" (array)' };
    }
    
    return { valid: true, error: null };
  };

  const setTutorialStepNumber = (step) => {
    setTutorialStep(step)
  }

  // Core roadmap functions
  const toggleSubtask = (subjectId, phaseId, taskId, subtaskId) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject
        
        return {
          ...subject,
          phases: subject.phases.map(phase => {
            if (phase.id !== phaseId) return phase
            
            return {
              ...phase,
              tasks: phase.tasks.map(task => {
                if (task.id !== taskId) return task
                
                return {
                  ...task,
                  subtasks: task.subtasks.map(subtask => {
                    if (subtask.id !== subtaskId) return subtask
                    
                    return {
                      ...subtask,
                      completed: !subtask.completed
                    }
                  })
                }
              })
            }
          })
        }
      })
    )
  }

  const toggleSubtaskComplete = (subjectId, phaseId, taskId, subtaskId) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject
        
        return {
          ...subject,
          phases: subject.phases.map(phase => {
            if (phase.id !== phaseId) return phase
            
            return {
              ...phase,
              tasks: phase.tasks.map(task => {
                if (task.id !== taskId) return task
                
                return {
                  ...task,
                  subtasks: task.subtasks.map(subtask => {
                    if (subtask.id !== subtaskId) return subtask
                    return { ...subtask, completed: true }
                  })
                }
              })
            }
          })
        }
      })
    )
  }

  // Store last completed task action for undo
  const storeCompleteAction = (subtaskId, sessionId) => {
    setLastAction({
      type: "COMPLETE",
      subtaskId,
      sessionId
    });
  };

  // Store last auto assign action for undo
  const storeAutoAssignAction = (batchId) => {
    setLastAction({
      type: "AUTO_ASSIGN",
      batchId
    });
  };

  // Undo last action
  const undoLastAction = () => {
    if (!lastAction) return;

    if (lastAction.type === "COMPLETE") {
      // Revert subtask completion
      setRoadmap(prev =>
        prev.map(subject => {
          return {
            ...subject,
            phases: subject.phases.map(phase => {
              return {
                ...phase,
                tasks: phase.tasks.map(task => {
                  return {
                    ...task,
                    subtasks: task.subtasks.map(subtask => {
                      if (subtask.id === lastAction.subtaskId) {
                        return { ...subtask, completed: false };
                      }
                      return subtask;
                    })
                  }
                })
              }
            })
          }
        })
      );

      // Remove the recorded session
      setSessions(prev => prev.filter(session => session.id !== lastAction.sessionId));
    } else if (lastAction.type === "AUTO_ASSIGN") {
      // Remove all learning plan entries with same batchId
      setLearningPlan(prev => prev.filter(task => task.batchId !== lastAction.batchId));
    }

    // Clear last action
    setLastAction(null);
  };

  const toggleTaskCompletion = (subjectId, phaseId, taskId) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject
        
        return {
          ...subject,
          phases: subject.phases.map(phase => {
            if (phase.id !== phaseId) return phase
            
            return {
              ...phase,
              tasks: phase.tasks.map(task => {
                if (task.id !== taskId) return task
                
                // If task has subtasks, toggle based on subtask completion
                if (task.subtasks && task.subtasks.length > 0) {
                  const allCompleted = task.subtasks.every(st => st.completed);
                  return {
                    ...task,
                    subtasks: task.subtasks.map(subtask => ({
                      ...subtask,
                      completed: !allCompleted
                    }))
                  };
                }
                
                // If no subtasks, toggle task directly
                return { ...task, completed: !task.completed }
              })
            }
          })
        }
      })
    )
  }

  const toggleTaskComplete = toggleTaskCompletion

  const importRoadmap = (jsonData) => {
    try {
      // Parse JSON if it's a string
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      // Validate structure using our validation function
      const validation = validateRoadmapImport(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Process subjects with auto-generated IDs
      const processedData = data.subjects.map((subject, subjectIndex) => {
        const processedSubject = {
          ...subject,
          id: subject.id || `subject-${subjects.length + subjectIndex}`,
          phases: subject.phases?.map((phase, phaseIndex) => ({
            ...phase,
            id: phase.id || `phase-${subjects.length + subjectIndex}-${phaseIndex}`,
            tasks: phase.tasks?.map((task, taskIndex) => ({
              ...task,
              id: task.id || `task-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}`,
              subtasks: task.subtasks?.map((subtask, subtaskIndex) => {
                // Support both {name: "Subtask"} and "Subtask" formats
                const subtaskName = typeof subtask === 'string' ? subtask : (subtask.name || subtask);
                return {
                  id: typeof subtask === 'object' ? (subtask.id || `sub-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}-${subtaskIndex}`) : `sub-${subjects.length + subjectIndex}-${phaseIndex}-${taskIndex}-${subtaskIndex}`,
                  name: subtaskName,
                  completed: (typeof subtask === 'object' ? subtask.completed : false) || false
                };
              }) || []
            })) || []
          })) || []
        }
        return processedSubject
      });
      
      // Check for duplicates by subject name
      const existingSubjectNames = new Set(subjects.map(s => s.name.toLowerCase()));
      const newSubjects = processedData.filter(subject => !existingSubjectNames.has(subject.name.toLowerCase()));
      
      // Append new subjects instead of replacing
      setRoadmap(prev => [...prev, ...newSubjects]);
      
      // Update hasImportedRoadmap state
      setHasImportedRoadmap(true);
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  const deleteSubject = (subjectId) => {
    setRoadmap(prev => prev.filter(subject => subject.id !== subjectId))
    setLearningPlan(prev => prev.filter(task => task.subjectId !== subjectId))
  }

  const updateSubjectDeadline = (subjectId, deadline) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject
        return { ...subject, deadline }
      })
    )
  }

  const updatePhaseDeadline = (subjectId, phaseId, deadline) => {
    setRoadmap(prev =>
      prev.map(subject => {
        if (subject.id !== subjectId) return subject
        
        return {
          ...subject,
          phases: subject.phases.map(phase => {
            if (phase.id !== phaseId) return phase
            return { ...phase, deadline }
          })
        }
      })
    )
  }

  // Statistics helpers
  const getStats = () => {
    const allTasks = subjects.flatMap(s => s.phases).flatMap(p => p.tasks)
    const completedTasks = allTasks.filter(t => t.completed).length
    const allSubtasks = allTasks.flatMap(t => t.subtasks)
    const completedSubtasks = allSubtasks.filter(s => s.completed).length
    const completionRate = allSubtasks.length > 0 
      ? Math.round((completedSubtasks / allSubtasks.length) * 100) 
      : 0

    return {
      totalSubjects: subjects.length,
      totalPhases: subjects.flatMap(s => s.phases).length,
      completedPhases: subjects.flatMap(s => s.phases).filter(p => p.tasks.every(t => t.completed)).length,
      totalTasks: allTasks.length,
      completedTasks,
      totalSubtasks: allSubtasks.length,
      completedSubtasks,
      completionRate,
      totalFocusMinutes: 0,
      totalFocusHours: 0,
      totalFocusSessions: 0
    }
  }

  const getPendingTasks = () => {
    return subjects.flatMap(s => s.phases).flatMap(p => p.tasks).filter(t => !t.completed)
  }

  const getTodaysTasks = () => {
    return subjects.flatMap(s => s.phases).flatMap(p => p.tasks).filter(t => !t.completed).slice(0, 5)
  }

  // Settings helpers
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const resetProgress = () => {
    // Clear all state
    setRoadmap([])
    setLearningPlan([])
    setSessions([])
    setSettings({
      dailyLearningHours: 2,
      dailyGoalHours: 2,
      pomodoroWorkDuration: 25,
      pomodoroBreakDuration: 5
    })
    setShowTutorial(true)
    setTutorialStep(0)
    
    // Clear localStorage
    localStorage.removeItem("roadmap")
    localStorage.removeItem("learningPlan") 
    localStorage.removeItem("sessions")
    localStorage.removeItem("selectedSubjectId")
  }

  return (
    <RoadmapContext.Provider value={{
      roadmap,
      setRoadmap,
      subjects,
      learningPlan,
      setLearningPlan,
      settings,
      getNextSubtask,
      getNextSubtaskForSubject,
      
      // Session tracking
      addFocusSession,
      calculateStreak,
      getTotalLearningTime,
      
      // Notes management
      addNote,
      deleteNote,
      
      // Statistics helpers
      getStats,
      getPendingTasks,
      getTodaysTasks,
      
      // Undo functionality
      lastAction,
      storeCompleteAction,
      storeAutoAssignAction,
      undoLastAction,
      
      // Task completion tracking
      taskCompletions,
      recordTaskCompletion,
      
      // Settings helpers
      updateSettings,
      resetProgress,
      
      // Theme helpers
      toggleTheme,
      
      // Tutorial helpers
      showTutorial,
      tutorialStep,
      hasImportedRoadmap,
      completeTutorial,
      skipTutorial,
      setTutorialStepNumber,
      validateRoadmapImport,
      importRoadmap,
      
      // Subject selection
      selectedSubjectId,
      setSelectedSubjectId
    }}>
      {children}
    </RoadmapContext.Provider>
  )
}

export const useRoadmap = () => useContext(RoadmapContext)
