import axios from 'axios';
import { API_URL, TOKEN, REFRESH_TOKEN } from '../app.constants';
import Cookies from 'js-cookie';

export const authService = {
  login: async (email, password, setIsAuth) => {
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      // "/auth/jwt/login"
      const { data } = await axios.post("/api/auth/jwt/login", params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true
      });

      Cookies.set(TOKEN, data.access_token);
      Cookies.set(REFRESH_TOKEN, data.refresh_token);
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
    Cookies.remove(TOKEN);
    Cookies.remove(REFRESH_TOKEN);
    window.location.href = "/auth";
  }
};