import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	allData: {},
	data: {},
	processedData: {},
};

export const folderTarget = createSlice({
	name: 'folderTarget',
	initialState,
	reducers: {
		deleteProcessedDataFolder: (state, { payload }) => {
			const folderIndex = state.processedData.values.findIndex(
				folder => folder.name === payload.name_folder,
			);

			if (folderIndex !== -1) {
				state.processedData.values[folderIndex].values =
					state.processedData.values[folderIndex].values.filter(
						file => file !== payload.name_file,
					);
			}
		},
		deleteProcessedFolder: (state, { payload }) => {
			state.processedData.values = state.processedData.values.filter(
				folder => folder.name !== payload.name_folder,
			);
		},
		addProcessedDataFolder: (state, { payload }) => {
			state.processedData = payload;
		},
		addTargetFolder: (state, { payload }) => {
			state.data = payload;
		},
		addAllDataFolder: (state, { payload }) => {
			state.allData = payload;
		},
		// createFolder: (state, { payload }) => {
		// 	state.allData.values.push({
		// 		name: payload.name,
		// 		values: [],
		// 	});
		// },
		deleteFolder: (state, { payload }) => {
			state.allData.values = state.allData.values.filter(
				folder => folder.name !== payload.name_folder,
			);
		},
		// addNewFile: (state, { payload }) => {
		// 	const folderIndex = state.allData.values.findIndex(
		// 		folder => folder.name === payload.name_folder,
		// 	);

		// 	if (folderIndex !== -1) {
		// 		state.allData.values[folderIndex].values.push(payload.name_file);
		// 	}
		// },
		deleteDataFolder: (state, { payload }) => {
			const folderIndex = state.allData.values.findIndex(
				folder => folder.name === payload.name_folder,
			);

			if (folderIndex !== -1) {
				state.allData.values[folderIndex].values = state.allData.values[
					folderIndex
				].values.filter(file => file !== payload.name_file);
			}
		},
		addNewText: (state, { payload }) => {
			const folderIndex = state.allData.values.findIndex(
				folder => folder.name === payload.name_folder,
			);

			if (folderIndex !== -1) {
				const fileIndex = state.allData.values[folderIndex].values.indexOf(
					payload.name_file,
				);

				if (fileIndex !== -1) {
					state.allData.values[folderIndex].values[fileIndex] = payload.value;
				}
			}

			state.data = { ...state.data };
		},
	},
});

export const { actions, reducer } = folderTarget;
