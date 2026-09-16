import { useEffect, useState } from 'react';

import {
	DEFAULT_SORT,
	SORT_STORAGE_KEY,
	readSortMode,
	writeSortMode,
} from '@/utils/fileSort';

/**
 * Порядок файлов с запоминанием выбора.
 *
 * Выбор хранится в localStorage, поэтому переключатель в списке отчётов и переключатель
 * внутри папки датасета показывают одно состояние, и выбор не сбрасывается при переходах.
 * Первое значение читается синхронно (`useState(readSortMode)`), чтобы список не успел
 * мигнуть одним порядком и перестроиться в другой.
 */
export const useFileSort = () => {
	const [sortMode, setSortMode] = useState(readSortMode);

	useEffect(() => {
		writeSortMode(sortMode);
	}, [sortMode]);

	// Синхронизация с другими вкладками браузера: переключили в одной — применилось в другой.
	useEffect(() => {
		const onStorage = event => {
			if (event.key && event.key !== SORT_STORAGE_KEY) return;
			const next = readSortMode();
			setSortMode(current => (current === next ? current : next));
		};

		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	return [sortMode || DEFAULT_SORT, setSortMode];
};
