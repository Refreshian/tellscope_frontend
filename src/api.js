import axios from 'axios';
import Cookies from 'js-cookie';

import { API_URL, TOKEN, REFRESH_TOKEN } from './app.constants';

export const $axios = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Сессия истекла: запоминаем, куда пользователь шёл, чистим cookie и уводим на форму входа.
// Маршрут /login в приложении не существует — из-за этого раньше показывалась страница «не найдено».
const redirectToLogin = () => {
  const current = `${window.location.pathname}${window.location.search}`;
  if (current && current !== '/' && !current.startsWith('/login')) {
    try {
      sessionStorage.setItem('postAuthRedirectPath', current);
    } catch (e) {
      /* приватный режим — не критично */
    }
  }
  Cookies.remove(TOKEN);
  Cookies.remove(REFRESH_TOKEN);
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
};

const refreshTokenValue = () => {
  const value = Cookies.get(REFRESH_TOKEN);
  if (!value || value === 'undefined' || value === 'null') return null;
  return value;
};

$axios.interceptors.request.use(
  config => {
    const token = Cookies.get(TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

$axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    // на самих эндпоинтах авторизации refresh не запускаем — иначе получаем цикл
    const isAuthCall = (originalRequest.url || '').includes('/auth/');

    if (status === 401 && !originalRequest._retry && !isAuthCall) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return $axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = refreshTokenValue();
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });

        Cookies.set(TOKEN, data.access_token);
        if (data.refresh_token) {
          Cookies.set(REFRESH_TOKEN, data.refresh_token);
        }
        $axios.defaults.headers.common['Authorization'] = 'Bearer ' + data.access_token;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token;

        processQueue(null, data.access_token);
        isRefreshing = false;

        return $axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        redirectToLogin();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
