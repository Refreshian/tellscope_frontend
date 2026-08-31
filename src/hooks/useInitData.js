import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from './useActions';

export const useInitData = () => {
	const { json_files_directory: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const { index } = useSelector(state => state.dataForRequest);
	const { addMinDate, addMaxDate } = useActions();

	const allData = Object.values(dataUser).flat();

	useEffect(() => {
		const targetBaseData = allData.filter(el => el.index_number === index);
		if (targetBaseData.length > 0) {
			addMinDate(targetBaseData[0].min_data);
			addMaxDate(targetBaseData[0].max_data);
		}
	}, [dataUser, index]);
};
