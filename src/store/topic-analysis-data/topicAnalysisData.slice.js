import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	values: [],
	categories: {},
};

export const topicAnalysisData = createSlice({
	name: 'topicAnalysisData',
	initialState,
	reducers: {
		addThemesData_topicAnalysisData: (state, { payload }) => {
			state.values = payload;
		},
		addCategories_topicAnalysisData: (state, { payload }) => {
			state.categories[payload] = [];
		},
		addObject_topicAnalysisData: (state, { payload }) => {
			state.categories[payload.text].push(payload.data);
		},
		updateCategoryArray_topicAnalysisData: (state, { payload }) => {
			const { oldName, newName, newArray } = payload;

			if (state.categories[oldName]) {
				// Создаем новую запись с новым именем и данными
				state.categories[newName] = newArray;
				// Удаляем старую запись
				delete state.categories[oldName];
			} else {
				console.warn(`Category with key "${oldName}" not found.`);
			}
		},
		deleteCategoryArray_topicAnalysisData: (state, { payload }) => {
			const updatedCategories = { ...state.categories };
			for (const key in updatedCategories) {
				if (updatedCategories.hasOwnProperty(key) && key === payload) {
					delete updatedCategories[key];
					break; // Прерываем цикл после первого совпадения
				}
			}
			state.categories = updatedCategories;
		},
	},
});

export const { actions, reducer } = topicAnalysisData;
