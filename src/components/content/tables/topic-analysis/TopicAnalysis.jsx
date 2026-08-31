import styles from './TopicAnalysis.module.scss';
import Table from './table/Table';

const TopicAnalysis = () => {
	return (
		<div className={styles.block__table}>
			<Table />
		</div>
	);
};

export default TopicAnalysis;
