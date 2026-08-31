import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from '../app.constants';
import {
	actions,
	actions as aiDataAction,
} from '../store/ai-data/aiData.slice';
import { actions as topicAnalysisDataAction } from '../store/topic-analysis-data/topicAnalysisData.slice';

export const tablesService = createApi({
	reducerPath: 'tablesService',
	baseQuery: fetchBaseQuery({
		baseUrl: API_URL,
		prepareHeaders: headers => {
			const token = Cookies.get(TOKEN);

			if (token) headers.set('Authorization', `Bearer ${token}`);

			return headers;
		},
	}),
	endpoints: builder => ({
		topicAnalysis: builder.query({
			query: data =>
				`/themes?index=${data.index}&min_date=${data.min_range_date}&max_date=${data.max_range_date}`,
			keepUnusedDataFor: 600,
			// Этот метод позволит диспатчить данные в другой срез стора
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(
						topicAnalysisDataAction.addThemesData_topicAnalysisData(
							data.values,
						),
					); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		aiAnalyticsGET: builder.query({
			query: data => {
				if (data.query_str) {
					return {
						url: `/ai-analytics?index=${data.index}&min_date=${data.min_range_date}&max_date=${data.max_range_date}&query_str=${data.query_str}`,
						method: 'GET',
						keepUnusedDataFor: 600,
					};
				} else {
					return {
						url: `/ai-analytics?index=${data.index}&min_date=${data.min_range_date}&max_date=${data.max_range_date}`,
						method: 'GET',
						keepUnusedDataFor: 600,
					};
				}
			},
			// Этот метод позволит диспатчить данные в другой срез стора
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					// dispatch(
					// 	aiDataAction.addAiDataPOST_aiData({
					// 		promt: '',
					// 		texts: [],
					// 	}),
					// );
					dispatch(aiDataAction.addViewTable_aiData('get'));
					dispatch(aiDataAction.addAiTesting_aiData(data.data));
					localStorage.setItem('isGraf', 'true');
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		startTesting: builder.query({
			query: data => ({
				url: '/llm-run-multiple/',
				method: 'POST',
				body: data,
			}),
		}),
		getStatusRequest: builder.query({
			query: id => `/status/${id}`,
			// Этот метод позволит диспатчить данные в другой срез стора
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(actions.setProgressLoad(data.progress)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		startDataAi: builder.query({
			query: data => ({
				url: '/llm-run/',
				method: 'POST',
				body: data,
			}),
		}),
		llmAnalyze: builder.query({
			query: data =>
				`/llm-analyze?user_id=${data.user_id}&folder_name=${data.folder_name}&file_name=${data.file_name}`,
		}),
	}),
});

export const {
	useLazyTopicAnalysisQuery,
	useLazyAiAnalyticsGETQuery,
	useLazyStartTestingQuery,
	useLazyGetStatusRequestQuery,
	useGetStatusRequestQuery,
	useLazyStartDataAiQuery,
	useLazyLlmAnalyzeQuery,
	useLlmAnalyzeQuery,
} = tablesService;
