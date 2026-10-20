# Learning Tracker Dashboard

A tactile, local-first learning workstation for mastering deep STEM concepts with roadmap progression, focus sessions, verified recall evidence, and identity management.

## 🌟 Features

- 📊 **Dashboard**: Active curriculum context, today's targets, and immediate next take
- 🗺️ **Knowledge World & Roadmap**: Interactive concept topology, task tree, and curated tracks
- ⏱️ **Focus Space**: Fullscreen focus session with qualitative memory retrieval and proof records
- 📚 **Learning Plan**: Weekly schedule, detour management, and path reality
- 📈 **Statistics**: Study velocity, verified time, and local streak integrity
- 🏆 **Living Museum & Proof**: Verbatim memory reflections and milestone badges
- 🎯 **Trajectory**: Placement mirror, capability clusters, and gap analysis
- ⚙️ **Identity & Reality Control Room**: Device registry, privacy-preserving telemetry summaries, and local data export
- 🌙 **Dark / Light Theme**: High-contrast tactile interface

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router DOM
- **Authentication (Optional)**: Firebase Web SDK v12 (Google Identity)
- **Styling**: Tailwind CSS, Tactile 3D design system
- **Icons**: Lucide React
- **State Management**: React Context API
- **Storage**: Browser LocalStorage with schema validation, prototype protection, and corruption quarantine

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run automated tests
npm test -- --watchAll=false

# Build for production
npm run build
```

## 🏗️ Architecture
The application is client-side and local-first.
All learning state is persisted in the user's browser `localStorage`.
Authentication via Google Identity is optional and attaches an authenticated identity without replacing local storage ownership.

## 💾 Persistence Architecture
- **Persistence**: Browser localStorage with structural validation and quarantine
- **Advantages**:
  - Full offline capability
  - Zero required backend setup
  - Instant local state
- **Limitations**:
  - Device/browser specific
  - Clearing browser data removes local state unless exported
- **Backup**: Use Settings > Export to save JSON identity and learning records.

## 📁 Project Structure

```
src/
├── components/
│   ├── FocusSpace.jsx          # Dedicated focus session and evidence capture
│   ├── TaskTree.jsx            # Canonical roadmap tree navigation
│   ├── LearningWorldLandscape.jsx # Visual concept world
│   ├── Topbar.jsx              # Navigation and auth status
│   └── ...
├── pages/
│   ├── DashboardPage.jsx       # Daily overview and next actions
│   ├── RoadmapPage.jsx         # Roadmap & concept explorer
│   ├── LearningPlanPage.jsx    # Weekly schedule & detour planning
│   ├── StatisticsPage.jsx      # Analytics and study time
│   ├── AchievementsPage.jsx    # Living Museum proof portfolio
│   ├── TrajectoryPage.jsx      # Career & capability trajectory
│   └── SettingsPage.jsx        # Identity, devices & privacy control room
├── services/
│   ├── authService.js          # Google identity via Firebase Auth
│   ├── accountIdentityService.js # Canonical user & device identity
│   ├── focusIntegrityService.js # Companion session lifecycle & summary telemetry
│   └── syncEngine.js           # Local outbox queue for future sync
├── context/
│   └── RoadmapContext.jsx      # Central application state & action provider
└── utils/
    ├── dateUtils.js            # Calendar date keys & streak calculations
    ├── storage.js              # Safe storage with quarantine & prototype protection
    ├── securityUtils.js        # URL validation, object sanitization, and path masking
    └── roadmapProgressResolver.js # Canonical progress & completion logic
```

## 🔧 Configuration

### Environment Variables
Core functionality runs completely offline without any environment variables.
For optional Google Identity authentication, copy `.env.example` to `.env.local` and fill in your Firebase Web App configuration:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

### Build Configuration
- Build tool: Create React App (react-scripts 5.0.1)
- Target: Modern browsers (ES6+)
- Single Page Application with client-side routing

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
   - Node version: 22 (configured in `netlify.toml`)

3. **Configuration Files**
   - `netlify.toml` - Build settings, Node 22 runtime, and API redirects
   - `.gitignore` - Excludes build outputs, local keys, and secrets
   - `package.json` - Frontend and serverless dependencies
   - `.env.example` - Template for web and serverless environment variables

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

- **Live Demo (GitHub Pages)**: [https://pranesh18-ftw.github.io/Learning-Tracker/](https://pranesh18-ftw.github.io/Learning-Tracker/)
- **Live Demo (Netlify)**: [https://learningtracker001.netlify.app](https://learningtracker001.netlify.app)
- **GitHub Repository**: [https://github.com/Pranesh18-ftw/Learning-Tracker](https://github.com/Pranesh18-ftw/Learning-Tracker)

---

**Built with ❤️ for learners who want to track their progress effectively.**
