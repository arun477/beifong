import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
   baseURL: API_BASE_URL,
   timeout: 60000 * 5,
   headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
   },
});

api.interceptors.request.use(
   config => {
      return config;
   },
   error => {
      return Promise.reject(error);
   }
);

api.interceptors.response.use(
   response => {
      if (
         response.data &&
         response.data.items &&
         Array.isArray(response.data.items) &&
         response.config.url.includes('/api/articles')
      ) {
         response.data.items = response.data.items.map(normalizeArticleData);
      } else if (
         response.data &&
         response.config.url.includes('/api/articles/') &&
         !response.config.url.includes('/list')
      ) {
         response.data = normalizeArticleData(response.data);
      }
      return response;
   },
   error => {
      if (error.response) {
         console.error('API Error:', error.response.data);
      } else if (error.request) {
         console.error('No response received:', error.request);
      } else {
         console.error('Error setting up request:', error.message);
      }
      return Promise.reject(error);
   }
);

const normalizeArticleData = article => {
   if (!article) return article;
   if (!article.categories) {
      article.categories = [];
   } else if (!Array.isArray(article.categories)) {
      if (typeof article.categories === 'string') {
         article.categories = article.categories.split(',').map(c => c.trim());
      } else {
         article.categories = [article.categories];
      }
   }
   return article;
};

// Enhanced polling function with exponential backoff and better error handling
const pollForChatCompletion = async (sessionId, maxAttempts = 180, initialDelay = 1000) => {
   let attempts = 0;
   let delay = initialDelay;
   let consecutiveErrors = 0;
   const maxConsecutiveErrors = 5;

   while (attempts < maxAttempts) {
      try {
         const statusResponse = await api.post('/api/podcast-agent/status', {
            session_id: sessionId,
         });

         // Reset consecutive error counter on successful request
         consecutiveErrors = 0;

         // Calculate estimated progress based on elapsed time
         const elapsedSeconds = statusResponse.data.elapsed_seconds || 0;
         const estimatedProgress = Math.min(
            Math.round((elapsedSeconds / 300) * 100), // Assuming ~5 minutes max processing time
            99 // Cap at 99% until complete
         );

         // Enhance the response with progress estimate if not provided
         if (!statusResponse.data.progress && statusResponse.data.is_processing) {
            statusResponse.data.progress = estimatedProgress;
         }

         // If processing is complete, return the result
         if (!statusResponse.data.is_processing) {
            return statusResponse.data;
         }

         // Get more granular with polling timing
         if (elapsedSeconds < 10) {
            // Poll more frequently at start
            delay = 1000;
         } else if (elapsedSeconds < 60) {
            // Poll every 2-3 seconds in the first minute
            delay = 2000;
         } else if (elapsedSeconds < 180) {
            // Poll every 3-5 seconds in the 1-3 minute range
            delay = Math.min(delay * 1.2, 5000);
         } else {
            // Poll every 5-10 seconds after 3 minutes
            delay = Math.min(delay * 1.1, 10000);
         }

         // Wait for the next poll
         await new Promise(resolve => setTimeout(resolve, delay));
         attempts++;
      } catch (error) {
         console.error('Error polling for chat completion:', error);
         
         // Increment consecutive error counter
         consecutiveErrors++;
         
         // If we've had too many consecutive errors, break and return error
         if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error('Too many consecutive errors while polling for status');
         }
         
         // Increase delay on error with a more aggressive backoff
         delay = Math.min(delay * 2, 15000);
         await new Promise(resolve => setTimeout(resolve, delay));
         attempts++;
      }
   }

   // If we've reached the maximum number of attempts, throw an error
   throw new Error('Timed out waiting for chat completion');
};

const endpoints = {
   root: {
      get: () => api.get('/api'),
   },
   articles: {
      getAll: (params = {}) => api.get('/api/articles/', { params }),
      getById: articleId => api.get(`/api/articles/${articleId}`),
      getSources: () => api.get('/api/articles/sources/list'),
      getCategories: () => api.get('/api/articles/categories/list'),
   },
   podcasts: {
      getAll: (params = {}) => api.get('/api/podcasts/', { params }),
      getById: podcastId => api.get(`/api/podcasts/${podcastId}`),
      getByIdentifier: identifier => api.get(`/api/podcasts/by-identifier/${identifier}`),
      getFormats: () => api.get('/api/podcasts/formats'),
      getLanguageCodes: () => api.get('/api/podcasts/language-codes'),
      getTtsEngines: () => api.get('/api/podcasts/tts-engines'),
      getAudioUrl: filename => `${API_BASE_URL}/audio/${filename}`,
      create: podcastData => api.post('/api/podcasts/', podcastData),
      update: (podcastId, podcastData) => api.put(`/api/podcasts/${podcastId}`, podcastData),
      delete: podcastId => api.delete(`/api/podcasts/${podcastId}`),
      uploadAudio: (podcastId, audioFile) => {
         const formData = new FormData();
         formData.append('file', audioFile);
         return api.post(`/api/podcasts/${podcastId}/audio`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
      },
      uploadBanner: (podcastId, imageFile) => {
         const formData = new FormData();
         formData.append('file', imageFile);
         return api.post(`/api/podcasts/${podcastId}/banner`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
         });
      },
   },
   sources: {
      getAll: (params = {}) => api.get('/api/sources/', { params }),
      getById: sourceId => api.get(`/api/sources/${sourceId}`),
      create: sourceData => api.post('/api/sources/', sourceData),
      update: (sourceId, sourceData) => api.put(`/api/sources/${sourceId}`, sourceData),
      delete: (sourceId, permanent = true) =>
         api.delete(`/api/sources/${sourceId}`, { params: { permanent } }),
      getByName: name => api.get(`/api/sources/by-name/${name}`),
      getByCategory: category => api.get(`/api/sources/by-category/${category}`),
      getCategories: () => api.get('/api/sources/categories'),
      getFeeds: sourceId => api.get(`/api/sources/${sourceId}/feeds`),
      addFeed: (sourceId, feedData) => api.post(`/api/sources/${sourceId}/feeds`, feedData),
      updateFeed: (feedId, feedData) => api.put(`/api/sources/feeds/${feedId}`, feedData),
      deleteFeed: feedId => api.delete(`/api/sources/feeds/${feedId}`),
   },
   tasks: {
      getAll: (includeDisabled = false) =>
         api.get('/api/tasks/', { params: { include_disabled: includeDisabled } }),
      getById: taskId => api.get(`/api/tasks/${taskId}`),
      create: taskData => api.post('/api/tasks/', taskData),
      update: (taskId, taskData) => api.put(`/api/tasks/${taskId}`, taskData),
      delete: taskId => api.delete(`/api/tasks/${taskId}`),
      getPending: () => api.get('/api/tasks/pending'),
      getExecutions: (options = {}) => {
         const { taskId = null, page = 1, perPage = 10 } = options;
         const params = {
            page,
            per_page: perPage,
         };
         if (taskId) params.task_id = taskId;
         return api.get('/api/tasks/executions', { params });
      },
      getStats: () => api.get('/api/tasks/stats'),
      getTypes: () => api.get('/api/tasks/types'),
      enable: taskId => api.post(`/api/tasks/${taskId}/enable`),
      disable: taskId => api.post(`/api/tasks/${taskId}/disable`),
   },
   podcastConfigs: {
      getAll: (activeOnly = false) =>
         api.get('/api/podcast-configs/', { params: { active_only: activeOnly } }),
      getById: configId => api.get(`/api/podcast-configs/${configId}`),
      create: configData => api.post('/api/podcast-configs/', configData),
      update: (configId, configData) => api.put(`/api/podcast-configs/${configId}`, configData),
      delete: configId => api.delete(`/api/podcast-configs/${configId}`),
      toggle: (configId, isActive) =>
         api.post(`/api/podcast-configs/${configId}/${isActive ? 'enable' : 'disable'}`),
      getTtsEngines: () => api.get('/api/podcasts/tts-engines'),
      getLanguageCodes: () => api.get('/api/podcasts/language-codes'),
   },
   podcastAgent: {
      createSession: (sessionId = null) =>
         api.post('/api/podcast-agent/session', {
            session_id: sessionId,
         }),
      chat: async (sessionId, message) => {
         try {
            // Send the chat message - this will now ALWAYS be an async operation
            const response = await api.post('/api/podcast-agent/chat', {
               session_id: sessionId,
               message,
            });

            // With our new task queue system, all requests will return is_processing=true
            // so we'll always need to poll for completion
            if (response.data.is_processing) {
               console.log('Chat processing started, polling for completion...');
               
               // Extract process info for progress updates
               const processType = response.data.process_type || 'chat';
               
               try {
                  // Poll for completion
                  const finalResponse = await pollForChatCompletion(sessionId);
                  
                  // Return a response in the format expected by the UI
                  return {
                     data: {
                        session_id: sessionId,
                        response: finalResponse.response || '',
                        stage: finalResponse.stage || response.data.stage || 'unknown',
                        session_state: finalResponse.session_state || response.data.session_state || '{}',
                        process_type: processType,
                     },
                  };
               } catch (pollError) {
                  console.error('Error polling for completion:', pollError);
                  
                  // Even on error, send back a structured response to avoid breaking the UI
                  return {
                     data: {
                        session_id: sessionId,
                        response: `I encountered an error while processing your request: ${pollError.message}. Please try again.`,
                        stage: response.data.stage || 'error',
                        session_state: response.data.session_state || '{}',
                        error: pollError.message,
                     },
                  };
               }
            }

            // This branch is unlikely to be reached with our new task queue system,
            // but we'll keep it for completeness and backward compatibility
            return response;
         } catch (error) {
            console.error('Error sending chat message:', error);
            
            // Handle the case where the request itself fails
            // We'll create a response format that matches what the UI expects
            return {
               data: {
                  session_id: sessionId,
                  response: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
                  stage: 'error',
                  session_state: '{}',
                  error: error.message,
               },
            };
         }
      },
      checkStatus: sessionId =>
         api.post('/api/podcast-agent/status', {
            session_id: sessionId,
         }),
      getLatestMessage: sessionId =>
         api.get(`/api/podcast-agent/latest_message?session_id=${sessionId}`),
      listSessions: (page = 1, perPage = 10) =>
         api.get('/api/podcast-agent/sessions', {
            params: { page, per_page: perPage },
         }),
      deleteSession: sessionId => api.delete(`/api/podcast-agent/session/${sessionId}`),
      getSessionHistory: sessionId =>
         api.get(`/api/podcast-agent/session_history?session_id=${sessionId}`),
      getBannerUrl: filename => `${API_BASE_URL}/podcast_img/${filename}`,
      getAudioUrl: filename => `${API_BASE_URL}/audio/${filename}`,
   },

   API_BASE_URL: API_BASE_URL,
};

export default endpoints;