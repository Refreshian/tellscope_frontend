import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	// data: {},
	data: {
		second_graph_data: [],
		tonality: {},
	},
};

export const voiceData = createSlice({
	name: 'voiceData',
	initialState,
	reducers: {
		addVoiceData: (state, { payload }) => {
			state.data = payload;
		},
	},
});

export const { actions, reducer } = voiceData;



// import { createSlice } from '@reduxjs/toolkit';

// export const voiceDataSlice = createSlice({
//   name: 'voiceData',
//   initialState: {
//     data: [],
//   },
//   reducers: {
//     setVoiceData: (state, action) => {
//       // action.payload = массив [{name, tonality, sunkey_data}]
//       state.data = Array.isArray(action.payload) ? action.payload : [action.payload];
//     },
//   },
// });

// export const { setVoiceData } = voiceDataSlice.actions;
// export default voiceDataSlice.reducer;