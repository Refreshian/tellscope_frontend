import { useLocation } from 'react-router-dom';

import { getDocForPath } from '@/data/docs.data';

import { useHelp } from './HelpProvider';

import styles from './PageHelpButton.module.scss';

/**
 * Кнопка «?» — открывает справку по текущему разделу.
 * - по умолчанию встраивается рядом с контентом (inline);
 * - с prop `floating` позиционируется плавающей в правом верхнем углу рабочей
 *   области (используется в <Content/> на страницах, где шапка не занята).
 * Показывается только на страницах, для которых есть статья справки.
 */
const PageHelpButton = ({ floating = false }) => {
	const { pathname } = useLocation();
	const { open } = useHelp();

	const doc = getDocForPath(pathname);
	if (!doc) return null;

	const className = floating
		? `${styles.button} ${styles.floating}`
		: styles.button;

	return (
		<button
			type='button'
			className={className}
			title={`Справка: ${doc.title}`}
			aria-label={`Справка по разделу «${doc.title}»`}
			onClick={() => open(doc, 'page')}
		>
			?
		</button>
	);
};

export default PageHelpButton;
