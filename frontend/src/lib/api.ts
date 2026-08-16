import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api', // Ajustar a variable de entorno en prod
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
