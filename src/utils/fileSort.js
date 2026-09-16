/**
 * Порядок файлов в списках отчётов и в папках датасета.
 *
 * Раньше списки шли в том порядке, в котором их отдавал API, — то есть по алфавиту:
 * `2024-05_summary.json` оказывался выше `2024-08_summary.json`, хотя второй файл
 * новее. Свежий отчёт приходилось искать глазами. Здесь собрана вся логика сортировки,
 * чтобы список отчётов и список внутри папки сортировались одинаково.
 */

export const SORT_DATE_DESC = 'date-desc';
export const SORT_DATE_ASC = 'date-asc';
export const SORT_NAME_ASC = 'name-asc';

/** По умолчанию — самое свежее сверху: так новый отчёт виден сразу, без поиска. */
export const DEFAULT_SORT = SORT_DATE_DESC;

export const SORT_OPTIONS = [
	{
		value: SORT_DATE_DESC,
		label: 'Сначала новые',
		title: 'Сначала новые — свежие отчёты сверху',
	},
	{
		value: SORT_DATE_ASC,
		label: 'Сначала старые',
		title: 'Сначала старые — самые давние отчёты сверху',
	},
	{
		value: SORT_NAME_ASC,
		label: 'По имени',
		title: 'По имени — по алфавиту, как отдаёт сервер',
	},
];

/** Общий ключ: выбор переключателя не сбрасывается при переходах между списками. */
export const SORT_STORAGE_KEY = 'tellscope:file-sort';

export const isSortMode = value => SORT_OPTIONS.some(option => option.value === value);

export const readSortMode = () => {
	try {
		const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
		return isSortMode(stored) ? stored : DEFAULT_SORT;
	} catch (e) {
		return DEFAULT_SORT;
	}
};

export const writeSortMode = mode => {
	try {
		window.localStorage.setItem(SORT_STORAGE_KEY, mode);
	} catch (e) {
		/* приватный режим или запрет хранилища — сортировка просто не запомнится */
	}
};

/**
 * Приводит дату файла к миллисекундам.
 *
 * API отчётов отдаёт `modified` готовой ISO-строкой, а список папок датасета — `created`
 * в секундах Unix. Оба варианта должны сортироваться одинаково.
 */
export const timeOf = value => {
	if (value === null || value === undefined || value === '') return NaN;
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || value <= 0) return NaN;
		return value > 1e12 ? value : value * 1000; // > 1e12 — уже миллисекунды
	}
	const parsed = Date.parse(String(value));
	return Number.isNaN(parsed) ? NaN : parsed;
};

const nameOfItem = (item, getName) => String((getName && getName(item)) || '');

/**
 * Сортирует список по выбранному режиму.
 *
 * @param items     список файлов (или чего угодно)
 * @param mode      SORT_DATE_DESC | SORT_DATE_ASC | SORT_NAME_ASC
 * @param getTime   как достать дату из элемента
 * @param getName   как достать имя из элемента
 */
export const sortByMode = (items, mode, getTime, getName) => {
	const list = Array.isArray(items) ? [...items] : [];
	const byName = (a, b) =>
		nameOfItem(a, getName).localeCompare(nameOfItem(b, getName), 'ru', {
			numeric: true, // 2024-05 идёт перед 2024-10, а не наоборот
			sensitivity: 'base',
		});

	if (mode === SORT_NAME_ASC) return list.sort(byName);

	const desc = mode !== SORT_DATE_ASC;

	return list.sort((a, b) => {
		const ta = timeOf(getTime ? getTime(a) : a);
		const tb = timeOf(getTime ? getTime(b) : b);
		const aEmpty = Number.isNaN(ta);
		const bEmpty = Number.isNaN(tb);

		// Файлы без даты не должны «прилипать» к верху — они всегда внизу, между собой по имени.
		if (aEmpty && bEmpty) return byName(a, b);
		if (aEmpty) return 1;
		if (bEmpty) return -1;
		if (ta === tb) return byName(a, b);

		return desc ? tb - ta : ta - tb;
	});
};

/**
 * Сортирует папки.
 *
 * Папка встаёт по своему крайнему файлу: при «сначала новые» — по самому свежему файлу
 * внутри, при «сначала старые» — по самому давнему. Так папка со свежим отчётом
 * поднимается наверх, и её тоже не нужно искать глазами.
 */
export const sortGroupsByMode = (groups, mode, getFiles, getGroupName, getFileTime) => {
	const edge = files => {
		const times = (files || [])
			.map(file => timeOf(getFileTime ? getFileTime(file) : file))
			.filter(time => !Number.isNaN(time));
		if (!times.length) return NaN;
		return mode === SORT_DATE_ASC ? Math.min(...times) : Math.max(...times);
	};

	return sortByMode(
		groups,
		mode,
		group => edge(getFiles ? getFiles(group) : group),
		getGroupName,
	);
};
