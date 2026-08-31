import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	active_menu: false,
};

export const booleanValues = createSlice({
	name: 'booleanValues',
	initialState,
	reducers: {
		toggleActiveMenu: (state, { payload }) => {
			state.active_menu = !state.active_menu;
		},
		defaultActiveMenu: (state, { payload }) => {
			state.active_menu = false;
		},
	},
});

export const { actions, reducer } = booleanValues;
