import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from '../app.constants';
import { actions } from '../store/data-users/dataUsers.slice';

const baseQuery = fetchBaseQuery({
	baseUrl: API_URL,
	prepareHeaders: headers => {
		const token = Cookies.get(TOKEN);
		if (token) {
			headers.set('Authorization', `Bearer ${token}`);
		}
		return headers;
	},
});

export const dataUsersService = createApi({
	reducerPath: 'dataUsersService',
	baseQuery: async (args, api, extraOptions) => {
		const result = await baseQuery(args, api, extraOptions);
		// Если получили 401, удаляем токен или выполняем другую логику
		if (result.error && result.error.status === 401) {
			Cookies.remove(TOKEN);
			// Здесь можно выполнить перенаправление или дополнительную обработку
		}
		return result;
	},
	endpoints: builder => ({
		getUserId: builder.query({
			query: () => '/user-id',
		}),
		getUserFolders: builder.query({
			query: id => `/user-folders/${id}`,
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(actions.addData(data));
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
	}),
});

export const { useGetUserIdQuery, useGetUserFoldersQuery } = dataUsersService;
