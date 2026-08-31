import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	isPopupInFolder: false,
	title: '',
	name_file: '',
};

export const popupInFolder = createSlice({
	name: 'popupInFolder',
	initialState,
	reducers: {
		toggle_PopupInFolder: (state, { payload }) => {
			state.isPopupInFolder = !state.isPopupInFolder;
		},
		addText_PopupInFolder: (state, { payload }) => {
			return {
				...state,
				title: payload.title,
				name_file: payload.name_file,
			};
		},
	},
});

export const { actions, reducer } = popupInFolder;
