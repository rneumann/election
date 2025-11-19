import axios from 'axios';
import { logger } from '../conf/logger/logger.js';

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
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    // Future: Add auth token to headers if needed
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  },
);

/**
 * Response interceptor for error handling.
 * Transforms backend errors into consistent format.
 */
api.interceptors.response.use(
  (response) => {
    logger.debug(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      logger.error(`API Error ${error.response.status}:`, error.response.data);
      const errorMessage = error.response.data?.message || 'An error occurred on the server';
      return Promise.reject(new Error(errorMessage));
    }
    if (error.request) {
      // Request was made but no response received
      logger.error('No response from server:', error.request);
      return Promise.reject(new Error('No response from server. Please check your connection.'));
    }
    // Something else happened
    logger.error('API Error:', error);
    return Promise.reject(error);
  },
);

export default api;
