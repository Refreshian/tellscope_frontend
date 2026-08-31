import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	aiTesting: [],
	post: {
		system_prompt: 'Ты дружелюбный ассистент для разметки текстов',
		text_prompt:
			'Какая тематика у этого текста? Ответь на русском языке в 1 предложение',
		texts: [],
	},
	// categories: {},
	idProgressBar: null,
	stateLoad: null,
	viewTable: null,
	isViewPromptPopup: false,
	progress_load: 0,
	statusBarStart: false,
	finalStatus: false,
	index_doc: null,
	isOpenSaveData: false,
};

export const aiData = createSlice({
	name: 'aiData',
	initialState,
	reducers: {
		addIndexDoc_Ai: (state, { payload }) => {
			state.index_doc = payload;
		},
		toggleFinalStatus: (state, { payload }) => {
			state.finalStatus = payload;
		},
		toggleBarStart: (state, { payload }) => {
			state.statusBarStart = payload;
		},
		setIsOpenSaveData: (state, { payload }) => {
			state.isOpenSaveData = payload;
		},
		setProgressLoad: (state, { payload }) => {
			state.progress_load = payload;
		},
		setSystemPrompt: (state, { payload }) => {
			state.post.system_prompt = payload;
		},
		setTextPrompt: (state, { payload }) => {
			state.post.text_prompt = payload;
		},
		toggleIsViewPromptPopup: (state, { payload }) => {
			state.isViewPromptPopup = payload;
		},
		addViewTable_aiData: (state, { payload }) => {
			state.viewTable = payload;
		},
		addStateLoad_aiData: (state, { payload }) => {
			console.log('in redux');
			state.stateLoad = payload.toString();
		},
		addIdProgressBar_aiData: (state, { payload }) => {
			state.idProgressBar = payload;
		},
		addAiTesting_aiData: (state, { payload }) => {
			state.aiTesting = payload;
		},
		addAiDataPOST_aiData: (state, { payload }) => {
			state.post = payload;
		},

		// addObject_aiData: (state, { payload }) => {
		// 	state.categories[payload.text].push(payload.data);
		// },
		// addCategories_aiData: (state, { payload }) => {
		// 	state.categories[payload] = [];
		// },
		// updateCategoryArray_aiData: (state, { payload }) => {
		// 	const { oldName, newName, newArray } = payload;

		// 	if (state.categories[oldName]) {
		// 		// Создаем новую запись с новым именем и данными
		// 		state.categories[newName] = newArray;
		// 		// Удаляем старую запись
		// 		delete state.categories[oldName];
		// 	} else {
		// 		console.warn(`Category with key "${oldName}" not found.`);
		// 	}
		// },
		// deleteCategoryArray_aiData: (state, { payload }) => {
		// 	const updatedCategories = { ...state.categories };
		// 	for (const key in updatedCategories) {
		// 		if (updatedCategories.hasOwnProperty(key) && key === payload) {
		// 			delete updatedCategories[key];
		// 			break; // Прерываем цикл после первого совпадения
		// 		}
		// 	}
		// 	state.categories = updatedCategories;
		// },
	},
});

export const { actions, reducer } = aiData;
