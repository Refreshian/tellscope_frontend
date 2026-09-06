export const INTRO_SLIDES = {
	'data-set': {
		title: 'Наборы данных и Brand Analytics',
		slides: [
			{ img: '/intro/data-set-root.png', caption: 'Раздел «Наборы данных»: папки-датасеты и импорт Brand Analytics.', marks: [{ x: 52.8, y: 15.4, text: 'Раскрыть блок тем BA' }] },
			{ img: '/intro/data-set-ba-open.png', caption: 'Внутри блока: аккаунт BA, актуальные темы и кнопка «Обновить».', marks: [{ x: 47, y: 24.3, text: 'Логин BA и пароль', anchor: 'below' }, { x: 74, y: 15.5, text: '«Обновить» темы' }] },
			{ img: '/intro/data-set-panel.png', caption: 'В папке темы — файлы с периодом/временем. «Загрузить из Brand Analytics» открывает выбор темы и периода.', marks: [{ x: 71.5, y: 21.8, text: 'Нажмите здесь' }, { x: 73, y: 32.4, text: 'Период и «Получить данные»', anchor: 'below' }] },
		],
	},
	'user-tonality': {
		title: 'Тональный ландшафт',
		slides: [
			{ img: '/intro/tonality-run-top.png', caption: 'После «Запуск» появляются графики: Негативные и Позитивные упоминания, справа — тональность авторов и счётчики сообщений.', marks: [{ x: 37.8, y: 30.6, text: 'Негативные упоминания' }, { x: 55.2, y: 30.6, text: 'Позитивные упоминания' }, { x: 70.2, y: 30.6, text: 'Тональность авторов' }] },
			{ img: '/intro/tonality-run-top.png', caption: 'Сверху слева — фильтры-ползунки (комментарии, лайки, просмотры, аудитория) и ТОП источников; внизу блока — итоги по негативным сообщениям.', marks: [{ x: 17.7, y: 17.8, text: 'Ползунки-фильтры' }, { x: 52.8, y: 62.8, text: 'Негативных сообщений', anchor: 'below' }] },
		],
	},
	admin: {
		title: 'Администрирование',
		slides: [
			{ img: '/intro/admin.png', caption: 'Пользователи, доступы к папкам и действия с аккаунтами.', marks: [{ x: 56.6, y: 39.4, text: '«Сделать админом»' }, { x: 86, y: 39.4, text: '«Удалить аккаунт»', anchor: 'below' }] },
		],
	},
	'information-graf': {
		title: 'Граф информации',
		slides: [
			{ img: '/intro/information-graf.png', caption: 'Выберите тему и период — строится граф источников и связей.', marks: [{ x: 25.2, y: 55.1, text: 'Выберите тему' }, { x: 80.1, y: 55.1, text: '«Запуск»', anchor: 'below' }] },,
			{ img: '/intro/run-information-graf.png', caption: 'После «Запуск» строится граф: количество текстов и авторов, метрики Аудитория и Просмотры.', marks: [{ x: 60.5, y: 3.1, text: '1102 текста · 315 авторов', anchor: 'below' },{ x: 17.7, y: 21.7, text: 'Аудитория' },{ x: 87.9, y: 21.7, text: 'Просмотры' }] }
		],
	},
	'media-rating': {
		title: 'СМИ / Media Rating',
		slides: [
			{ img: '/intro/media-rating.png', caption: 'Выберите тему и период — появятся рейтинги СМИ и соцмедиа.', marks: [{ x: 36.5, y: 57.7, text: 'Выберите тему' }, { x: 66.7, y: 57.7, text: '«Запуск»', anchor: 'below' }] },,
			{ img: '/intro/run-media-rating.png', caption: 'После «Запуск» — индекс, рейтинг тональности и динамика в СМИ. При отсутствии данных показывается подсказка.', marks: [{ x: 52.8, y: 17.8, text: 'Индекс', anchor: 'below' },{ x: 47.6, y: 30.7, text: 'Рейтинг тональности в СМИ' },{ x: 52.8, y: 63.2, text: 'Подсказка при отсутствии данных', anchor: 'below' }] }
		],
	},
	'voice-of-customer': {
		title: 'Голос клиента',
		slides: [
			{ img: '/intro/voice-of-customer.png', caption: 'Выберите тему и период — появятся инсайты и тона голоса клиента.', marks: [{ x: 24.5, y: 58.4, text: 'Выберите тему' }, { x: 80.3, y: 58.4, text: '«Запуск»', anchor: 'below' }] },,
			{ img: '/intro/run-voice-of-customer.png', caption: 'После «Запуск» — метрики голоса клиента: аудитория, комментарии, просмотры, репосты, лайки и графики.', marks: [{ x: 52.8, y: 3.1, text: 'Голос клиента', anchor: 'below' },{ x: 15.9, y: 22.5, text: 'Аудитория' },{ x: 89.7, y: 22.5, text: 'Лайки' }] }
		],
	},
	'ai-analytics': {
		title: 'ИИ Анализ',
		slides: [
			{ img: '/intro/ai-analytics.png', caption: 'ИИ Анализ: выберите тему, при необходимости период, и запустите. Есть готовые сценарии и примеры запросов.', marks: [{ x: 26.4, y: 61.7, text: 'Выберите тему' }, { x: 76.7, y: 61.7, text: '«Запуск»' }, { x: 63.5, y: 67, text: 'Примеры запросов', anchor: 'below' }] },,
			{ img: '/intro/run-ai-analytics.png', caption: 'ИИ Анализ: «Открыть готовые», «Примеры запросов» и кнопка «Тестировать» для запуска анализа по теме.', marks: [{ x: 50.8, y: 2.7, text: 'Открыть готовые', anchor: 'below' },{ x: 63.5, y: 18.3, text: 'Примеры запросов' },{ x: 86.9, y: 27.7, text: 'Тестировать' }] }
		],
	},
	competitive: {
		title: 'Конкуренты',
		slides: [
			{ img: '/intro/competitive.png', caption: 'Выберите период и запустите — сравнение с конкурентами.', marks: [{ x: 46.1, y: 56.4, text: 'Период' }, { x: 63.7, y: 57.7, text: '«Запуск»', anchor: 'below' }] },,
			{ img: '/intro/run-competitive.png', caption: 'Конкуренты: слайдеры диапазонов (аудитория/просмотры/репосты) и графики динамики, сравнения и рейтинга.', marks: [{ x: 41, y: 22.2, text: 'Диапазон аудитории' },{ x: 33.5, y: 36.3, text: 'Динамика сообщений' }] }
		],
	},
};

export const getIntroForPath = p => {
	if (!p) return null;
	if (p.startsWith('/data-set')) return INTRO_SLIDES['data-set'];
	if (p === '/admin') return INTRO_SLIDES.admin;
	if (p === '/user-tonality') return INTRO_SLIDES['user-tonality'];
	if (p === '/information-graf') return INTRO_SLIDES['information-graf'];
	if (p === '/media-rating') return INTRO_SLIDES['media-rating'];
	if (p === '/voice-of-customer') return INTRO_SLIDES['voice-of-customer'];
	if (p === '/ai-analytics') return INTRO_SLIDES['ai-analytics'];
	if (p === '/competitors') return INTRO_SLIDES.competitive;
	return null;
};
