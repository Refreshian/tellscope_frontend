import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	index: null,
	name_index_file: '',
	themes_ind: [],
	min_date: null,
	max_date: null,
	min_range_date: null,
	max_range_date: null,
	query_str: '',
	post: false,
	repost: false,
	SMI: false,
	promt: null,
	// texts_ids: [],
	texts: [],
	infoAboutPost: false,
	first_html_file_request: '',
	folder_name_html_file_request: '',
};

export const dataForRequest = createSlice({
	name: 'dataForRequest',
	initialState,
	reducers: {
		addFirstHtmlFileRequest: (state, { payload }) => {
			state.first_html_file_request = payload.file_name;
			state.folder_name_html_file_request = payload.folder_name;
		},
		addThemesInd: (state, { payload }) => {
			// Если в массиве уже два элемента, удаляем их и добавляем только новый
			if (state.themes_ind.length === 2) {
				state.themes_ind = [payload]; // Заменяем оба старых элемента на новый
			} else {
				// Если элемент уже есть, убираем его
				if (state.themes_ind.includes(payload)) {
					state.themes_ind = state.themes_ind.filter(id => id !== payload);
				} else {
					// Если еще нет двух элементов, просто добавляем новый
					state.themes_ind.push(payload);
				}
			}
		},
		clearThemesInd: (state, { payload }) => {
			state.themes_ind = [];
		},
		toggleInfo: (state, { payload }) => {
			state.infoAboutPost = !state.infoAboutPost;
		},
		addIndex: (state, { payload }) => {
			console.log('in redux');
			return { ...state, index: payload };
		},
		addNameIndexFile: (state, { payload }) => {
			return { ...state, name_index_file: payload };
		},
		addMinDate: (state, { payload }) => {
			console.log('date', payload);
			return { ...state, min_date: payload };
		},
		addMaxDate: (state, { payload }) => {
			return { ...state, max_date: payload };
		},
		addMinRangeDate: (state, { payload }) => {
			console.log('date', payload);
			return { ...state, min_range_date: payload };
		},
		addMaxRangeDate: (state, { payload }) => {
			return { ...state, max_range_date: payload };
		},
		addQueryStr: (state, { payload }) => {
			return { ...state, query_str: payload };
		},
		currentCheckBox: (state, { payload }) => {
			return { ...state, [payload]: !state[payload] };
		},
		addPromt: (state, { payload }) => {
			return { ...state, promt: payload };
		},
		addTextsIds: (state, { payload }) => {
			state.texts.push(payload);
		},
		addAllTextsIds: (state, { payload }) => {
			state.texts = payload.map(item => item.id);
		},
		deleteAllTextsIds: (state, { payload }) => {
			state.texts = [];
		},
		deleteTextsIds: (state, { payload }) => {
			state.texts = state.texts.filter(el => el.id !== payload.id);
		},
	},
});

export const { actions, reducer } = dataForRequest;
