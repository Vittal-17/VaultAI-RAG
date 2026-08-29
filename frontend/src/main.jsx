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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
