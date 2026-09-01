import { Suspense, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Loader from '@/components/loading/loader/Loader';
import PanelTargetGraph from '@/components/ui/panel-target-graph/PanelTargetGraph';
import { useSaveImageGraph } from '@/hooks/useSaveImageGraph';
import styles from './InformationGraphs.module.scss';
import BarInformation from './bar-information/BarInformation';
import SpreadFlow from './spread-flow/SpreadFlow';
import ScatterChart from './scatter-chart/ScatterChart';
import { informationButtons } from '@/data/panel.data';

const InformationGraphs = ({ data }) => {
  const { pathname } = useLocation();
  const [isViewSource, setIsViewSource] = useState(true);
  const [activeButton, setActiveButton] = useState('Граф. распространения информации');

  const handleDownloadImage = useSaveImageGraph();

  const handleClick = useCallback(
    (button) => setActiveButton(button),
    []
  );

  return (
    <div className={styles.block__graph}>
      <div className={styles.block__title}>
        <PanelTargetGraph
          handleClick={handleClick}
          dataButtons={informationButtons}
          activeButton={activeButton}
        />
        <div className={styles.block__settings}>
          {pathname !== '/information-graf' && (
            <button
              className={styles.button__description}
              onClick={() => setIsViewSource(!isViewSource)}
            >
              {isViewSource ? 'Скрыть' : 'Показать'} пояснения к графику
            </button>
          )}
          <button
            className={styles.button__settings}
            onClick={() => handleDownloadImage('graph-for-download')}
          >
            <img src='/images/icons/setting/upload_active.svg' alt='icon' />
          </button>
        </div>
      </div>
      <div className={styles.container__graph} id='graph-for-download'>
        <Suspense fallback={<Loader />}>
          {activeButton === 'Граф. распространения информации' ? (
            <SpreadFlow data={data} />
          ) : activeButton === 'Динамика распространения' ? (
            <BarInformation data={data} />
          ) : (
            <ScatterChart data={data} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default InformationGraphs;