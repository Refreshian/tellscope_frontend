import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import styles from './Content.module.scss';

const Content = ({ children, graph, style, alignStart }) => {
	const { active_menu } = useSelector(store => store.booleanValues);
	const { defaultActiveMenu } = useActions();

	const isDataSetPath = /^\/data-set(\/processed)?\/[^/]+$/.test(
		location.pathname,
	);
	const isHomePath = location.pathname === '/home';
	const isAiBotPath = location.pathname === '/ai-bot';
	const isWorkspacePath = !isHomePath && location.pathname !== '/';

	useEffect(() => {
		const m = document.cookie.split('; ').find(x => x.startsWith('token='));
		const tok = m ? decodeURIComponent(m.slice('token='.length)) : '';
		if (!tok) return;
		let on = true;
		const ping = () => {
			if (document.hidden || !on) return;
			fetch('/api/heartbeat', { headers: { Authorization: 'Bearer ' + tok } }).catch(() => {});
		};
		ping();
		const id = setInterval(ping, 60000);
		return () => { on = false; clearInterval(id); };
	}, []);

	const styleCSS = {
		paddingRight: graph ? 'calc(28/1440 * 100vw)' : undefined,
		alignItems: isDataSetPath ? 'stretch' : 'center',
		overflow: isDataSetPath || isAiBotPath ? 'hidden' : 'auto',
		...style,
	};

	return (
		<div
			className={`${styles.wrapper_content}${isAiBotPath ? ` ${styles.fill}` : ''}${isWorkspacePath && !isAiBotPath ? ` ${styles.workspace}` : ''}${alignStart ? ` ${styles.start}` : ''}`}
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
