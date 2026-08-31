// hooks/useInitUserData.js
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { $axios as api } from '../api';
import { actions as dataUsersActions } from '../store/data-users/dataUsers.slice';
import { TOKEN, USER_ID } from '../app.constants';
import { message } from 'antd';

export const useInitUserData = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const initUserData = async () => {
      const token = Cookies.get(TOKEN);
      const userId = Cookies.get(USER_ID);

      if (!token) {
        console.log('⚠️ No token, skipping user data init');
        return;
      }

      try {
        let finalUserId = userId;

        // Если user_id нет в cookie, запрашиваем из API
        if (!finalUserId) {
          console.log('📡 Fetching user_id from API...');
          const userResponse = await api.get('/user-id');
          finalUserId = userResponse.data.id || userResponse.data;
          Cookies.set(USER_ID, finalUserId);
          console.log('✅ User ID saved:', finalUserId);
        }

        // Загружаем данные папок пользователя
        console.log('📂 Fetching user folders for:', finalUserId);
        const foldersResponse = await api.get(`/user-folders/${finalUserId}`);
        
        console.log('✅ User folders loaded:', foldersResponse.data);
        
        // Сохраняем в Redux
        dispatch(dataUsersActions.addData(foldersResponse.data));
        
      } catch (error) {
        console.error('❌ Error initializing user data:', error);
        
        if (error.response?.status === 401) {
          Cookies.remove(TOKEN);
          Cookies.remove(USER_ID);
          window.location.href = '/auth';
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