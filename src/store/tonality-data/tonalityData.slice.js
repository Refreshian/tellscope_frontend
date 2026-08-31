import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	// tonality_values: { negative_count: 0, positive_count: 0 },
	// tonality_hubs_values: {
	// 	negative_hubs: [],
	// 	positive_hubs: [],
	// },
	// negative_authors_values: [],
	// positive_authors_values: [],
};

export const tonalityData = createSlice({
	name: 'tonalityData',
	initialState,
	reducers: {
		addTonalityData: (state, { payload }) => {
			return payload;
		},
		updateData: (state, { payload }) => {
			return { ...state, ...payload };
		},
	},
});

export const { actions, reducer } = tonalityData;
