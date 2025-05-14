import styles from './AiAnalytics.module.scss';
import AiTable from './ai-tables/AiTable';

const AiAnalytics = () => {
	return (
		<div className={styles.block__table}>
			<AiTable />
		</div>
	);
};

export default AiAnalytics;
