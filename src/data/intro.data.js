export const INTRO_SLIDES = {
	'data-set': {
		title: 'Наборы данных и Brand Analytics',
		slides: [
			{
				img: '/intro/data-set-root.png',
				caption: 'Раздел «Наборы данных»: папки-датасеты и импорт Brand Analytics.',
				marks: [{ x: 52.8, y: 15.4, text: 'Раскрыть блок тем BA' }],
			},
			{
				img: '/intro/data-set-ba-open.png',
				caption: 'Внутри блока: аккаунт BA, актуальные темы и кнопка «Обновить».',
				marks: [
					{ x: 47, y: 24.3, text: 'Логин BA и пароль' },
					{ x: 74, y: 15.5, text: '«Обновить» темы' },
				],
			},
			{
				img: '/intro/data-set-panel.png',
				caption: 'В папке темы — файлы с периодом и временем получения. «Загрузить из Brand Analytics» открывает выбор темы и периода.',
				marks: [
					{ x: 71.5, y: 21.8, text: 'Нажмите здесь' },
					{ x: 73, y: 32.4, text: 'Период и «Получить данные»' },
				],
			},
		],
	},
	'user-tonality': {
		title: 'Тональный ландшафт',
		slides: [
			{
				img: '/intro/tonality.png',
				caption: '«Тональный ландшафт»: выберите набор данных слева — появятся графики тональности, динамика и источники.',
				marks: [],
			},
		],
	},
	admin: {
		title: 'Администрирование',
		slides: [
			{
				img: '/intro/admin.png',
				caption: 'Пользователи, доступы к папкам и действия с аккаунтами.',
				marks: [
					{ x: 56.6, y: 39.4, text: '«Сделать админом»' },
					{ x: 86, y: 39.4, text: '«Удалить аккаунт»' },
				],
			},
		],
	},
};

export const getIntroForPath = p => {
	if (!p) return null;
	if (p.startsWith('/data-set')) return INTRO_SLIDES['data-set'];
	if (p === '/admin') return INTRO_SLIDES.admin;
	if (p === '/user-tonality') return INTRO_SLIDES['user-tonality'];
	return null;
};
