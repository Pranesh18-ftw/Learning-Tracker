const roadmapScheduler = {
  generateTodayTasks: (roadmap, dailyLearningHours, completedSubtasks) => {
    if (!roadmap || !roadmap.subjects || roadmap.subjects.length === 0) {
      return [];
    }

    // Calculate how many subtasks fit in today's time
    const dailyMinutes = dailyLearningHours * 60;
    const tasksPerDay = Math.floor(dailyMinutes / 30); // Each subtask = 30 minutes

    // Collect all incomplete subtasks
    const allSubtasks = [];
    roadmap.subjects.forEach(subject => {
      subject.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          if (!task.completed) {
            // Add main task as subtask if no subtasks exist
            if (!task.subtasks || task.subtasks.length === 0) {
              allSubtasks.push({
                id: `${subject.id}-${phase.id}-${task.id}`,
                subjectId: subject.id,
                subjectName: subject.name,
                phaseId: phase.id,
                phaseName: phase.name,
                taskId: task.id,
                taskName: task.name,
                taskDescription: task.description,
                estimatedTime: task.estimatedTime || 30,
                difficulty: task.difficulty || 'medium',
                deadline: task.deadline,
                completed: false,
                isMainTask: true
              });
            } else {
              // Add individual subtasks
              task.subtasks.forEach(subtask => {
                if (!subtask.completed) {
                  allSubtasks.push({
                    id: `${subject.id}-${phase.id}-${task.id}-${subtask.id}`,
                    subjectId: subject.id,
                    subjectName: subject.name,
                    phaseId: phase.id,
                    phaseName: phase.name,
                    taskId: task.id,
                    taskName: task.name,
                    taskDescription: task.description,
                    subtaskId: subtask.id,
                    subtaskName: subtask.name,
                    subtaskDescription: subtask.description,
                    estimatedTime: subtask.estimatedTime || 30,
                    difficulty: subtask.difficulty || 'medium',
                    completed: false,
                    isMainTask: false
                  });
                }
              });
            }
          }
        });
      });
    });

    // Filter out completed subtasks
    const incompleteSubtasks = allSubtasks.filter(subtask => {
      const completedKey = `${subtask.subjectId}-${subtask.phaseId}-${subtask.taskId}${subtask.subtaskId ? `-${subtask.subtaskId}` : ''}`;
      return !completedSubtasks.includes(completedKey);
    });

    // Sort by priority (deadline first, then difficulty)
    incompleteSubtasks.sort((a, b) => {
      // Prioritize tasks with deadlines
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      
      // Then by difficulty (harder tasks first)
      const difficultyOrder = { 'hard': 3, 'medium': 2, 'easy': 1 };
      const aDifficulty = difficultyOrder[a.difficulty] || 2;
      const bDifficulty = difficultyOrder[b.difficulty] || 2;
      
      return bDifficulty - aDifficulty;
    });

    // Return tasks for today (limited by time)
    const todayTasks = [];
    let remainingMinutes = dailyMinutes;

    for (const subtask of incompleteSubtasks) {
      const taskTime = subtask.estimatedTime || 30;
      
      if (remainingMinutes >= taskTime) {
        todayTasks.push(subtask);
        remainingMinutes -= taskTime;
      } else {
        break; // Not enough time for this subtask
      }
    }

    return todayTasks;
  },

  generateSchedule: (roadmap, dailyLearningHours, completedSubtasks, days = 30) => {
    if (!roadmap || !roadmap.subjects || roadmap.subjects.length === 0) {
      return {};
    }

    const schedule = {};
    const today = new Date();
    const completedSet = new Set(completedSubtasks);

    // Collect all incomplete subtasks
    const allSubtasks = [];
    roadmap.subjects.forEach(subject => {
      subject.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          if (!task.completed) {
            if (!task.subtasks || task.subtasks.length === 0) {
              allSubtasks.push({
                id: `${subject.id}-${phase.id}-${task.id}`,
                subjectId: subject.id,
                subjectName: subject.name,
                phaseId: phase.id,
                phaseName: phase.name,
                taskId: task.id,
                taskName: task.name,
                estimatedTime: task.estimatedTime || 30,
                difficulty: task.difficulty || 'medium',
                deadline: task.deadline,
                completed: false
              });
            } else {
              task.subtasks.forEach(subtask => {
                if (!subtask.completed) {
                  allSubtasks.push({
                    id: `${subject.id}-${phase.id}-${task.id}-${subtask.id}`,
                    subjectId: subject.id,
                    subjectName: subject.name,
                    phaseId: phase.id,
                    phaseName: phase.name,
                    taskId: task.id,
                    taskName: task.name,
                    subtaskId: subtask.id,
                    subtaskName: subtask.name,
                    estimatedTime: subtask.estimatedTime || 30,
                    difficulty: subtask.difficulty || 'medium',
                    deadline: task.deadline,
                    completed: false
                  });
                }
              });
            }
          }
        });
      });
    });

    // Sort by priority
    allSubtasks.sort((a, b) => {
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      
      const difficultyOrder = { 'hard': 3, 'medium': 2, 'easy': 1 };
      const aDifficulty = difficultyOrder[a.difficulty] || 2;
      const bDifficulty = difficultyOrder[b.difficulty] || 2;
      
      return bDifficulty - aDifficulty;
    });

    // Generate schedule for specified days
    let taskIndex = 0;
    const dailyMinutes = dailyLearningHours * 60;

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toDateString();
      
      let remainingMinutes = dailyMinutes;
      const dayTasks = [];
      
      while (taskIndex < allSubtasks.length && remainingMinutes > 0) {
        const subtask = allSubtasks[taskIndex];
        const taskTime = subtask.estimatedTime || 30;
        
        if (remainingMinutes >= taskTime) {
          dayTasks.push(subtask);
          remainingMinutes -= taskTime;
          taskIndex++;
        } else {
          break; // Not enough time for this subtask
        }
      }
      
      if (dayTasks.length > 0) {
        schedule[dateStr] = dayTasks;
      }
    }
    
    return schedule;
  },

  getScheduledTasksForDate: (schedule, date) => {
    if (!schedule || !date) return [];
    
    const dateStr = new Date(date).toDateString();
    return schedule[dateStr] || [];
  }
};

module.exports = roadmapScheduler;
