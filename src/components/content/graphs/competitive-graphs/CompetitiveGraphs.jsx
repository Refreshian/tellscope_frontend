import { Suspense, useCallback, useState } from 'react';

import Loader from '@/components/loading/loader/Loader';
import PanelTargetGraph from '@/components/ui/panel-target-graph/PanelTargetGraph';

import { useSaveImageGraph } from '@/hooks/useSaveImageGraph';

import styles from './CompetitiveGraphs.module.scss';
import BubbleComparison from './bubble-comparison/BubbleComparison';
import BubbleLineComparison from './bubble-line-comparison/BubbleLineComparison';
import LineDynamic from './line-dynamic/LineDynamic';
import { competitiveButtons } from '@/data/panel.data';

const CompetitiveGraphs = () => {
	const [activeButton, setActiveButton] = useState('Динамика сообщений');
	const [activeSubcategory, setActiveSubcategory] = useState('Socmedia');

	const handleDownloadImage = useSaveImageGraph();

	const handleClick = useCallback(button => {
		setActiveButton(button);
	}, []);

	const handleClickSubcategory = useCallback(button => {
		setActiveSubcategory(button);
	}, []);

	return (
		<div className={styles.block__graph}>
			<div className={styles.block__title}>
				<PanelTargetGraph
					handleClick={handleClick}
					dataButtons={competitiveButtons}
					activeButton={activeButton}
				/>
				<div className={styles.block__settings}>
					<button
						className={styles.button__settings}
						onClick={() => handleDownloadImage('graph-for-download')}
					>
						<img src='/images/icons/setting/upload_active.svg' alt='icon' />
					</button>
				</div>
			</div>
			<div className={styles.block__subcategory}>
				<div
					className={styles.block__radio}
					style={
						activeButton === 'Динамика сообщений' ? { display: 'none' } : {}
					}
				>
					<input
						type='radio'
						className={styles.radio}
						name='subcategory' // добавляем одинаковый атрибут name
						checked={activeSubcategory === 'SMI'}
						onChange={() => handleClickSubcategory('SMI')}
					/>
					<p className={styles.text__radio}>СМИ</p>
				</div>
				<div
					className={styles.block__radio}
					style={
						activeButton === 'Динамика сообщений' ? { display: 'none' } : {}
					}
				>
					<input
						type='radio'
						className={styles.radio}
						name='subcategory' // добавляем одинаковый атрибут name
						checked={activeSubcategory === 'Socmedia'}
						onChange={() => handleClickSubcategory('Socmedia')}
					/>
					<p className={styles.text__radio}>Соцмедиа</p>
				</div>
			</div>
			<div className={styles.container__graph} id='graph-for-download'>
				{activeButton === 'Динамика сообщений' ? (
					<Suspense fallback={<Loader />}>
						<LineDynamic />
					</Suspense>
				) : activeButton === 'Сравнение в СМИ и Соцмедиа' ? (
					<Suspense fallback={<Loader />}>
						<BubbleComparison
							one={true}
							activeSubcategory={activeSubcategory}
						/>
						<BubbleComparison
							one={false}
							activeSubcategory={activeSubcategory}
						/>
					</Suspense>
				) : (
					<Suspense fallback={<Loader />}>
						<BubbleLineComparison activeSubcategory={activeSubcategory} />
					</Suspense>
				)}
			</div>
		</div>
	);
};

export default CompetitiveGraphs;
