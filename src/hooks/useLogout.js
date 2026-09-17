import { useNavigate } from 'react-router-dom';

import { clearUserSession } from '../utils/userSession';
import { invalidateCurrentUser } from './useCurrentUser';

import { useAuth } from './useAuth';

export const useLogout = () => {
	const { setIsAuth } = useAuth();
	const nav = useNavigate();

	const logoutHandler = () => {
		// Чистим всю сессию, а не только токен: cookie `user_id` от прошлого входа иначе
		// доживает до следующего пользователя и подменяет его (запросы уходили на чужой id).
		clearUserSession();
		invalidateCurrentUser();
		setIsAuth(false);
		nav('/');
	};

	return logoutHandler;
};
