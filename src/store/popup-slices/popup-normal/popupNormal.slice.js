import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	isPopup: false,
	description: '',
	link: '',
	time: '',
};

export const popupNormal = createSlice({
	name: 'popupNormal',
	initialState,
	reducers: {
		toggle_popupNormal: (state, { payload }) => {
			state.isPopup = !state.isPopup;
		},
		default_popupNormal: (state, { payload }) => {
			state.isPopup = false;
		},
		addText_popupNormal: (state, { payload }) => {
			state.description = payload.description;
			state.link = payload.link;
			state.time = payload.time;
		},
	},
});

export const { actions, reducer } = popupNormal;
