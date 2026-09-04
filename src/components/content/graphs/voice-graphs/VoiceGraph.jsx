import { memo, Suspense, useCallback, useState } from 'react';

import Loader from '@/components/loading/loader/Loader';
import PanelTargetGraph from '@/components/ui/panel-target-graph/PanelTargetGraph';
import { voiceButtons } from '@/data/panel.data';
import { useSaveImageGraph } from '@/hooks/useSaveImageGraph';

import RadialBar from './radial-bar/RadialBar';
import Sankey from './sankey/Sankey';
import styles from './VoiceGraph.module.scss';

const VoiceGraph = ({ voiceData, onNodeFilter, highlightId, onHubFilter }) => {
	const [activeButton, setActiveButton] = useState('Источники');
	const handleClick = useCallback(button => setActiveButton(button), []);
	const handleDownloadImage = useSaveImageGraph();

	return (
		<div className={styles.block__graph}>
			<div className={styles.block__title}>
				<PanelTargetGraph
					handleClick={handleClick}
					dataButtons={voiceButtons}
					activeButton={activeButton}
				/>
				<div className={styles.block__settings}>
					<button
						type="button"
						className={styles.button__settings}
						onClick={() => handleDownloadImage('graph-for-download')}
					>
						<img src="/images/icons/setting/upload_active.svg" alt="icon" />
					</button>
				</div>
			</div>
			<div className={styles.chartShell} id="graph-for-download">
				{activeButton === 'Источники' ? (
					<Suspense fallback={<Loader />}>
						<RadialBar voiceData={voiceData} onHubFilter={onHubFilter} />
					</Suspense>
				) : (
					<Suspense fallback={<Loader />}>
						<Sankey
							filteredData={voiceData}
							onNodeFilter={onNodeFilter}
							highlightId={highlightId}
						/>
					</Suspense>
				)}
			</div>
		</div>
	);
};

export default memo(VoiceGraph);
