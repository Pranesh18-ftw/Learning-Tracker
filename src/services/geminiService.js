// Gemini API service for generating learning roadmaps
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Demo mode flag - set to true to use mock responses instead of real API
const DEMO_MODE = false;

// Demo response for Machine Learning and other common subjects
const DEMO_RESPONSES = {
  'Machine Learning': `Phase: Foundations
- Introduction to ML
  - What is machine learning
  - Types of ML: supervised, unsupervised, reinforcement
- Python for ML
  - NumPy basics
  - Pandas for data manipulation
  - Matplotlib for visualization
- Linear Algebra Review
  - Vectors and matrices
  - Matrix operations
  - Eigenvalues and eigenvectors

Phase: Supervised Learning
- Linear Regression
  - Simple linear regression
  - Multiple linear regression
  - Gradient descent
- Classification Algorithms
  - Logistic regression
  - Decision trees
  - Random forests
- Model Evaluation
  - Train-test split
  - Cross-validation
  - Metrics: accuracy, precision, recall, F1

Phase: Unsupervised Learning
- Clustering
  - K-means clustering
  - Hierarchical clustering
  - DBSCAN
- Dimensionality Reduction
  - PCA
  - t-SNE
  - Feature selection techniques

Phase: Neural Networks & Deep Learning
- Neural Network Basics
  - Perceptrons
  - Activation functions
  - Backpropagation
- Deep Learning Frameworks
  - TensorFlow basics
  - PyTorch basics
  - Keras API
- CNNs and RNNs
  - Convolutional layers
  - Recurrent layers
  - LSTM and GRU`,
};

/**
 * Generate a demo response for any subject
 */
const generateDemoResponse = (subject) => {
  return `Phase: Introduction to ${subject}
- Getting Started
  - Understanding the basics
  - Key concepts and terminology
  - Setting up your environment
- Core Principles
  - Fundamental theories
  - Best practices
  - Common patterns

Phase: Intermediate ${subject}
- Building Projects
  - Project structure
  - Implementation strategies
  - Testing approaches
- Advanced Techniques
  - Optimization methods
  - Performance tuning
  - Error handling

Phase: Advanced ${subject}
- Expert Level Topics
  - Complex scenarios
  - Integration patterns
  - Scaling strategies
- Real-world Applications
  - Case studies
  - Industry examples
  - Best practices`;
};
/**
 * Generate a learning roadmap using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} subject - Subject name to generate roadmap for
 * @returns {Promise<Object>} - Parsed roadmap with phases and tasks
 */
export const generateRoadmap = async (apiKey, subject) => {
  // Demo mode - return mock response for testing without API key
  if (DEMO_MODE || !apiKey) {
    console.log(`[DEMO MODE] Generating roadmap for: ${subject}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const demoText = DEMO_RESPONSES[subject] || generateDemoResponse(subject);
    return parseGeminiResponse(demoText, subject);
  }

  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const prompt = `Generate a comprehensive learning roadmap for "${subject}".

Return the response in this exact format:

Phase: [Phase Name]
- [Task 1]
  - [Subtask 1.1]
  - [Subtask 1.2]
- [Task 2]
  - [Subtask 2.1]
- [Task 3]

Phase: [Phase Name]
- [Task 1]
  - [Subtask 1.1]
- [Task 2]

Rules:
1. Start each phase with "Phase: " followed by the phase name
2. List tasks under each phase starting with "- "
3. Indent subtasks with 2 spaces followed by "- "
4. Include 3-5 phases per subject
5. Include 3-5 tasks per phase
6. Include 2-3 subtasks per task where applicable
7. Order phases from beginner to advanced
8. Make tasks specific and actionable

Generate the roadmap now:`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error('No response from Gemini API');
  }

  return parseGeminiResponse(generatedText, subject);
};

/**
 * Parse Gemini API response into roadmap structure
 * @param {string} text - Raw Gemini response
 * @param {string} subjectName - Subject name
 * @returns {Object} - Parsed roadmap structure
 */
const parseGeminiResponse = (text, subjectName) => {
  const lines = text.split('\n');
  const result = {
    name: subjectName,
    phases: [],
  };

  let currentPhase = null;
  let currentTask = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    // Check if this is a subtask (exactly 2 spaces followed by "- ")
    const isSubtask = line.startsWith('  -') && !line.startsWith('    -');

    // Phase line
    if (trimmedLine.startsWith('Phase:')) {
      const phaseName = trimmedLine.replace('Phase:', '').trim();
      currentPhase = {
        name: phaseName,
        tasks: [],
      };
      currentTask = null;
      result.phases.push(currentPhase);
      continue;
    }

    // Task line (starts with "- ")
    if (trimmedLine.startsWith('-')) {
      // If no phase exists yet, create a default one
      if (!currentPhase) {
        currentPhase = {
          name: 'General',
          tasks: [],
        };
        result.phases.push(currentPhase);
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
 * Validate if an API key format looks correct
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Whether the key format appears valid
 */
export const isValidApiKeyFormat = (apiKey) => {
  // Gemini keys are typically 39 characters long and start with 'AIza'
  return apiKey && apiKey.startsWith('AIza') && apiKey.length >= 20;
};
