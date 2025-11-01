import axios from 'axios';

/**
 * Base URL for API requests.
 * In production, nginx will handle routing.
 * For local development, Vite proxy will forward /api requests to backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Axios instance with default configuration.
 * All API requests should use this instance.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

/**
 * Request interceptor for adding auth tokens or logging.
 * Currently just logs the request for debugging.
 */
api.interceptors.request.use(
  (config) => {
    // Future: Add auth token to headers if needed
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor for error handling.
 * Transforms backend errors into consistent format.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || 'An error occurred on the server';
      return Promise.reject(new Error(errorMessage));
    }
    if (error.request) {
      // Request was made but no response received
      return Promise.reject(new Error('No response from server. Please check your connection.'));
    }
    // Something else happened
    return Promise.reject(error);
  },
);

export default api;
