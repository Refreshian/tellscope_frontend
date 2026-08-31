import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

import { TOKEN } from '../app.constants';

import { useAuth } from './useAuth';

export const useLogout = () => {
	const { setIsAuth } = useAuth();
	const nav = useNavigate();

	const logoutHandler = () => {
		Cookies.remove(TOKEN);
		setIsAuth(false);
		nav('/');
	};

	return logoutHandler;
};
