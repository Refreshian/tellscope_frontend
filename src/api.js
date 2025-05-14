import axios from 'axios';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from './app.constants';

export const $axios = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

$axios.interceptors.request.use(
	config => {
		const token = Cookies.get(TOKEN);
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	error => {
		return Promise.reject(error);
	},
);

//HELP: Перехватчик ответов для обработки ошибок авторизации
$axios.interceptors.response.use(
	response => response, //HELP: Возвращаем успешный ответ без изменений
	error => {
		//HELP: Проверяем, что ошибка связана с HTTP-ответом (а не с сетевой ошибкой)
		if (error.response) {
			//HELP: Обрабатываем статус 401 (Unauthorized)
			if (error.response.status === 401) {
				//HELP: Удаляем просроченный токен
				Cookies.remove(TOKEN);
				console.log('token');
				// // Перенаправляем на страницу авторизации
				// // Используйте window.location для надежности
				// window.location.href = '/login'; // Укажите ваш путь к странице логина
			}
		}
		return Promise.reject(error);
	},
);
