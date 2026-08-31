import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

export const mediaData = createSlice({
	name: 'mediaData',
	initialState,
	reducers: {
		addMediaData: (state, { payload }) => {
			return payload;
		},
	},
});

export const { actions, reducer } = mediaData;
