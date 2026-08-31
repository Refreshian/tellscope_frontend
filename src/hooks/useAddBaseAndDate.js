import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { convertDataMultiCalendar } from '../utils/editData';

import { useActions } from './useActions';

export const useAddBaseAndDate = (
	dataUser,
	data,
	isSuccess,
	baseData,
	addData,
	addMinDate,
	addMaxDate,
	addIndex,
) => {
	const { pathname } = useLocation();
	// Мемоизация данных для предотвращения лишних вычислений
	const dataUserJson = useMemo(() => JSON.stringify(dataUser), [dataUser]);
	const newDataJson = useMemo(() => (data ? JSON.stringify(data) : ''), [data]);

	const { addThemesInd, addMinRangeDate, addMaxRangeDate } = useActions();
	const dataForRequest = useSelector(state => state.dataForRequest);
	// themes_ind
	console.log(
		'obj1',
		pathname,
		dataUser.test,
		// dataUser?.test[1],
		// convertFromTimestampToRegular(dataUser?.test[1]?.min_data),
		// convertFromTimestampToRegular(dataUser?.test[1]?.max_data),
	);
	console.log(
		'obj2',
		// dataUser?.test[0],
		// convertFromTimestampToRegular(dataUser?.test[0]?.min_data),
		// convertFromTimestampToRegular(dataUser?.test[0]?.max_data),
	);

	// Обновление данных при успешном запросе
	useEffect(() => {
		if (isSuccess && dataUserJson !== newDataJson) {
			addData(data);
		}
	}, [isSuccess, dataUserJson, newDataJson, addData]);

	// Функция для обновления min/max даты
	const updateDates = useCallback(
		targetData => {
			if (targetData && targetData.length > 0) {
				console.log('dsdf', targetData);
				addMinDate(targetData[0].min_data);
				addMaxDate(targetData[0].max_data);
				addMinRangeDate(targetData[0].min_data);
				addMaxRangeDate(targetData[0].max_data);
			}
		},
		[addMinDate, addMaxDate, addMinRangeDate, addMaxRangeDate],
	);

	// Находим массив, содержащий хотя бы один объект
	const foundArray = Object.values(dataUser).find(
		array =>
			Array.isArray(array) &&
			array.some(item => typeof item === 'object' && item !== null),
	);

	const foundTwoArray = Object.values(dataUser).find(
		array =>
			Array.isArray(array) &&
			array.filter(item => typeof item === 'object' && item !== null).length >=
				2,
	);

	const findNewDataFolder = Object.values(dataUser)
		.flat()
		.find(el => el.index_number === baseData);

	useEffect(() => {
		if (foundArray) {
			addIndex(foundArray[0].index_number || 0);
			updateDates([foundArray[0]]);
			if (foundTwoArray && foundTwoArray.length === 2) {
				addThemesInd([
					foundTwoArray[0].index_number,
					foundTwoArray[1].index_number,
				]);
			}
		}
	}, [dataUser]);

	useEffect(() => {
		//HELP: Для установления новой даты при выборе нового файла для запроса
		if (findNewDataFolder) {
			if (pathname === '/competitors') {
				const result = convertDataMultiCalendar(
					dataForRequest.themes_ind[0],
					dataForRequest.themes_ind[1],
					dataUser,
				);
				console.log('result', result);
				if (result.min_data !== 0 && result.max_data !== 0) {
					addMinRangeDate(result.min_data);
					addMaxRangeDate(result.max_data);
					addMinDate(result.min_data);
					addMaxDate(result.max_data);
				} else {
					addMinRangeDate(findNewDataFolder.min_data);
					addMaxRangeDate(findNewDataFolder.max_data);
					addMinDate(findNewDataFolder.min_data);
					addMaxDate(findNewDataFolder.max_data);
				}
			} else {
				addMinRangeDate(findNewDataFolder.min_data);
				addMaxRangeDate(findNewDataFolder.max_data);
				addMinDate(findNewDataFolder.min_data);
				addMaxDate(findNewDataFolder.max_data);
			}
		}
	}, [baseData, dataForRequest.themes_ind]);
};
