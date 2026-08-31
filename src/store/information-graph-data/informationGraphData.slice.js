import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	values: [],
	dynamicdata_audience: {},
};

export const informationGraphData = createSlice({
	name: 'informationGraphData',
	initialState,
	reducers: {
		addInformationGraphData: (state, { payload }) => {
			return payload;
		},
		updateInformationGraf: (state, { payload }) => {
			return { ...state, ...payload };
		},
	},
});

export const { actions, reducer } = informationGraphData;
