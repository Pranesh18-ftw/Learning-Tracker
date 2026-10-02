// Helper: count unique completed atomic items (subtaskId ?? taskId)
const uniqueTaskCount = (taskCompletions = []) => {
  const ids = new Set();
  for (const c of taskCompletions) {
    ids.add(c.subtaskId || c.taskId || c.id);
  }
  return ids.size;
};

export const ACHIEVEMENTS = [
  // Task achievements
  {
    id: 'first-task',
    name: 'First Task Completed',
    title: 'First Task Completed',
    description: 'Complete your first learning task.',
    category: 'tasks',
    icon: 'target',
    color: 'green',
    maxProgress: 1,
    getProgress: ({ taskCompletions = [] }) => Math.min(uniqueTaskCount(taskCompletions), 1),
    check: ({ taskCompletions = [] }) => uniqueTaskCount(taskCompletions) >= 1
  },
  {
    id: 'ten-tasks',
    name: 'Task Master',
    title: 'Task Master',
    description: 'Complete 10 learning tasks.',
    category: 'tasks',
    icon: 'check-circle',
    color: 'blue',
    maxProgress: 10,
    getProgress: ({ taskCompletions = [] }) => Math.min(uniqueTaskCount(taskCompletions), 10),
    check: ({ taskCompletions = [] }) => uniqueTaskCount(taskCompletions) >= 10
  },
  {
    id: 'fifty-tasks',
    name: 'Task Expert',
    title: 'Task Expert',
    description: 'Complete 50 learning tasks.',
    category: 'tasks',
    icon: 'check-circle',
    color: 'purple',
    maxProgress: 50,
    getProgress: ({ taskCompletions = [] }) => Math.min(uniqueTaskCount(taskCompletions), 50),
    check: ({ taskCompletions = [] }) => uniqueTaskCount(taskCompletions) >= 50
  },

  // Focus session achievements
  {
    id: 'first-session',
    name: 'First Focus',
    title: 'First Focus',
    description: 'Complete your first focus session.',
    category: 'focus',
    icon: 'target',
    color: 'green',
    maxProgress: 1,
    getProgress: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) > 0) ? 1 : 0,
    check: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) > 0)
  },
  {
    id: 'focused-hour',
    name: 'Focused Hour',
    title: 'Focused Hour',
    description: 'Complete a focus session of at least 60 minutes.',
    category: 'focus',
    icon: 'clock',
    color: 'blue',
    maxProgress: 1,
    getProgress: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) >= 60) ? 1 : 0,
    check: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) >= 60)
  },
  {
    id: 'two-hour-focus',
    name: 'Deep Focus',
    title: 'Deep Focus',
    description: 'Complete a 2-hour focus session.',
    category: 'focus',
    icon: 'clock',
    color: 'purple',
    maxProgress: 1,
    getProgress: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) >= 120) ? 1 : 0,
    check: ({ sessions = [] }) =>
      sessions.some(s => Number(s.durationMinutes) >= 120)
  },

  // Streak achievements
  {
    id: 'three-day-streak',
    name: 'Getting Started',
    title: 'Getting Started',
    description: 'Maintain a 3-day learning streak.',
    category: 'streak',
    icon: 'flame',
    color: 'orange',
    maxProgress: 3,
    getProgress: ({ streak = 0 }) => Math.min(streak, 3),
    check: ({ streak = 0 }) => streak >= 3
  },
  {
    id: 'seven-day-streak',
    name: 'Week Warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak.',
    category: 'streak',
    icon: 'flame',
    color: 'red',
    maxProgress: 7,
    getProgress: ({ streak = 0 }) => Math.min(streak, 7),
    check: ({ streak = 0 }) => streak >= 7
  },
  {
    id: 'thirty-day-streak',
    name: 'Monthly Master',
    title: 'Monthly Master',
    description: 'Maintain a 30-day learning streak.',
    category: 'streak',
    icon: 'flame',
    color: 'purple',
    maxProgress: 30,
    getProgress: ({ streak = 0 }) => Math.min(streak, 30),
    check: ({ streak = 0 }) => streak >= 30
  },

  // Cumulative time achievements
  {
    id: 'five-hours',
    name: 'Deep Work',
    title: 'Deep Work',
    description: 'Accumulate 5 hours of focused learning.',
    category: 'time',
    icon: 'award',
    color: 'green',
    maxProgress: 5,
    getProgress: ({ sessions = [] }) => {
      const mins = sessions.reduce(
        (total, s) => total + (Number(s.durationMinutes) || 0),
        0
      );
      return Math.min(Math.floor(mins / 60), 5);
    },
    check: ({ sessions = [] }) => {
      const minutes = sessions.reduce(
        (total, s) => total + (Number(s.durationMinutes) || 0),
        0
      );
      return minutes >= 300;
    }
  },
  {
    id: 'ten-hours',
    name: 'Dedicated Learner',
    title: 'Dedicated Learner',
    description: 'Accumulate 10 hours of focused learning.',
    category: 'time',
    icon: 'award',
    color: 'blue',
    maxProgress: 10,
    getProgress: ({ sessions = [] }) => {
      const mins = sessions.reduce(
        (total, s) => total + (Number(s.durationMinutes) || 0),
        0
      );
      return Math.min(Math.floor(mins / 60), 10);
    },
    check: ({ sessions = [] }) => {
      const minutes = sessions.reduce(
        (total, s) => total + (Number(s.durationMinutes) || 0),
        0
      );
      return minutes >= 600;
    }
  }
];

export const evaluateAchievements = ({
  sessions = [],
  taskCompletions = [],
  streak = 0,
  existingAchievements = []
}) => {
  const unlocked = new Set(existingAchievements);
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) {
      continue;
    }

    const earned = achievement.check({
      sessions,
      taskCompletions,
      streak
    });

    if (earned) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
};
