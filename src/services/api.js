const api = {
  // Base URL for API calls
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',

  // Generic request method
  request: async (endpoint, options = {}) => {
    const url = `${api.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  },

  // Session API methods
  sessions: {
    start: async (sessionData) => {
      return api.request('/sessions/start', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
    },

    end: async (sessionId, duration) => {
      return api.request(`/sessions/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify({ duration })
      });
    },

    getToday: async () => {
      return api.request('/sessions/today');
    },

    getStats: async () => {
      return api.request('/sessions/stats');
    },

    getBySubject: async (subjectId) => {
      return api.request(`/sessions/subject/${subjectId}`);
    }
  },

  // Health check
  health: async () => {
    return api.request('/health');
  }
};

module.exports = api;
