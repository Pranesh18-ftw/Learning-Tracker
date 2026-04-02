const roadmapParser = {
  parse: (roadmapText) => {
    if (!roadmapText || typeof roadmapText !== 'string') {
      throw new Error('Roadmap text is required and must be a string');
    }

    const lines = roadmapText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const subjects = [];
    let currentSubject = null;
    let currentPhase = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Subject line (no indentation)
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        // Save previous subject if exists
        if (currentSubject) {
          subjects.push(currentSubject);
        }
        
        // Start new subject
        currentSubject = {
          name: trimmedLine,
          phases: []
        };
        currentPhase = null;
        continue;
      }

      // Phase line (single indentation)
      if (currentSubject && (line.startsWith('  ') || line.startsWith('\t')) && !line.startsWith('    ') && !line.startsWith('\t\t')) {
        const phaseMatch = trimmedLine.match(/^([^:]+):?\s*(.*)$/);
        if (phaseMatch) {
          const phaseName = phaseMatch[1].trim();
          const phaseDescription = phaseMatch[2].trim() || '';
          
          currentPhase = {
            name: phaseName,
            description: phaseDescription,
            tasks: []
          };
          currentSubject.phases.push(currentPhase);
        }
        continue;
      }

      // Task line (double indentation)
      if (currentSubject && currentPhase && (line.startsWith('    ') || line.startsWith('\t\t'))) {
        const taskMatch = trimmedLine.match(/^[-*]\s*(.+?)(?:\s*:\s*(.*))?$/);
        if (taskMatch) {
          const taskName = taskMatch[1].trim();
          const taskDescription = taskMatch[2] ? taskMatch[2].trim() : '';
          
          const task = {
            name: taskName,
            description: taskDescription,
            completed: false,
            subtasks: []
          };
          
          currentPhase.tasks.push(task);
        }
        continue;
      }

      // Subtask line (triple indentation)
      if (currentSubject && currentPhase && (line.startsWith('      ') || line.startsWith('\t\t\t'))) {
        const lastTask = currentPhase.tasks[currentPhase.tasks.length - 1];
        if (lastTask) {
          const subtaskMatch = trimmedLine.match(/^[-*]\s*(.+?)(?:\s*:\s*(.*))?$/);
          if (subtaskMatch) {
            const subtaskName = subtaskMatch[1].trim();
            const subtaskDescription = subtaskMatch[2] ? subtaskMatch[2].trim() : '';
            
            lastTask.subtasks.push({
              name: subtaskName,
              description: subtaskDescription,
              completed: false
            });
          }
        }
      }
    }

    // Add the last subject
    if (currentSubject) {
      subjects.push(currentSubject);
    }

    if (subjects.length === 0) {
      throw new Error('No valid subjects found in roadmap');
    }

    return {
      subjects,
      importedAt: new Date().toISOString()
    };
  },

  // Enhanced parser that supports metadata
  parseWithMetadata: (roadmapText) => {
    const basicParse = roadmapParser.parse(roadmapText);
    
    // Add metadata parsing for deadlines, time estimates, difficulty
    const subjects = basicParse.subjects.map(subject => ({
      ...subject,
      phases: subject.phases.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => ({
          ...task,
          // Extract metadata from task description if present
          estimatedTime: roadmapParser.extractTimeEstimate(task.description),
          difficulty: roadmapParser.extractDifficulty(task.description),
          deadline: roadmapParser.extractDeadline(task.description),
          subtasks: task.subtasks.map(subtask => ({
            ...subtask,
            estimatedTime: roadmapParser.extractTimeEstimate(subtask.description),
            difficulty: roadmapParser.extractDifficulty(subtask.description)
          }))
        }))
      }))
    }));

    return { subjects };
  },

  extractTimeEstimate: (text) => {
    if (!text) return 30; // default 30 minutes
    
    const timeMatch = text.match(/(\d+)\s*(?:min|minutes?|hours?|h)/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      return text.toLowerCase().includes('hour') || text.toLowerCase().includes('h') ? value * 60 : value;
    }
    
    return 30;
  },

  extractDifficulty: (text) => {
    if (!text) return 'medium';
    
    const difficultyMap = {
      'easy': 'easy',
      'beginner': 'easy',
      'medium': 'medium',
      'intermediate': 'medium',
      'hard': 'hard',
      'advanced': 'hard',
      'expert': 'hard'
    };
    
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(difficultyMap)) {
      if (lowerText.includes(key)) {
        return value;
      }
    }
    
    return 'medium';
  },

  extractDeadline: (text) => {
    if (!text) return null;
    
    // Match date patterns like "due: 2024-12-31" or "deadline: Dec 31"
    const dateMatch = text.match(/(?:due|deadline)[:\s]+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2}(?:,\s*\d{4})?)/i);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    return null;
  }
};

module.exports = roadmapParser;
