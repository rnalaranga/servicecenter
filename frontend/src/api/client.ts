import axios from 'axios';

// Create a configured axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally add interceptors here (e.g., for auth tokens)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors (like 401 Unauthorized)
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
