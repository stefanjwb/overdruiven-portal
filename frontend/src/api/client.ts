import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // Stuur cookies mee bij elke request
});

// Refresh-token logica: bij een 401 eerst proberen te vernieuwen
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

function processQueue(error: any) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    // Probeer token te vernieuwen bij 401, maar niet voor auth-endpoints zelf
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/me')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        const p = window.location.pathname;
        if (!p.includes('/login') && p !== '/') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Definitief niet ingelogd
    if (error.response?.status === 401) {
      const p = window.location.pathname;
      if (!p.includes('/login') && p !== '/') window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
