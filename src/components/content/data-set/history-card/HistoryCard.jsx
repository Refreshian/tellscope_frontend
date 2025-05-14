import { convertUnixTimestampToDate } from '../../../../utils/timestamp';

import styles from './HistoryCard.module.scss';

const HistoryCard = ({ data }) => {
	return (
		<div className={styles.block__card}>
			<h3 className={styles.title}>
				{' '}
				<span>Файл:</span> {data['html-file']}
			</h3>
			<p className={styles.creation_date}>
				<span>Дата запроса:</span> {data.creation_date}
			</p>
			<p className={styles.date}>
				<span>Мин.дата:</span>{' '}
				{String(convertUnixTimestampToDate(data.min_date || data.min_data))}
			</p>
			<p>
				<span>Макс.дата:</span>{' '}
				{String(convertUnixTimestampToDate(data.max_date || data.max_data))}
			</p>
			<p>
				<span>Поисковый запрос к данным:</span> {data.query_str}
			</p>
			<p>
				<span>Всего текстов:</span> {data.count_texts}
			</p>
			<p>
				<span>Уникальных текстов:</span> {data.unique_texts}
			</p>
			<p>
				<span>Промт запрос к LLM:</span> {data.promt_question}
			</p>
		</div>
	);
};

export default HistoryCard;
