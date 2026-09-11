export const menuPageData = [
	{
		id: 0,
		title: 'Тональный ландшафт',
		text: 'Тональный ландшафт',
		src: '/images/icons/menu/user_tonality.svg',
		src_active: '/images/icons/menu/user_tonality_active.svg',
		badge: 'ТОН',
		path: '/user-tonality',
	},
	{
		id: 1,
		title: 'Граф информации',
		text: 'Граф информации',
		src: '/images/icons/menu/information_graph.svg',
		src_active: '/images/icons/menu/information_graph_active.svg',
		badge: 'ИНФ',
		path: '/information-graf',
	},
	{
		id: 2,
		title: 'СМИ',
		text: 'Медиа рейтинг',
		src: '/images/icons/menu/media_rating.svg',
		src_active: '/images/icons/menu/media_rating_active.svg',
		badge: 'СМИ',
		path: '/media-rating',
	},
	{
		id: 3,
		title: 'Голос клиента',
		text: 'Голос клиента',
		src: '/images/icons/menu/voice_of_customer.svg',
		src_active: '/images/icons/menu/voice_of_customer_active.svg',
		badge: 'ПРОД',
		path: '/voice-of-customer',
	},
	// {
	// 	id: 4,
	// 	title: 'Конкуренты',
	// 	text: 'Конкуренты',
	// 	src: '/images/icons/menu/competitive_environment.svg',
	// 	src_active: '/images/icons/menu/competitive_environment_active.svg',
	// 	path: '/competitors',
	// },
	// {
	// 	id: 5,
	// 	title: 'Внешние факторы',
	// 	text: 'Внешние факторы',
	// 	src: '/images/icons/menu/external_factors.svg',
	// 	src_active: '/images/icons/menu/external_factors_active.svg',
	// 	path: '/none',
	// },
	// {
	// 	id: 7,
	// 	title: 'Кластеризация авторов',
	// 	text: 'Кластеризация авторов',
	// 	src: '/images/icons/menu/authors_clastarization.svg',
	// 	src_active: '/images/icons/menu/authors_clastarization_active.svg',
	// 	path: '/clustering',
	// },
	// {
	// 	id: 8,
	// 	title: 'Text classification',
	// 	src: '/images/icons/menu/text_classification.svg',
	// 	src_active: '/images/icons/menu/text_classification_active.svg',
	// 	path: '/none',
	// },
	// {
	// 	id: 8,
	// 	title: 'Анализ тематик',
	// 	text: 'Анализ тематик',
	// 	src: '/images/icons/menu/table.svg',
	// 	src_active: '/images/icons/menu/table_active.svg',
	// 	path: '/topic-analysis',
	// },
	{
		id: 9,
		title: 'ИИ анализ',
		text: 'ИИ анализ',
		src: '/images/icons/menu/AI.svg',
		src_active: '/images/icons/menu/AI_active.svg',
		badge: 'ТЕМ',
		path: '/ai-analytics',
		// path: '/none',
	},
    {
        id: 10, // используйте следующий доступный ID
        title: 'Связи авторов',
        text: 'Связи авторов',
        src: '/images/icons/menu/AI.png', // можно использовать существующую иконку или добавить новую
        src_active: '/images/icons/menu/AI.png',
        badge: 'ГРАФ',
        path: '/graph-analysis'
    },
	{
		id: 5, // используйте следующий доступный ID
		text: "ИИ-Бот", // название секции
		src_active: "/images/icons/menu/chad_96011c3ae034462cbe830a422ef9c363.png", // путь к иконке
		src: '/images/icons/menu/chad_96011c3ae034462cbe830a422ef9c363.png', // Путь к иконке (неактивное состояние)
		badge: 'RAG',
		path: '/ai-bot' // маршрут или "/none" если в разработке
	},
	{
		id: 6,
		title: 'Наборы данных',
		text: 'Наборы данных',
		src: '/images/icons/menu/show_data.svg',
		src_active: '/images/icons/menu/show_data_active.svg',
		badge: 'ДАН',
		path: '/data-set',
	},
	{
		id: 11,
		title: 'ОИВ рейтинг',
		text: 'Мосинформ.Рейтинг',
		src: '/images/icons/menu/table.svg',
		src_active: '/images/icons/menu/table_active.svg',
		badge: 'ОИВ',
		path: '/mosinform-rating',
		sidebarOnly: true,
	},
	{
		id: 13,
		title: 'Мои агенты',
		text: 'Мои агенты',
		accent: true,
		badge: 'AI',
		src: '/images/icons/menu/agents.svg',
		src_active: '/images/icons/menu/agents_active.svg',
		path: '/agents',
	},
	{
		id: 12,
		title: 'Агентный режим',
		text: 'Агентный режим',
		accent: true,
		badge: 'AI',
		src: '/images/icons/menu/agent.svg',
		src_active: '/images/icons/menu/agent_active.svg',
		path: '/agent-mode',
	},
	{
		id: 14,
		title: 'Конструктор Dify',
		text: 'Конструктор Dify',
		accent: true,
		sidebarOnly: true,
		badge: 'DIFY',
		src: '/images/icons/menu/AI.svg',
		src_active: '/images/icons/menu/AI_active.svg',
		path: '/dify-constructor',
	},
];

// Пункты про ИИ-агентов выносятся в отдельный акцентный блок меню
export const agentMenuData = menuPageData.filter(item => item.accent);

export const menuSettings = [
	{ 
		id: 0,
		title: 'FAQ',
		src: '/images/icons/menu/FAQ.svg',
		src_active: '/images/icons/menu/faq.svg',
		path: 'http://194.146.113.124:8080',
	},
	{
		id: 1,
		title: 'Свернуть меню',
		src: '/images/icons/menu/change_menu.svg',
		src_active: '/images/icons/menu/change_menu.svg',
	},
	{
		id: 2,
		title: 'Выйти из аккаунта',
		src: '/images/icons/menu/logout.svg',
		src_active: '/images/icons/menu/logout.svg',
	},
];
