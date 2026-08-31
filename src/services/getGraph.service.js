import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import Cookies from 'js-cookie';

import { API_URL, TOKEN } from '../app.constants';
import { actions as competitiveDataAction } from '../store/competitive-data/competitiveData.slice';
import { actions as informationGraphDataAction } from '../store/information-graph-data/informationGraphData.slice';
import { actions as mediaDataAction } from '../store/media-data/mediaData.slice';
import { actions as tonalityDataAction } from '../store/tonality-data/tonalityData.slice';
import { actions as voiceDataAction } from '../store/voice-data/voiceData.slice';
import { funksInformationGraph } from '../utils/editData';

export const getGraphService = createApi({
	reducerPath: 'getGraphService',
	baseQuery: fetchBaseQuery({
		baseUrl: API_URL,
		prepareHeaders: headers => {
			const token = Cookies.get(TOKEN);

			if (token) headers.set('Authorization', `Bearer ${token}`);

			return headers;
		},
	}),
	endpoints: builder => ({
		userTonality: builder.query({
			query: data =>
				`/tonality_landscape?index=${data.index}&min_date=${data.min_date}&max_date=${data.max_date}`,
			keepUnusedDataFor: 600,
			// Этот метод позволит диспатчить данные в другой срез стора
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(tonalityDataAction.addTonalityData(data)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		informationGraph: builder.query({
			query: params => {
				const modifiedParams = funksInformationGraph.modifyParams(params);
				const queryParams = new URLSearchParams(modifiedParams).toString();
				console.log(params, modifiedParams);
				return `/information_graph?${queryParams}`;
			},
			keepUnusedDataFor: 600,
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(informationGraphDataAction.addInformationGraphData(data)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		mediaGraph: builder.query({
			query: data =>
				`/media-rating?index=${data.index}&min_date=${data.min_range_date}&max_date=${data.max_range_date}`,
			keepUnusedDataFor: 600,
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(mediaDataAction.addMediaData(data)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		voiceGraph: builder.query({
			query: data =>
				`/voice?index=${data.index}&min_date=${data.min_range_date}&max_date=${data.max_range_date}&query_str=${data.query_str}`,
			keepUnusedDataFor: 600,
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(voiceDataAction.addVoiceData(data)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
		competitiveGraph: builder.query({
			query: data => ({
				url: '/competitors',
				method: 'POST',
				body: {
					themes_ind: data.themes_ind,
					min_date: data.min_range_date,
					max_date: data.max_range_date,
				},
				headers: {
					'Content-Type': 'application/json', // Указываем, что данные в формате JSON
				},
			}),
			keepUnusedDataFor: 600,
			async onQueryStarted(arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled; // Дожидаемся выполнения запроса
					dispatch(competitiveDataAction.addCompetitiveData(data)); // Диспатчим результат в другой срез
				} catch (error) {
					console.log('Ошибка запроса:', error);
				}
			},
		}),
	}),
});

export const {
	useUserTonalityQuery,
	useLazyUserTonalityQuery,
	useLazyInformationGraphQuery,
	useLazyMediaGraphQuery,
	useLazyVoiceGraphQuery,
	useLazyCompetitiveGraphQuery,
} = getGraphService;
