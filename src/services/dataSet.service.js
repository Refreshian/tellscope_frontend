import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from '../app.constants';
import { actions as dataUsersAction } from '../store/data-users/dataUsers.slice';

export const dataSetService = createApi({
	reducerPath: 'dataSetService',
	baseQuery: fetchBaseQuery({
		baseUrl: API_URL,
		prepareHeaders: headers => {
			const token = Cookies.get(TOKEN);

			if (token) headers.set('Authorization', `Bearer ${token}`);

			return headers;
		},
	}),
	endpoints: builder => ({
		// fileRename: builder.query({
		// 	query: data => {
		// 		const params = new URLSearchParams({
		// 			folder_name: data.folder_name,
		// 			current_file_name: data.current_file_name,
		// 			new_file_name: data.new_file_name,
		// 		}).toString();
		// 		return `/file-rename?${params}`;
		// 	},
		// 	keepUnusedDataFor: 600,
		// }),
		fileLoad: builder.query({
			query: ({ user, directory, folder_name, file_name }) => ({
				url: `/file-load/${user}/${directory}/${folder_name}/${file_name}`,
				method: 'GET',
				headers: {
					accept: 'application/octet-stream',
				},
				responseHandler: response => response.blob(),
			}),
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					// Здесь вы можете обработать Blob напрямую
					console.log('Файл получен:', data);
				} catch (error) {
					console.error('Ошибка при загрузке файла:', error);
				}
			},
			// Отключаем кеширование
			keepUnusedDataFor: 0,
			providesTags: () => [],
		}),
		deleteFolder: builder.mutation({
			query: ({ user, folder_name, directory }) => {
				return {
					url: `/delete-folder/${user}/${directory}/${encodeURIComponent(folder_name)}`,
					method: 'DELETE',
				};
			},
		}),
		deleteFile: builder.mutation({
			query: ({ user, folder_name, directory, file_name }) => {
				return {
					url: `/delete-file/${user}/${directory}/${encodeURIComponent(folder_name)}/${file_name}`,
					method: 'DELETE',
				};
			},
		}),
		dataAddFile: builder.mutation({
			query: ({ data, name, user }) => {
				console.log(data, name, user);
				if (!data || !name || !user) {
					console.error('Ошибка: data или name или user не переданы в query');
					return;
				}

				const formData = new FormData();
				formData.append('uploaded_file', data.uploaded_file); // 'uploaded_file' — ключ, ожидаемый сервером

				return {
					url: `/add-file/${user}/${encodeURIComponent(name)}`,
					method: 'POST',
					body: formData,
					headers: {
						Accept: 'application/json',
					},
				};
			},
			keepUnusedDataFor: 600,
			async onQueryStarted(
				{ data, name, fileName },
				{ dispatch, queryFulfilled },
			) {
				try {
					const { data: data_request } = await queryFulfilled; // Дожидаемся выполнения запроса
					console.log('data, name, fileName', data, name, fileName);
					dispatch(
						dataUsersAction.addNewFileJson({
							name_folder: name,
							name_file: fileName,
						}),
					);
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		createFolder: builder.query({
			query: ({ user, folder }) => `/add-folder/${user}/${folder}`,
			keepUnusedDataFor: 600,
		}),
	}),
});

export const {
	useLazyFileRenameQuery,
	useLazyCreateFolderQuery,
	useLazyDataAddFileQuery,
	useDataAddFileMutation,
	useLazyDataDeleteQuery,
	useDeleteFolderMutation,
	useDeleteFileMutation,
	useLazyGetDataFoldersQuery,
	useLazyGetProcessedFilesQuery,
	useLazyFileLoadQuery,
} = dataSetService;
