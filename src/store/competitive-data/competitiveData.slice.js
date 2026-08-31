import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	first_graph: [],
	second_graph: [],
	third_graph: [],
};

export const competitiveData = createSlice({
	name: 'competitiveData',
	initialState,
	reducers: {
		addCompetitiveData: (state, { payload }) => {
			return { ...state, ...payload };
		},
	},
});

export const { actions, reducer } = competitiveData;
