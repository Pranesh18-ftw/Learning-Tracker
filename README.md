# Learning Tracker Dashboard

A modern React dashboard for tracking learning progress with roadmap phases, Pomodoro timer, and achievement system.

## 🌟 Features

- 📊 **Dashboard**: Overview of learning progress and statistics
- 🗺️ **Roadmap**: Manage subjects, phases, and tasks with progress tracking
- ⏰ **Pomodoro Timer**: Focus sessions with customizable work/break durations
- 📚 **Learning Plan**: Schedule and track daily learning tasks
- 📈 **Statistics**: Detailed analytics of study time and progress
- � **Achievements**: Gamification system with unlockable badges
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 💬 **Feedback System**: Collect user feedback for improvements

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router DOM
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Storage**: LocalStorage (client-side data persistence)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Deploy to Netlify
npm run deploy
```

## 📁 Project Structure

```
src/
├── components/
│   ├── DashboardTasks.jsx      # Main dashboard functionality
│   ├── PomodoroTimer.jsx       # Timer component
│   ├── TaskTree.jsx            # Roadmap task tree
│   ├── TaskCompletionModal.jsx # Task completion interface
│   └── ...
├── pages/
│   ├── DashboardPage.jsx       # Dashboard page
│   ├── RoadmapPage.jsx         # Roadmap management
│   ├── LearningPlanPage.jsx    # Learning plan scheduler
│   ├── StatisticsPage.jsx      # Analytics and stats
│   ├── AchievementsPage.jsx    # Achievement system
│   └── SettingsPage.jsx        # Settings and feedback
├── context/
│   └── RoadmapContext.jsx      # Global state management
└── onboarding/
    └── Onboarding.jsx           # Tutorial system
```

## 🔧 Configuration

### Environment Variables
No environment variables required - all data is stored locally in the browser.

### Build Configuration
- Build tool: Create React App
- Target: Modern browsers (ES6+)
- Bundle size: ~78KB (gzipped)

## 🌐 Deployment

### Netlify Deployment (Recommended)

1. **Automatic Deployment**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy to Netlify
   npm run deploy
   ```

2. **Manual Deployment**
   - Connect GitHub repository to Netlify
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 18

3. **Configuration Files**
   - `netlify.toml` - Build settings and redirects
   - `.gitignore` - Excludes backend files
   - `package.json` - Frontend dependencies only

## 📱 Features Overview

### Dashboard
- Real-time progress statistics
- Today's task display with timer
- Subject filtering
- Task completion and postpone options

### Roadmap Management
- Create/edit subjects and phases
- Add tasks and subtasks
- Set deadlines
- Visual progress tracking

### Learning Plan
- Auto-assign tasks for subjects
- Schedule tasks by date
- Track daily learning goals
- Undo functionality

### Statistics & Analytics
- Total study time tracking
- Weekly progress visualization
- Learning streak calculation
- Focus session history

### Achievements System
- Multiple achievement categories
- Progress tracking for each badge
- Unlock notifications
- Visual feedback system

## 🔒 Data Privacy

- All data stored locally in browser
- No server-side data collection
- No third-party analytics by default
- Feedback system stores locally (optional email)

## 🎯 Usage Tips

1. **Getting Started**
   - Add subjects and phases in Roadmap
   - Create tasks with subtasks
   - Use Learning Plan to schedule daily tasks

2. **Effective Learning**
   - Use Pomodoro timer for focus sessions
   - Track progress in Statistics
   - Unlock achievements for motivation

3. **Data Management**
   - All data persists in localStorage
   - Export/import roadmap data
   - Reset progress if needed

## 🐛 Troubleshooting

### Common Issues

1. **Data Not Saving**
   - Check browser localStorage permissions
   - Ensure browser isn't in private/incognito mode

2. **Timer Not Working**
   - Allow browser notifications
   - Check browser audio permissions

3. **Build Errors**
   - Run `npm install` to update dependencies
   - Clear node_modules and reinstall if needed

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and test
4. Submit pull request

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Links

- **Live Demo**: [https://learning-tracker.netlify.app](https://learning-tracker.netlify.app)
- **GitHub Repository**: [Your GitHub Repo]
- **Netlify Dashboard**: [Your Netlify Site]

---

**Built with ❤️ for learners who want to track their progress effectively.**
