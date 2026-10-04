export const tonalityButtons = [
	{
		id: 0,
		isCount: true,
		title: 'Негативные упоминания',
	},
	{
		id: 1,
		isCount: true,
		title: 'Позитивные упоминания',
	},
	{
		id: 2,
		isCount: false,
		title: 'Тональность авторов',
	},
];

export const informationButtons = [
	{
		id: 0,
		isCount: false,
		title: 'Граф. распространения информации',
	},
	{
		id: 1,
		isCount: false,
		title: 'Динамика распространения',
	},
	{
		id: 2,
		isCount: false,
		title: 'Динамика по авторам',
	},
];

export const mediaButtons = [
	{
		id: 0,
		isCount: false,
		title: 'Рейтинг тональности в СМИ',
	},
	{
		id: 1,
		isCount: false,
		title: 'Динамика в СМИ',
	},
];

export const voiceButtons = [
	{
		id: 0,
		isCount: false,
		title: 'Источники',
	},
	{
		id: 1,
		isCount: false,
		title: 'Тип упоминаний',
	},
];

export const competitiveButtons = [
	{
		id: 0,
		isCount: false,
		title: 'Динамика сообщений',
	},
	{
		id: 1,
		isCount: false,
		title: 'Сравнение в СМИ и Соцмедиа',
	},
	{
		id: 2,
		isCount: false,
		title: 'Рейтинг СМИ и Соцмедиа в динамике',
	},
];

/* Названия вкладок экрана «Наборы данных». Это ключ активной вкладки — по нему
   сравнивают DataSet, Folder, PopupDelete и страница набора, поэтому строки живут
   в одном месте и не расходятся при переименовании. */
export const DATA_TAB = 'Данные';
export const REPORTS_TAB = 'Отчёты';
export const AI_STATUS_TAB = 'Статус расчета данных';

export const dataSetButtons = [
	{
		id: 0,
		isCount: false,
		title: DATA_TAB,
	},
	{
		id: 1,
		isCount: false,
		title: REPORTS_TAB,
	},
	{
		id: 2,
		isCount: false,
		title: AI_STATUS_TAB,
	},
];

/* Вкладки данных и отчётов идут рядом: это одно — что загружено и что из этого собрано.
   Статус расчётов вынесен отдельно: это работа ИИ по данным, а не ещё один список файлов. */
export const dataSetMainButtons = dataSetButtons.filter(
	button => button.title !== AI_STATUS_TAB,
);

export const analysisOfThemesButtons = [
	{
		id: 0,
		isCount: false,
		title: 'Кластеризация на тематики',
	},
	{
		id: 1,
		isCount: false,
		title: 'Выявленные темы',
	},
	{
		id: 2,
		isCount: false,
		title: 'Анализ тематик',
	},
];
