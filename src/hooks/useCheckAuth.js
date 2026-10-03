import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TOKEN, REFRESH_TOKEN, COOKIE_DOMAIN, COOKIE_OPTIONS } from '../app.constants';

import { useAuth } from './useAuth';

export const useCheckAuth = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isAuth, setIsAuth } = useAuth();

	useEffect(() => {
		// Cookie сессии должна быть общей для поддоменов: иначе вики не видит вход и
		// отправляет человека в документацию приложения. У уже вошедших cookie осталась
		// без домена — переставляем её здесь, повторный вход не нужен.
		if (COOKIE_DOMAIN) {
			const token = Cookies.get(TOKEN);
			if (token) Cookies.set(TOKEN, token, COOKIE_OPTIONS);
			const refresh = Cookies.get(REFRESH_TOKEN);
			if (refresh) Cookies.set(REFRESH_TOKEN, refresh, COOKIE_OPTIONS);
		}
		if (!Cookies.get(TOKEN)) setIsAuth(false);
	}, [pathname]);

	if (!isAuth) {
		navigate('/auth', {
			replace: true,
			state: { from: pathname },
		});
	}
};
