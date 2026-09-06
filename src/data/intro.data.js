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
			{ img: '/intro/tonality.png', caption: 'Выберите набор данных слева — появятся графики тональности, динамика и источники.', marks: [] },
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
			{ img: '/intro/information-graf.png', caption: 'Выберите тему и период — строится граф источников и связей.', marks: [{ x: 25.2, y: 55.1, text: 'Выберите тему' }, { x: 80.1, y: 55.1, text: '«Запуск»', anchor: 'below' }] },
		],
	},
	'media-rating': {
		title: 'СМИ / Media Rating',
		slides: [
			{ img: '/intro/media-rating.png', caption: 'Выберите тему и период — появятся рейтинги СМИ и соцмедиа.', marks: [{ x: 36.5, y: 57.7, text: 'Выберите тему' }, { x: 66.7, y: 57.7, text: '«Запуск»', anchor: 'below' }] },
		],
	},
	'voice-of-customer': {
		title: 'Голос клиента',
		slides: [
			{ img: '/intro/voice-of-customer.png', caption: 'Выберите тему и период — появятся инсайты и тона голоса клиента.', marks: [{ x: 24.5, y: 58.4, text: 'Выберите тему' }, { x: 80.3, y: 58.4, text: '«Запуск»', anchor: 'below' }] },
		],
	},
	'ai-analytics': {
		title: 'ИИ Анализ',
		slides: [
			{ img: '/intro/ai-analytics.png', caption: 'ИИ Анализ: выберите тему, при необходимости период, и запустите. Есть готовые сценарии и примеры запросов.', marks: [{ x: 26.4, y: 61.7, text: 'Выберите тему' }, { x: 76.7, y: 61.7, text: '«Запуск»', anchor: 'below' }, { x: 63.5, y: 67, text: 'Примеры запросов', anchor: 'below' }] },
		],
	},
	competitive: {
		title: 'Конкуренты',
		slides: [
			{ img: '/intro/competitive.png', caption: 'Выберите период и запустите — сравнение с конкурентами.', marks: [{ x: 46.1, y: 56.4, text: 'Период' }, { x: 63.7, y: 57.7, text: '«Запуск»', anchor: 'below' }] },
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
