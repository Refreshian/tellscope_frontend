import Auth from '@/components/screens/auth/Auth';
import Clustering from '@/components/screens/clustering/Clustering';
import Competitive from '@/components/screens/competitive/Competitive';
import DataSetPage from '@/components/screens/data-set-page/DataSetPage';
import Faq from '@/components/screens/faq/Faq';
import Home from '@/components/screens/home/Home';
import Information from '@/components/screens/information/Information';
import MediaRating from '@/components/screens/media-rating/MediaRating';
import AiAnalyticsPage from '@/components/screens/tables/ai-analytics-page/AiAnalyticsPage';
import UserTonality from '@/components/screens/user-tonality/UserTonality';
import VoiceOfCustomer from '@/components/screens/voice-of-customer/VoiceOfCustomer';

import AnalysisOfThemesPage from '../components/screens/tables/ai-analytics-page/analysis-of-themes/AnalysisOfThemesPage';

export const routes = [
	{
		path: '/',
		component: Auth,
		isAuth: false,
	},
	{
		path: '/home',
		component: Home,
		isAuth: true,
	},
	{
		path: '/user-tonality',
		component: UserTonality,
		isAuth: true,
	},
	{
		path: '/information-graf',
		component: Information,
		isAuth: true,
	},
	{
		path: '/media-rating',
		component: MediaRating,
		isAuth: true,
	},
	{
		path: '/voice-of-customer',
		component: VoiceOfCustomer,
		isAuth: true,
	},
	{
		path: '/competitors',
		component: Competitive,
		isAuth: true,
	},
	{
		path: '/data-set',
		component: DataSetPage,
		isAuth: true,
	},
	{
		path: '/data-set/:id',
		component: DataSetPage,
		isAuth: true,
	},
	{
		path: '/data-set/processed/:id',
		component: DataSetPage,
		isAuth: true,
	},
	{
		path: '/ai-analytics',
		component: AiAnalyticsPage,
		isAuth: true,
	},
	{
		path: '/ai-analytics/analysis-of-themes',
		component: AnalysisOfThemesPage,
		isAuth: true,
	},
	{
		path: '/clustering',
		component: Clustering,
		isAuth: true,
	},
	{
		path: '/faq',
		component: Faq,
		isAuth: true,
	},
];
