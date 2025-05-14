import axios from 'axios';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from '../app.constants';

export const authService = {
	login: async (email, password, setIsAuth) => {
		try {
			const { data } = await axios.post(
				`${API_URL}/auth/jwt/login`,
				`grant_type=password&username=${email}&password=${password}&scope=&client_id=&client_secret=`,
				// {
				// 	username: email,
				// 	password,
				// },
			);

			// console.log(data);

			if (data.access_token) {
				Cookies.set(TOKEN, data.access_token);
				setIsAuth(true);
			}
		} catch (error) {
			console.log(error);
		}
	},
	registration: async (email, password) => {
		try {
			const { data } = await axios.post(`${API_URL}/auth/register`, {
				email: email,
				password: password,
				is_active: true,
				is_superuser: false,
				is_verified: false,
				username: 'string',
				role_id: 0,
				comments: 'string',
			});

			return data;
		} catch (error) {
			console.log(error);
			throw error;
		}
	},
};
