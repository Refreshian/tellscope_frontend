import { Suspense, useCallback, useState } from 'react';

import Loader from '@/components/loading/loader/Loader';
import PanelTargetGraph from '@/components/ui/panel-target-graph/PanelTargetGraph';

import { useSaveImageGraph } from '@/hooks/useSaveImageGraph';

import styles from './VoiceGraph.module.scss';
import RadialBar from './radial-bar/RadialBar';
import Sankey from './sankey/Sankey';
import { voiceButtons } from '@/data/panel.data';

const VoiceGraph = ({ voiceData }) => {
  const [activeButton, setActiveButton] = useState('Источники');

  const handleClick = useCallback(
    but => {
      setActiveButton(but);
    },
    []
  );

  const handleDownloadImage = useSaveImageGraph();

  return (
    <div className={styles.block__graph}>
      <div className={styles.wrapper_graf}>
        {/* кнопки и настройки */}
        <div className={styles.block__title}>
          <PanelTargetGraph
            handleClick={handleClick}
            dataButtons={voiceButtons}
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
        {/* график */}
        <div className={styles.chartContainer}>
          <div className={styles.container__graph} id='graph-for-download'>
            {activeButton === 'Источники' ? (
              <Suspense fallback={<Loader />}>
                <RadialBar voiceData={voiceData} />
              </Suspense>
            ) : (
              <Suspense fallback={<Loader />}>
                <Sankey filteredData={voiceData} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceGraph;