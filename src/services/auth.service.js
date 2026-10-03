import axios from 'axios';
import { API_URL, TOKEN, REFRESH_TOKEN } from '../app.constants';
import Cookies from 'js-cookie';
import { clearUserSession } from '../utils/userSession';
import { resetUserScopedState } from '../utils/resetUserState';
import { invalidateCurrentUser } from '../hooks/useCurrentUser';

export const authService = {
  login: async (email, password, setIsAuth) => {
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      // "/auth/jwt/login"
      const { data } = await axios.post("/api/auth/login", params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true
      });

      // Смена учётной записи: cookie `user_id` и локальные данные предыдущего пользователя
      // не должны дожить до новой сессии. Раньше `user_id` оставался от прошлого входа, и
      // отчёты/папки запрашивались по чужому id — сервер отвечал 403 «Нет доступа».
      clearUserSession();
      Cookies.set(TOKEN, data.access_token);
      if (data.refresh_token) {
        Cookies.set(REFRESH_TOKEN, data.refresh_token);
      }
      // Кэш /me и кэш запросов сбрасываем вместе с cookie: иначе страница покажет данные
      // предыдущего пользователя (его id в кэше /me и его папки в кэше /user-folders).
      resetUserScopedState();
      invalidateCurrentUser();
      setIsAuth(true);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  registration: async (email, password, username, role_id = 1) => {
    try {
      const { data } = await axios.post("/api/auth/register", { ///auth/register
        email,
        password,
        username, // <- обязательно!
        role_id: 1,  // <- обязательно!
        is_active: true,
        is_superuser: false,
        is_verified: false
      });
      return data;
    } catch (error) {
      console.error("Registration error:", error, error.response?.data);
      throw error;
    }
  },

  logout: () => {
    // Полная очистка, а не только токен: `user_id` и refresh-токен переживали выход,
    // и следующий пользователь входил в браузер с чужими cookie. Кэш запросов чистим там же:
    // иначе следующий вошедший увидит папки и отчёты предыдущего.
    clearUserSession();
    resetUserScopedState();
    invalidateCurrentUser();
    window.location.href = "/";
  }
};
