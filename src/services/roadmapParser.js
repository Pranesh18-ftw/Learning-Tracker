/**
 * Local roadmap parser - parses text format into structured data
 * 
 * Format:
 * Subject: <name>
 * 
 * Phase: <name>
 * - Task
 *   - Subtask
 * 
 * Rules:
 * - "Subject:" creates a subject
 * - "Phase:" creates a phase
 * - "- " creates a task
 * - "  - " creates a subtask (2 spaces indent)
 */

/**
 * Parse roadmap text into structured format
 * @param {string} text - Raw roadmap text
 * @returns {Object} - Parsed roadmap with subjects, phases, tasks, and subtasks
 */
export const parseRoadmapText = (text) => {
  if (!text || !text.trim()) {
    return { subjects: [] };
  }

  const lines = text.split('\n');
  const result = {
    subjects: [],
  };

  let currentSubject = null;
  let currentPhase = null;
  let currentTask = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Check if this is a subtask (exactly 2 spaces followed by "- ")
    const isSubtask = line.startsWith('  -') && !line.startsWith('    -');

    // Subject line
    if (trimmedLine.startsWith('Subject:')) {
      const subjectName = trimmedLine.replace('Subject:', '').trim();
      currentSubject = {
        name: subjectName,
        phases: [],
      };
      currentPhase = null;
      currentTask = null;
      result.subjects.push(currentSubject);
      continue;
    }

    // Phase line
    if (trimmedLine.startsWith('Phase:')) {
      const phaseName = trimmedLine.replace('Phase:', '').trim();
      
      // If no subject exists, create a default one
      if (!currentSubject) {
        currentSubject = {
          name: 'General Subject',
          phases: [],
        };
        result.subjects.push(currentSubject);
      }
      
      currentPhase = {
        name: phaseName,
        tasks: [],
      };
      currentTask = null;
      currentSubject.phases.push(currentPhase);
      continue;
    }

    // Task line (starts with "- ")
    if (trimmedLine.startsWith('-')) {
      // If no phase exists yet, create a default one
      if (!currentPhase) {
        if (!currentSubject) {
          currentSubject = {
            name: 'General Subject',
            phases: [],
          };
          result.subjects.push(currentSubject);
        }
        
        // Check if a "General" phase already exists
        const existingGeneralPhase = currentSubject.phases.find(p => p.name === 'General');
        if (existingGeneralPhase) {
          currentPhase = existingGeneralPhase;
        } else {
          currentPhase = {
            name: 'General',
            tasks: [],
          };
          currentSubject.phases.push(currentPhase);
        }
      }

      const taskName = trimmedLine.substring(1).trim();

      if (isSubtask && currentTask) {
        // This is a subtask - add to current task's subtasks array
        currentTask.subtasks.push(taskName);
      } else {
        // This is a main task
        currentTask = {
          name: taskName,
          subtasks: [],
        };
        currentPhase.tasks.push(currentTask);
      }
      continue;
    }
  }

  return result;
};

/**
 * Validate roadmap text format
 * @param {string} text - Text to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateRoadmapText = (text) => {
  const errors = [];
  
  if (!text || !text.trim()) {
    errors.push('Text is empty');
    return { isValid: false, errors };
  }

  const lines = text.split('\n');
  let hasSubject = false;
  let hasPhase = false;
  let hasTask = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Subject:')) hasSubject = true;
    if (trimmed.startsWith('Phase:')) hasPhase = true;
    if (trimmed.startsWith('-')) hasTask = true;
  }

  if (!hasSubject) {
    errors.push('No Subject found. Start a line with "Subject: "');
  }
  if (!hasPhase) {
    errors.push('No Phase found. Start a line with "Phase: "');
  }
  if (!hasTask) {
    errors.push('No Tasks found. Start lines with "- "');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Convert parsed roadmap back to text format
 * @param {Object} roadmap - Parsed roadmap object
 * @returns {string} - Text representation
 */
export const roadmapToText = (roadmap) => {
  if (!roadmap || !roadmap.subjects || roadmap.subjects.length === 0) {
    return '';
  }

  let text = '';

  roadmap.subjects.forEach((subject, sIdx) => {
    if (sIdx > 0) text += '\n';
    text += `Subject: ${subject.name}\n`;
    
    subject.phases.forEach((phase) => {
      text += `\nPhase: ${phase.name}\n`;
      
      phase.tasks.forEach((task) => {
        text += `- ${task.name}\n`;
        
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            text += `  - ${subtask}\n`;
          });
        }
      });
    });
  });

  return text.trim();
};

/**
 * Sample roadmap text for testing
 */
export const sampleRoadmapText = `Subject: Machine Learning

Phase: Foundations
- Introduction to ML
  - What is machine learning
  - Types of ML: supervised, unsupervised
- Python for ML
  - NumPy basics
  - Pandas for data manipulation

Phase: Supervised Learning
- Linear Regression
  - Simple linear regression
  - Multiple linear regression
- Classification
  - Logistic regression
  - Decision trees`;

// Default export for convenience
export default {
  parseRoadmapText,
  validateRoadmapText,
  roadmapToText,
  sampleRoadmapText,
};
