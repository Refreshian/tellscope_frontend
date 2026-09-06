export const INTRO_SLIDES = {
	'data-set': {
		title: 'Наборы данных и Brand Analytics',
		slides: [
			{ img: '/intro/data-set-root.png', caption: 'Здесь лежат ваши папки-наборы данных. Нажмите «Brand Analytics: доступно тем…», чтобы указать аккаунт BA и посмотреть доступные темы.' },
			{ img: '/intro/data-set-folder.png', caption: 'Внутри папки: период данных и время получения у каждого файла, загрузка файлов и импорт из Brand Analytics («Загрузить из Brand Analytics»).' },
		],
	},
	'user-tonality': {
		title: 'Тональный ландшафт',
		slides: [
			{ img: '/intro/tonality.png', caption: 'Выберите набор данных слева — страница построит графики тональности, динамику и разбивку по источникам.' },
		],
	},
	admin: {
		title: 'Администрирование',
		slides: [
			{ img: '/intro/admin.png', caption: 'Здесь администратор создаёт пользователей, выдаёт/снимает доступы к папкам и управляет аккаунтами (активация, роль, пароль, удаление).' },
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
