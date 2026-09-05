import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import Layout from '@/components/layout/Layout';
import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
import Loader from '@/components/loading/loader/Loader';
import Button from '@/components/ui/button/Button';
import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useActions } from '../../../../hooks/useActions';
import { useAddBaseAndDate } from '../../../../hooks/useAddBaseAndDate';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../../services/other.service';
import { useLazyAiAnalyticsGETQuery } from '../../../../services/tables.service';
import AiAnalytics from '../../../content/tables/ai-analytics/AiAnalytics';
import NoDataRequest from '../../../no-data-request/NoDataRequest';
import PopupAi from '../../../popups/popup-ai/PopupAi';
import PopupNormal from '../../../popups/popup-normal/PopupNormal';
import Input from '../../../ui/fields/input/Input';
import QueryStringHelp from '../../../ui/query-string-help/QueryStringHelp';

import styles from './AiAnalyticsPage.module.scss';

const AiAnalyticsPage = () => {


	const nav = useNavigate();
	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);
	const { json_files_directory: dataUser } = useSelector(
		store => store.dataUsersSlice,
	);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { isViewPromptPopup, statusBarStart } = useSelector(
		state => state.aiData,
	);
	const { isPopup, description, link, time } = useSelector(
		state => state.popupNormal,
	);
	const {
		addData,
		addIndex,
		addMinDate,
		addMaxDate,
		addPromt,
		default_popupNormal,
		addQueryStr,
		setIsOpenSaveData,
	} = useActions();

	const { data: data_getUserId, isSuccess: isSuccess_getUserId } = useGetUserIdQuery();
	const {
		data,
		refetch: refetchUserFolders,
		isFetching: isFetchingUserFolders,
		isSuccess,
	} = useGetUserFoldersQuery(data_getUserId, { skip: !data_getUserId });

	useEffect(() => {
		if (isSuccess_getUserId) refetchUserFolders();
	}, [data_getUserId, isSuccess_getUserId, refetchUserFolders]);

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

	const getAiAnalyticsGET = () => {
		trigger_aiAnalyticsGET(dataForRequest);
	};

	const onChange = e => {
		addQueryStr(e.target.value);
	};

	// if (isError || isError_aiAnalyticsGET) {
	// 	const error_props = isError ? error : error_aiAnalyticsGET;
	// 	return <NotFound error={error_props} />;
	// }

	const [isNoData, setIsNoData] = useState(false);
	useEffect(() => {
		if (isError_aiAnalyticsGET) {
			setIsNoData(true);
			const timer = setTimeout(() => setIsNoData(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [isError_aiAnalyticsGET]);

    useEffect(() => {
        if (statusBarStart) {
            nav('/ai-analytics/analysis-of-themes');
        }
    }, [statusBarStart, nav]);

	{console.log('data_aiAnalyticsGET:', data_aiAnalyticsGET)}

	return (
		<Layout>
			{isLoading_aiAnalyticsGET && (
				<>
					<BackgroundLoader />
					<Loader />
				</>
			)}
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			{isPopup && (
				<>
					<BackgroundLoader
						onClick={() => (isPopup ? default_popupNormal('') : undefined)}
					/>
					<PopupNormal text={description} url={link} time={time} />
				</>
			)}
			{isViewPromptPopup && (
				<>
					<BackgroundLoader />
					<PopupAi />
				</>
			)}
			<Content>
				<div
					className={styles.block__pageName}
					style={isSuccess_aiAnalyticsGET ? {} : { alignSelf: 'center' }}
				>
					{isSuccess_aiAnalyticsGET ? (
						<h3 className={styles.pageName__title}>ИИ Анализ</h3>
					) : (
						<BeforeSearch
							title='ИИ Анализ'
							link='https://tsdoc.headsmade.com/en/analysis-of-themes'
						/>
					)}
				</div>
{!statusBarStart && (
    <div className={styles.info__container}>
        <div className={styles.info__message}>
            <span className={styles.info__icon}>ℹ️</span>
            <span className={styles.info__text}>
                Доступны ранее проанализированные данные:
            </span>
            <Link
                to='/ai-analytics/analysis-of-themes'
                onClick={() => setIsOpenSaveData(true)}
                className={styles.info__link}
            >
                Открыть готовые
            </Link>
        </div>
        {!isNoData && isSuccess_aiAnalyticsGET && data_aiAnalyticsGET?.total_rows > 10000 && (
            <div className={styles.dataLimitWarning}>
                <span>
                    ⚠️ Всего записей: {data_aiAnalyticsGET.total_rows.toLocaleString()}, 
                    показаны первые 10 000
                </span>
            </div>
        )}
    </div>
)}
			{/* Кнопка обновления */}
			{/* <div style={{ textAlign: 'right', margin: '10px 0' }}>
			<Button onClick={refetchUserFolders} disabled={isFetchingUserFolders}>
				{isFetchingUserFolders ? "Обновляем..." : "Обновить данные"}
			</Button>
			</div> */}
				<div
					className={styles.block__configureSearch}
					style={isSuccess_aiAnalyticsGET ? {} : { alignSelf: 'center' }}
				>
					{isSuccess && Object.keys(dataUser ? dataUser : {}).length > 0 && (
						<DataForSearch directory='json' />
					)}
					{isSuccess &&
						dataForRequest.index !== null &&
						Object.keys(dataUser ? dataUser : {}).length > 0 && (
							<CustomCalendar />
						)}
					<Input
						placeholder='Поиск по тексту'
						styleInput={{
							width: 'calc(281/1440*100vw)',
							height: 'calc(56/1440*100vw)',
							borderRadius: 'calc(12/1440*100vw)',
						}}
						styleLabel={{ display: 'none' }}
						onChange={onChange}
						value={
							dataForRequest.query_str === null
								? 'yes'
								: dataForRequest.query_str
						}
					/>
					<QueryStringHelp />
					<Button
						style={{
							width: 'calc(220/1440*100vw)',
							height: 'calc(56/1440*100vw)',
						}}
						onClick={getAiAnalyticsGET}
					>
						Запуск
					</Button>
				</div>
				{isNoData && <NoDataRequest />}

				{!isNoData && isSuccess_aiAnalyticsGET && !statusBarStart && (
					<>
						<AiAnalytics />
					</>
				)}
			</Content>
		</Layout>
	);
};

export default AiAnalyticsPage;
