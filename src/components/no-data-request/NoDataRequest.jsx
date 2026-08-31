import styles from './NoDataRequest.module.scss';

const NoDataRequest = ({ style }) => {
	return (
		<div className={styles.noData} style={style}>
			<img
				src='/images/no_data_in_search.png'
				alt='image'
				className={styles.image}
			/>
			<p className={styles.description}>
				Результатов по запросу не найдено. <br /> Измените запрос и повторите
				поиск
			</p>
		</div>
	);
};

export default NoDataRequest;
