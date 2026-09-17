// hooks/useInitUserData.js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { $axios as api } from '../api';
import { actions as dataUsersActions } from '../store/data-users/dataUsers.slice';
import { TOKEN, USER_ID } from '../app.constants';
import { clearUserSession } from '../utils/userSession';
import { message } from 'antd';

export const useInitUserData = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initUserData = async () => {
      const token = Cookies.get(TOKEN);

      if (!token) {
        console.log('⚠️ No token, skipping user data init');
        return;
      }

      try {
        // Источник истины — /me, а не cookie. Раньше cookie `user_id` считалась готовым
        // ответом, поэтому после смены учётной записи папки запрашивались по чужому id
        // (`/user-folders/32` токеном пользователя с id 1) и сервер отвечал 403.
        const userResponse = await api.get('/me');
        const payload = userResponse.data;
        const finalUserId =
          payload && typeof payload === 'object' ? payload.id ?? payload.user_id : payload;

        if (finalUserId === undefined || finalUserId === null || finalUserId === '') {
          throw new Error('/me не вернул идентификатор пользователя');
        }

        // cookie остаётся только быстрым кэшем и всегда содержит серверное значение
        Cookies.set(USER_ID, String(finalUserId));
        console.log('✅ User ID from /me:', finalUserId);

        // Загружаем данные папок пользователя
        console.log('📂 Fetching user folders for:', finalUserId);
        const foldersResponse = await api.get(`/user-folders/${finalUserId}`);
        
        console.log('✅ User folders loaded:', foldersResponse.data);
        
        // Сохраняем в Redux
        dispatch(dataUsersActions.addData(foldersResponse.data));
        
      } catch (error) {
        console.error('❌ Error initializing user data:', error);
        
        if (error.response?.status === 401) {
          // 401 от служебных запросов не должен разлогинивать: токен чистим только
          // если он реально недействителен (проверим через /me), иначе остаёмся в системе
          try {
            await api.get('/me');
          } catch (e) {
            if (e.response?.status === 401) {
              // Токен действительно мёртв: убираем всю сессию, а не только токен
              clearUserSession();
              window.location.href = '/auth';
            }
          }
        } else if (error.response?.status === 404) {
          message.error('Пользователь не найден');
        } else {
          message.error('Ошибка загрузки данных пользователя');
        }
      }
    };

    initUserData();
  }, [dispatch]);
};
