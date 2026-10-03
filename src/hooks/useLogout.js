import { useNavigate } from 'react-router-dom';

import { clearUserSession } from '../utils/userSession';
import { resetUserScopedState } from '../utils/resetUserState';
import { invalidateCurrentUser } from './useCurrentUser';

import { useAuth } from './useAuth';

export const useLogout = () => {
	const { setIsAuth } = useAuth();
	const nav = useNavigate();

	const logoutHandler = () => {
		// Чистим всю сессию, а не только токен: cookie `user_id` от прошлого входа иначе
		// доживает до следующего пользователя и подменяет его (запросы уходили на чужой id).
		// Вместе с cookie сбрасываем кэш запросов: в нём лежали папки и отчёты прошлого входа.
		clearUserSession();
		resetUserScopedState();
		invalidateCurrentUser();
		setIsAuth(false);
		nav('/');
	};

	return logoutHandler;
};
