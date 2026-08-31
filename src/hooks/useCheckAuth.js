import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TOKEN } from '../app.constants';

import { useAuth } from './useAuth';

export const useCheckAuth = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isAuth, setIsAuth } = useAuth();

	useEffect(() => {
		if (!Cookies.get(TOKEN)) setIsAuth(false);
	}, [pathname]);

	if (!isAuth) {
		navigate('/auth', {
			replace: true,
			state: { from: pathname },
		});
	}
};
