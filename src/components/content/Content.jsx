import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import styles from './Content.module.scss';

const Content = ({ children, graph, style }) => {
	const { active_menu } = useSelector(store => store.booleanValues);
	const { defaultActiveMenu } = useActions();

	const isDataSetPath = /^\/data-set(\/processed)?\/[^/]+$/.test(
		location.pathname,
	);

	const styleCSS = {
		paddingRight: graph ? 'calc(28/1440 * 100vw)' : undefined,
		alignItems: isDataSetPath ? 'flex-start' : 'center',
		overflow: isDataSetPath ? 'hidden' : 'visible',
		...style,
	};

	return (
		<div
			className={styles.wrapper_content}
			style={styleCSS}
			onClick={() => {
				if (active_menu) defaultActiveMenu('');
			}}
		>
			{children}
		</div>
	);
};

export default Content;
