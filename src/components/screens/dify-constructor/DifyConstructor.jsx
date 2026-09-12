import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '@/hooks/useCheckAuth';

import styles from './DifyConstructor.module.scss';

// Визуальный редактор Dify живёт отдельным приложением на том же хосте (порт 8443),
// поэтому вкладка Tellscope открывает его внутри себя, а кнопка — в новой вкладке браузера.
const difyUrl = () => {
	if (typeof window === 'undefined') return 'https://tellscope40.headsmade.com:8443';
	const { protocol, hostname } = window.location;
	if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
		return 'https://tellscope40.headsmade.com:8443';
	}
	return `${protocol}//${hostname}:8443`;
};

const DifyConstructor = () => {
	useCheckAuth();

	const { pathname } = useLocation();
	const { active_menu } = useSelector(store => store.booleanValues);

	const [url] = useState(() => difyUrl());
	const [loaded, setLoaded] = useState(false);
	const [slow, setSlow] = useState(false);
	const frameRef = useRef(null);

	useEffect(() => {
		const timer = setTimeout(() => setSlow(true), 6000);
		return () => clearTimeout(timer);
	}, []);

	const openInNewTab = useCallback(() => {
		window.open(url, '_blank', 'noopener,noreferrer');
	}, [url]);

	const reload = useCallback(() => {
		setLoaded(false);
		setSlow(false);
		if (frameRef.current) {
			// eslint-disable-next-line no-param-reassign
			frameRef.current.src = url;
		}
	}, [url]);

	return (
		<Layout>
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				<div className={styles.head}>
					<span className={styles.headMark}>DIFY</span>
					<h2 className={styles.headTitle}>Конструктор Dify</h2>
					<span className={styles.headHint}>
						схемы задач из блоков: инструменты Tellscope (14) уже подключены — узел «Инструмент» →
						провайдер tellscope
					</span>
					<div className={styles.headActions}>
						<button type='button' className={styles.chipBtn} onClick={reload}>
							обновить
						</button>
						<button type='button' className={styles.chipBtn} onClick={openInNewTab}>
							открыть в новой вкладке
						</button>
					</div>
				</div>

				<div className={styles.frameWrap}>
					{!loaded && (
						<div className={styles.frameLoader}>
							<span className={styles.spinner} />
							{slow
								? 'Редактор отвечает дольше обычного — если ничего не появилось, откройте его в новой вкладке.'
								: 'Загружаю визуальный редактор…'}
						</div>
					)}
					<iframe
						ref={frameRef}
						className={styles.frame}
						src={url}
						title='Визуальный конструктор Dify'
						onLoad={() => setLoaded(true)}
						allow='clipboard-read; clipboard-write'
					/>
				</div>
			</Content>
		</Layout>
	);
};

export default DifyConstructor;
