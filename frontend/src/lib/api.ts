import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api', // Ajustar a variable de entorno en prod
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('token');
    if (token) {
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
      if (token !== "null" && token !== "undefined") {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
