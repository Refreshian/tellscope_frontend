import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { dataSetService } from '../services/dataSet.service';
import { getGraphService } from '../services/getGraph.service';
import { dataUsersService } from '../services/other.service';
import { tablesService } from '../services/tables.service';
import aiBotApi from '../services/aiBot.service'; // Изменили на default импорт

import { reducer as aiData } from './ai-data/aiData.slice';
import { reducer as booleanValues } from './boolean-values/booleanValues.slice';
import { reducer as competitiveData } from './competitive-data/competitiveData.slice';
import { reducer as dataForRequest } from './data-for-request/dataForRequest.slice';
import { reducer as dataUsersSlice } from './data-users/dataUsers.slice';
import { reducer as folderTarget } from './folder-target/folderTarget.slice';
import { reducer as informationGraphData } from './information-graph-data/informationGraphData.slice';
import { reducer as mediaData } from './media-data/mediaData.slice';
import { reducer as popupDelete } from './popup-slices/popup-delete/popupDelete.slice';
import { reducer as popupInFolder } from './popup-slices/popup-in-folder/popupInFolder.slice';
import { reducer as popupNormal } from './popup-slices/popup-normal/popupNormal.slice';
import { reducer as tonalityData } from './tonality-data/tonalityData.slice';
import { reducer as topicAnalysisData } from './topic-analysis-data/topicAnalysisData.slice';
import { reducer as voiceData } from './voice-data/voiceData.slice';

const reducers = combineReducers({
	dataUsersSlice,
	popupNormal,
	aiData,
	topicAnalysisData,
	popupDelete,
	competitiveData,
	voiceData,
	dataForRequest,
	booleanValues,
	tonalityData,
	informationGraphData,
	mediaData,
	folderTarget,
	popupInFolder,
	[getGraphService.reducerPath]: getGraphService.reducer,
	[dataUsersService.reducerPath]: dataUsersService.reducer,
	[dataSetService.reducerPath]: dataSetService.reducer,
	[tablesService.reducerPath]: tablesService.reducer,
	[aiBotApi.reducerPath]: aiBotApi.reducer,
});

export const store = configureStore({
	reducer: reducers,
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware()
			.concat(getGraphService.middleware)
			.concat(dataUsersService.middleware)
			.concat(dataSetService.middleware)
			.concat(tablesService.middleware)
			.concat(aiBotApi.middleware),
});