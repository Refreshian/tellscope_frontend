export const INTRO_SLIDES = {
	'data-set': {
		title: 'Наборы данных и Brand Analytics',
		video: '/videos/intro-data-set.mp4',
		poster: '/intro/data-set-root.png',
		slides: [
			{ img: '/intro/data-set-root.png', caption: 'Здесь лежат ваши папки-наборы данных. Нажмите «Brand Analytics: доступно тем…», чтобы указать аккаунт BA и посмотреть доступные темы.' },
			{ img: '/intro/data-set-ba-open.png', caption: 'Внутри — аккаунт BA и актуальные темы (кнопка «Обновить»).' },
			{ img: '/intro/data-set-folder.png', caption: 'В папке: период данных и время получения у файлов, загрузка и импорт из Brand Analytics.' },
		],
	},
	'user-tonality': {
		title: 'Тональный ландшафт',
		video: '/videos/intro-tonality.mp4',
		poster: '/intro/tonality.png',
		slides: [
			{ img: '/intro/tonality.png', caption: 'Выберите набор данных слева — появятся графики тональности, динамика и источники.' },
		],
	},
	admin: {
		title: 'Администрирование',
		video: '/videos/intro-admin.mp4',
		poster: '/intro/admin.png',
		slides: [
			{ img: '/intro/admin.png', caption: 'Создание пользователей, доступы к папкам и управление аккаунтами.' },
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
