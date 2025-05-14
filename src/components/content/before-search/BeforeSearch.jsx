import { Link } from 'react-router-dom';

import styles from './BeforeSearch.module.scss';

const BeforeSearch = ({ title, link }) => {
	return (
		<div className={styles.wrapper_before}>
			<div className={styles.block__description}>
				<h2 className={styles.title}>{title}</h2>
				<p className={styles.instruction}>
					Для отображения данных выберите необходимые параметры и нажмите кнопку
					«Запуск»
				</p>
				<Link
					to={link ? link : '/faq'}
					target='_blank'
					className={styles.detail}
				>
					<img
						src='/images/icons/for_info.svg'
						alt='img'
						className={styles.image}
					/>
					<span>Экскурсия по странице</span>
				</Link>
			</div>
		</div>
	);
};

export default BeforeSearch;
