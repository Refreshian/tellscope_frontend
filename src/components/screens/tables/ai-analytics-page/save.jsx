import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/OldCustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '../../../../hooks/useActions';
import { useAddBaseAndDate } from '../../../../hooks/useAddBaseAndDate';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../../services/other.service';
import {
	useLazyAiAnalyticsGETQuery,
	useLazyAiAnalyticsPOSTQuery,
	useLazyGetIdProgressBarQuery,
} from '../../../../services/tables.service';
import AiAnalytics from '../../../content/tables/ai-analytics/AiAnalytics';
import Input from '../../../ui/fields/input/Input';
import NotFound from '../../not-found/NotFound';

import styles from './save.module.scss';

const AiAnalyticsPage = () => {
	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);
	const { json_files_directory: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { get } = useSelector(state => state.aiData);
	const { addData, addIndex, addMinDate, addMaxDate, addPromt } = useActions();
	const { idProgressBar } = useSelector(state => state.aiData);
	// const { data, isLoading, isSuccess, isError, error } = useGetDataUsersQuery();
	const {
		data: data_getUserId,
		isError: isError_getUserId,
		error: error_getUserId,
		isLoading: isLoading_getUserId,
	} = useGetUserIdQuery();
	const { data, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);

	useAddBaseAndDate(
		dataUser,
		data,
		isSuccess,
		dataForRequest.index,
		addData,
		addMinDate,
		addMaxDate,
		addIndex,
	);

	const [
		trigger_aiAnalyticsGET,
		{
			data: data_aiAnalyticsGET,
			isLoading: isLoading_aiAnalyticsGET,
			isSuccess: isSuccess_aiAnalyticsGET,
			isError: isError_aiAnalyticsGET,
			error: error_aiAnalyticsGET,
		},
	] = useLazyAiAnalyticsGETQuery();
	const [
		trigger_aiAnalyticsPOST,
		{
			data: data_aiAnalyticsPOST,
			isLoading: isLoading_aiAnalyticsPOST,
			isSuccess: isSuccess_aiAnalyticsPOST,
			isError: isError_aiAnalyticsPOST,
			error: error_aiAnalyticsPOST,
		},
	] = useLazyAiAnalyticsPOSTQuery();
	const [
		trigger_getIdProgressBar,
		{
			data: data_getIdProgressBar,
			isLoading: isLoading_getIdProgressBar,
			isSuccess: isSuccess_getIdProgressBar,
			isError: isError_getIdProgressBar,
			error: error_getIdProgressBar,
		},
	] = useLazyGetIdProgressBarQuery();

	const graf = localStorage.getItem('isGraf');

	const onChange_input = e => {
		addPromt(e.target.value);
	};

	const getAiAnalyticsGET = () => {
		trigger_aiAnalyticsGET(dataForRequest);
	};
	const getAiAnalyticsPOST = () => {
		// if (idProgressBar === null) {
		// 	trigger_getIdProgressBar();
		// } else {
		trigger_aiAnalyticsPOST(dataForRequest);
		// }
	};

	if (
		isError_getIdProgressBar ||
		isError ||
		isError_aiAnalyticsPOST ||
		isError_aiAnalyticsGET
	) {
		const error_props = isError
			? error
			: isError_aiAnalyticsPOST
				? error_aiAnalyticsPOST
				: isError_getIdProgressBar
					? error_getIdProgressBar
					: error_aiAnalyticsGET;

		return <NotFound error={error_props} />;
	}

	return (
		<Layout>
			{(isLoading || isLoading_aiAnalyticsGET || isLoading_aiAnalyticsPOST) && (
				<>
					<BackgroundLoader />
					<Loader />
				</>
			)}
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}

			<Content>
				<div
					className={styles.block__pageName}
					style={isSuccess_aiAnalyticsGET ? {} : { alignSelf: 'center' }}
				>
					{isSuccess_aiAnalyticsGET ? (
						<h3 className={styles.pageName__title}>ИИ Анализ</h3>
					) : (
						<BeforeSearch title='ИИ Анализ' />
					)}
				</div>
				<div
					className={styles.block__configureSearch}
					style={isSuccess_aiAnalyticsGET ? {} : { alignSelf: 'center' }}
				>
					{isSuccess && Object.keys(dataUser ? dataUser : {}).length > 0 && (
						<DataForSearch />
					)}
					{isSuccess &&
						dataForRequest.index !== null &&
						Object.keys(dataUser ? dataUser : {}).length > 0 && (
							<CustomCalendar />
						)}
					<Button
						style={{
							width: 'calc(220/1440*100vw)',
							height: 'calc(56/1440*100vw)',
						}}
						onClick={getAiAnalyticsGET}
					>
						Запуск
					</Button>
					{get.length !== 0 && (
						<>
							<Input
								placeholder='Задайте запрос к текстам'
								styleInput={{
									width: 'calc(281/1440*100vw)',
									height: 'calc(55.9/1440*100vw)',
									borderRadius: 'calc(8/1440*100vw)',
								}}
								styleLabel={{ display: 'none' }}
								onChange={onChange_input}
								value={dataForRequest.promt ? dataForRequest.promt : ''}
							/>
							<Button
								style={{
									width: 'calc(220/1440*100vw)',
									height: 'calc(56/1440*100vw)',
								}}
								onClick={() => {
									console.log('я здесь');
									getAiAnalyticsPOST();
								}}
							>
								ИИ анализ
							</Button>
						</>
					)}
				</div>
				{isSuccess_aiAnalyticsGET && <AiAnalytics />}
			</Content>
		</Layout>
	);
};

export default AiAnalyticsPage;
