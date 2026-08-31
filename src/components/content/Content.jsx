import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import styles from './Content.module.scss';

const Content = ({ children, graph, style }) => {
	const { active_menu } = useSelector(store => store.booleanValues);
	const { defaultActiveMenu } = useActions();

	const isDataSetPath = /^\/data-set(\/processed)?\/[^/]+$/.test(
		location.pathname,
	);
	const isHomePath = location.pathname === '/home';
	const isAiBotPath = location.pathname === '/ai-bot';
	const isWorkspacePath = !isHomePath && location.pathname !== '/';

	const styleCSS = {
		paddingRight: graph ? 'calc(28/1440 * 100vw)' : undefined,
		alignItems: isDataSetPath || isWorkspacePath ? 'stretch' : 'center',
		overflow: isDataSetPath || isAiBotPath ? 'hidden' : 'auto',
		...style,
	};

	return (
		<div
			className={`${styles.wrapper_content}${isAiBotPath ? ` ${styles.fill}` : ''}${isWorkspacePath && !isAiBotPath ? ` ${styles.workspace}` : ''}`}
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
