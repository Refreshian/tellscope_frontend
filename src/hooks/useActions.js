import { bindActionCreators } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { actions as aiDataAction } from '../store/ai-data/aiData.slice';
import { actions as booleanValuesAction } from '../store/boolean-values/booleanValues.slice';
import { actions as dataForRequestAction } from '../store/data-for-request/dataForRequest.slice';
import { actions as dataUsersAction } from '../store/data-users/dataUsers.slice';
import { actions as folderTargetAction } from '../store/folder-target/folderTarget.slice';
import { actions as popupDeleteAction } from '../store/popup-slices/popup-delete/popupDelete.slice';
import { actions as popupInFolderAction } from '../store/popup-slices/popup-in-folder/popupInFolder.slice';
import { actions as popupNormalAction } from '../store/popup-slices/popup-normal/popupNormal.slice';
import { actions as topicAnalysisDataAction } from '../store/topic-analysis-data/topicAnalysisData.slice';

const rootActions = {
	...popupNormalAction,
	...aiDataAction,
	...topicAnalysisDataAction,
	...dataForRequestAction,
	...booleanValuesAction,
	...dataUsersAction,
	...folderTargetAction,
	...popupInFolderAction,
	...popupDeleteAction,
};

export const useActions = () => {
	const dispatch = useDispatch();

	return useMemo(() => bindActionCreators(rootActions, dispatch), [dispatch]);
};
