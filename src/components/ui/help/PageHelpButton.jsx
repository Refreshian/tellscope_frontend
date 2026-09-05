import { useLocation } from 'react-router-dom';

import { getDocForPath } from '@/data/docs.data';

import { useHelp } from './HelpProvider';

import styles from './PageHelpButton.module.scss';

/**
 * Плавающая кнопка «?» в правом нижнем углу экрана.
 * Показывается на всех страницах, для которых есть статья справки
 * (справка открывается по текущему маршруту).
 */
const PageHelpButton = () => {
	const { pathname } = useLocation();
	const { open } = useHelp();

	const doc = getDocForPath(pathname);
	if (!doc) return null;

	return (
		<button
			type='button'
			className={styles.button}
			title={`Справка: ${doc.title}`}
			aria-label={`Справка по разделу «${doc.title}»`}
			onClick={() => open(doc, 'page')}
		>
			?
		</button>
	);
};

export default PageHelpButton;
