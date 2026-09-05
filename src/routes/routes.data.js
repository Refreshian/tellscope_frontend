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
import AIBot from '@/components/content/tables/ai-bot/AIBot';
import ChatLLM from '@/components/screens/ai-test/ChatLLM.jsx';
import GraphAnalysis from "../components/GraphVisualization/GraphAnalysis.jsx";
import SmartAgent from '@/components/screens/smart-agent/SmartAgent';
import MetaphorExamples from '../components/screens/metaphor-examples/MetaphorExamples.jsx';
import Configs from '@/components/screens/configs/Configs';
import MosinformRating from '@/components/screens/mosinform-rating/MosinformRating';
import AdminPage from '@/components/screens/admin/AdminPage';


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
	{
		path: "/ai-bot",
		component: AIBot,
		title: "AI Ассистент"
	}, 
	{
		path: '/chat',
		component: ChatLLM,
		isAuth: true,
	},
	{
		path: '/graph-analysis',
		component: GraphAnalysis,
		isAuth: true,
	},
	{
		path: '/smart-agent',
		component: SmartAgent,
		isAuth: true,
	},
	{
		path: '/lca-examples',
		component: MetaphorExamples,
		isAuth: true,
	},
	{
		path: '/configs',
		component: Configs,
		isAuth: true,
	},
	{
		path: '/mosinform-rating',
		component: MosinformRating,
		isAuth: true,
	},
	{
		path: '/admin',
		component: AdminPage,
		isAuth: true,
	}
];
