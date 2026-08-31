import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { analysisOfThemesButtons } from '../../../../data/panel.data';
import { useGetUserIdQuery } from '../../../../services/other.service';
import { useLlmAnalyzeQuery } from '../../../../services/tables.service';
import HtmlRenderer from '../../../html-renderer/HtmlRenderer';
import PanelTargetGraph from '../../../ui/panel-target-graph/PanelTargetGraph';

import styles from './AnalysisOfThemes.module.scss';
import Analysis from './ayalysis/Analysis';
import ThemesIdentified from './themes-identified/ThemesIdentified';

const AnalysisOfThemes = ({ data_llm }) => {
	const [activeButton, setActiveButton] = useState('Кластеризация на тематики');
	const [activeSubcategory, setActiveSubcategory] = useState('Группировка тем');

	const dataForRequest = useSelector(state => state.dataForRequest);
	const { finalStatus } = useSelector(state => state.aiData);

	const { data: data_getUserId } = useGetUserIdQuery();

	const dataRequest = {
		user_id: data_getUserId,
		folder_name: dataForRequest.folder_name_html_file_request,
		file_name: dataForRequest.first_html_file_request || '',
	};

	const {
		// data: data_llm,
		isLoading: isLoading_llm,
		isSuccess: isSuccess_llm,
		refetch,
	} = useLlmAnalyzeQuery(dataRequest);

	useEffect(() => {
		if (finalStatus) refetch();
	}, [finalStatus]);

	const handleClick = useCallback(
		but => {
			setActiveButton(but);
		},
		[activeButton],
	);

	const handleClickSubcategory = useCallback(button => {
		setActiveSubcategory(button);
	}, []);

	const dataForPageHTML =
		activeSubcategory === 'Группировка тем'
			? 'html_content'
			: 'html_content_dataplot';

	return (
		<div className={styles.block__graph}>
			<div className={styles.block__title}>
				<PanelTargetGraph
					handleClick={handleClick}
					dataButtons={analysisOfThemesButtons}
					activeButton={activeButton}
				/>
			</div>
			<div className={styles.block__subcategory}>
				<div
					className={styles.block__radio}
					style={
						activeButton === 'Выявленные темы' ||
						activeButton === 'Анализ тематик'
							? { display: 'none' }
							: {}
					}
				>
					<input
						type='radio'
						className={styles.radio}
						name='Группировка тем' // добавляем одинаковый атрибут name
						checked={activeSubcategory === 'Группировка тем'}
						onChange={() => handleClickSubcategory('Группировка тем')}
					/>
					<p className={styles.text__radio}>Группировка тем</p>
				</div>
				<div
					className={styles.block__radio}
					style={
						activeButton === 'Выявленные темы' ||
						activeButton === 'Анализ тематик'
							? { display: 'none' }
							: {}
					}
				>
					<input
						type='radio'
						className={styles.radio}
						name='Ландшафт тем' // добавляем одинаковый атрибут name
						checked={activeSubcategory === 'Ландшафт тем'}
						onChange={() => handleClickSubcategory('Ландшафт тем')}
					/>
					<p className={styles.text__radio}>Ландшафт тем</p>
				</div>
			</div>
			<div className={styles.container__graph} id='graph-for-download'>
				{activeButton === 'Кластеризация на тематики' ? (
					<HtmlRenderer htmlString={data_llm?.[dataForPageHTML] || ''} />
				) : activeButton === 'Выявленные темы' ? (
					<ThemesIdentified data_llm={data_llm} />
				) : (
					<Analysis data_llm={data_llm} />
				)}
			</div>
		</div>
	);
};

export default AnalysisOfThemes;
