import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'
import { GoogleOAuthProvider } from '@react-oauth/google'

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

axios.get('/api/csrf').catch(() => {});

axios.interceptors.request.use((config) => {
  const methods = ['post', 'put', 'patch', 'delete'];
  if (methods.includes(config.method?.toLowerCase())) {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 429) {
      const headers = error.response.headers;
      let retryAfter;
      if (headers && typeof headers.get === 'function') {
        retryAfter = headers.get('retry-after') || headers.get('Retry-After');
      } else if (headers) {
        retryAfter = headers['retry-after'] || headers['Retry-After'];
      }
      
      if (retryAfter && !isNaN(retryAfter)) {
        const seconds = parseInt(retryAfter, 10);
        if (seconds > 0) {
          let durationStr;
          if (seconds < 60) {
            durationStr = `${seconds} second${seconds !== 1 ? 's' : ''}`;
          } else if (seconds === 60) {
            durationStr = '1 minute';
          } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            durationStr = `about ${minutes} minute${minutes !== 1 ? 's' : ''}`;
          } else {
            const hours = Math.round(seconds / 3600);
            durationStr = `about ${hours} hour${hours !== 1 ? 's' : ''}`;
          }
          
          if (error.response.data && typeof error.response.data.detail === 'string') {
            // Check to avoid duplicating if interceptor runs twice (though it shouldn't)
            if (!error.response.data.detail.includes('Try again in')) {
              error.response.data.detail = `${error.response.data.detail} Try again in ${durationStr}.`;
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
