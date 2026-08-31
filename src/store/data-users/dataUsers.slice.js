import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	user_id: '',
	json_files_directory: {},
	bertopic_files_directory: {},
	projector_files_directory: {},
	csv_files_directory: {},
};

export const dataUsersSlice = createSlice({
	name: 'dataUsersSlice',
	initialState,
	reducers: {
        // ... ваши существующие редьюсеры ...
		addData: (state, { payload }) => {
			state.user_id = payload.user_id;
			state.json_files_directory = payload.json_files_directory;
			state.projector_files_directory = payload.projector_files_directory;
			state.bertopic_files_directory = payload.bertopic_files_directory;
			state.csv_files_directory = payload.csv_files_directory || {};
		},
		createFolderJson: (state, { payload }) => {
			state.json_files_directory[payload] = [];
		},
		addNewFileJson: (state, { payload }) => {
			state.json_files_directory[payload.name_folder].push(payload.name_file);
		},
        // ✅ ДОБАВЬТЕ ЭТОТ МЕТОД:
        clearData: () => {
            return initialState;
        }
	},
});

export const { actions, reducer } = dataUsersSlice;