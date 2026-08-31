import React, {
	Suspense,
	useCallback,
	useEffect,
	useState,
	useMemo
  } from 'react';
  import { useSelector } from 'react-redux';
  import { useLocation } from 'react-router-dom';
  import Slider from 'rc-slider';
  import 'rc-slider/assets/index.css';
  
  import Content from '@/components/content/Content';
  import BeforeSearch from '@/components/content/before-search/BeforeSearch';
  import CompetitiveGraphs from '@/components/content/graphs/competitive-graphs/CompetitiveGraphs';
  import Layout from '@/components/layout/Layout';
  import BackgroundLoader from '@/components/loading/background-loader/BackgroundLoader';
  import Loader from '@/components/loading/loader/Loader';
  import Button from '@/components/ui/button/Button';
  import CustomCalendar from '@/components/ui/custom-calendar/CustomCalendar';
  import DataForSearch from '@/components/ui/data-for-search/DataForSearch';
  import LeftMenu from '@/components/ui/left-menu/LeftMenu';
  import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
  
  import { useActions } from '@/hooks/useActions';
  import { useAddBaseAndDate } from '@/hooks/useAddBaseAndDate';
  import { useCheckAuth } from '../../../hooks/useCheckAuth';
  import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
  } from '../../../services/other.service';
  import NoDataRequest from '../../no-data-request/NoDataRequest';
  
  import styles from './Competitive.module.scss';
  import { useLazyCompetitiveGraphQuery } from '@/services/getGraph.service';
  
  const Competitive = () => {
	useCheckAuth();
  
	const { pathname } = useLocation();
	const { addData, addIndex, addMinDate, addMaxDate, addThemesInd } =
	  useActions();
	const { active_menu } = useSelector(store => store.booleanValues);
	const dataForRequest = useSelector(state => state.dataForRequest);
	const { json_files_directory: dataUser } = useSelector(
	  store => store.dataUsersSlice,
	);
  
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
  
	useEffect(() => {
	  const arrayData =
		dataUser && Object.keys(dataUser).length > 0 ? dataUser : {};
  
	  if (arrayData && Object.keys(arrayData).length > 0) {
		const flatValues = Object.values(arrayData).flat();
  
		if (flatValues.length > 0) {
		  addThemesInd(flatValues[0].index_number);
		  addThemesInd(flatValues[1].index_number);
		}
	  }
	}, [dataUser]);
  
	const [
	  trigger_competitive,
	  {
		data: data_competitive,
		isLoading: isLoading_competitive,
		isSuccess: isSuccess_competitive,
		isError: isError_competitive,
		error: error_competitive,
	  },
	] = useLazyCompetitiveGraphQuery();
  
	const getCompetitiveData = useCallback(() => {
	  trigger_competitive(dataForRequest);
	}, [dataForRequest]);
  
	const [isNoData, setIsNoData] = useState(false);
	useEffect(() => {
	  if (isError_competitive) {
		setIsNoData(true);
		const timer = setTimeout(() => setIsNoData(false), 5000);
		return () => clearTimeout(timer);
	  }
	}, [isError_competitive]);
  
	// Состояния для ползунков фильтрации
	const [audienceRange, setAudienceRange] = useState([0, 10000]);
	const [repostsRange, setRepostsRange] = useState([0, 10]);
	const [erRange, setErRange] = useState([0, 10]);
	const [viewsCountRange, setViewsCountRange] = useState([0, 10000]);
  
	// Установка максимальных значений для фильтров по полученным данным
	useEffect(() => {
	  if (data_competitive && data_competitive.values && data_competitive.values.length > 0) {
		const maxAudience = Math.max(...data_competitive.values.map(
		  item => Number(item.author.audienceCount) || 0
		));
		const maxReposts = Math.max(...data_competitive.values.map(
		  item => item.reposts ? item.reposts.length : 0
		));
		const maxER = Math.max(...data_competitive.values.map(
		  item => Number(item.author.er) || 0
		));
		const maxViews = Math.max(...data_competitive.values.map(
		  item => Number(item.author.viewsCount) || 0
		));
		setAudienceRange([0, Math.ceil(maxAudience * 1.1) || 10]);
		setRepostsRange([0, Math.ceil(maxReposts * 1.1) || 10]);
		setErRange([0, Math.ceil(maxER * 1.1) || 10]);
		setViewsCountRange([0, Math.ceil(maxViews * 1.1) || 10]);
	  }
	}, [data_competitive]);
  
	const [initOnce, setInitOnce] = useState(false);
  
	// Для инициализации фильтров при первом получении данных
	useEffect(() => {
	  if (
		data_competitive &&
		data_competitive.values &&
		data_competitive.values.length > 0 &&
		!initOnce
	  ) {
		const maxAudience = Math.max(...data_competitive.values.map(item => Number(item.author.audienceCount) || 0));
		const maxReposts = Math.max(...data_competitive.values.map(item => (item.reposts ? item.reposts.length : 0)));
		const maxER = Math.max(...data_competitive.values.map(item => Number(item.author.er) || 0));
		const maxViews = Math.max(...data_competitive.values.map(item => Number(item.author.viewsCount) || 0));
		setAudienceRange([0, Math.ceil(maxAudience * 1.1) || 10]);
		setRepostsRange([0, Math.ceil(maxReposts * 1.1) || 10]);
		setErRange([0, Math.ceil(maxER * 1.1) || 10]);
		setViewsCountRange([0, Math.ceil(maxViews * 1.1) || 10]);
		setInitOnce(true);
	  }
	}, [data_competitive, initOnce]);
  
	// Фильтрация данных
	const filteredData = useMemo(() => {
	  if (!data_competitive || !data_competitive.values)
		return null;
  
	  const passesFilter = (item) => {
		const engagementRate = Number(item.er) || 0;
		const views = Number(item.viewsCount) || 0;
		const audience = Number(item.audienceCount) || 0;
		const [minER, maxER] = erRange;
		const [minViews, maxViews] = viewsCountRange;
		const [minAudience, maxAudience] = audienceRange;
		return engagementRate >= minER &&
		  engagementRate <= maxER &&
		  views >= minViews &&
		  views <= maxViews &&
		  audience >= minAudience &&
		  audience <= maxAudience;
	  };
  
	  const filteredValues = data_competitive.values.map(item => {
		const mainPassesFilter = passesFilter(item.author);
		if (!mainPassesFilter && item.reposts && item.reposts.length > 0) {
		  const filteredReposts = item.reposts.filter(repost => passesFilter(repost));
		  if (filteredReposts.length > 0) {
			return { ...item, reposts: filteredReposts };
		  }
		  return null;
		}
		if (mainPassesFilter) {
		  const filteredReposts = item.reposts ? item.reposts.filter(passesFilter) : [];
		  return { ...item, reposts: filteredReposts };
		}
		return null;
	  }).filter(Boolean);
  
	  return { ...data_competitive, values: filteredValues };
	}, [data_competitive, erRange, audienceRange, viewsCountRange, repostsRange]);

	useEffect(() => {
		if (data_competitive) {
		  console.log('data_competitive:', data_competitive);
		}
	  }, [data_competitive]);
	  
  
	return (
	  <Layout>
		{(isLoading || isLoading_competitive) && (
		  <>
			<BackgroundLoader />
			<Loader />
		  </>
		)}
		{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
		<Content>
		  <div
			className={styles.block__pageName}
			style={isSuccess_competitive ? {} : { alignSelf: 'center' }}
		  >
			{isSuccess_competitive ? (
			  <h3 className={styles.pageName__title}>Конкуренты</h3>
			) : (
			  <BeforeSearch
				title='Конкуренты'
				link='https://tsdoc.headsmade.com/en/competitors'
			  />
			)}
		  </div>
		  <div
			className={styles.block__configureSearch}
			style={isSuccess_competitive ? {} : { alignSelf: 'center' }}
		  >
			<DataForSearch multi={true} />
			<CustomCalendar multi={true} />
			<Button
			  style={{
				width: 'calc(220/1440*100vw)',
				height: 'calc(56/1440*100vw)',
			  }}
			  onClick={getCompetitiveData}
			>
			  Запуск
			</Button>
		  </div>
		  {isNoData && <NoDataRequest />}
		  {!isNoData && isSuccess_competitive && (
			<>
<div className={styles.slidersContainer}>
  <div className={styles.sliderCol}>
    <div className={styles.sliderLabel}>
      ER: {erRange[0]} - {erRange[1]}
    </div>
    <Slider
      range
      min={0}
      max={10}
      value={erRange}
      onChange={setErRange}
      step={0.1}
    />
  </div>
  <div className={styles.sliderCol}>
    <div className={styles.sliderLabel}>
      Аудитория: {audienceRange[0]} - {audienceRange[1]}
    </div>
    <Slider
      range
      min={0}
      max={Math.max(audienceRange[1], 10000)}
      value={audienceRange}
      onChange={setAudienceRange}
      step={100}
    />
  </div>
  <div className={styles.sliderCol}>
    <div className={styles.sliderLabel}>
      Просмотры: {viewsCountRange[0]} - {viewsCountRange[1]}
    </div>
    <Slider
      range
      min={0}
      max={Math.max(viewsCountRange[1], 10000)}
      value={viewsCountRange}
      onChange={setViewsCountRange}
      step={100}
    />
  </div>
  <div className={styles.sliderCol}>
    <div className={styles.sliderLabel}>
      Репосты: {repostsRange[0]} - {repostsRange[1]}
    </div>
    <Slider
      range
      min={0}
      max={Math.max(repostsRange[1], 10)}
      value={repostsRange}
      onChange={setRepostsRange}
      step={1}
    />
  </div>
</div>
			  <Suspense fallback={<Loader />}>
				<CompetitiveGraphs data={filteredData || data_competitive} />
			  </Suspense>
			</>
		  )}
		</Content>
	  </Layout>
	);
  };
  
  export default Competitive;