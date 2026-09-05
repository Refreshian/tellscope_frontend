import { Link } from 'react-router-dom';

import PageHelpButton from '@/components/ui/help/PageHelpButton';

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
				<div style={{ marginTop: 10, display: 'flex' }}>
					<PageHelpButton />
				</div>
				{/* <Link
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
				</Link> */}
			</div>
		</div>
	);
};

export default BeforeSearch;
