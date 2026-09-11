import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import Content from '@/components/content/Content';
import BeforeSearch from '@/components/content/before-search/BeforeSearch';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/button/Button';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '@/hooks/useCheckAuth';

import styles from './DifyConstructor.module.scss';

// Визуальный редактор Dify живёт отдельным приложением на том же хосте (порт 8443),
// поэтому вкладка Tellscope открывает его внутри себя, а кнопка — в новой вкладке браузера.
const difyUrl = () => {
	if (typeof window === 'undefined') return 'https://tellscope40.headsmade.com:8443';
	const { protocol, hostname, port } = window.location;
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
				<div className={styles.block__pageName}>
					<BeforeSearch title='Конструктор Dify' link='https://tsdoc.headsmade.com/en/smart-agent' />
				</div>

				<p className={styles.lead}>
					Визуальный редактор цепочек: собирайте сценарии аналитики соцмедиа и СМИ из блоков
					(поиск, тональность, инфоповоды, ИИ-разбор текста, отчёты), не заглядывая в код.
					Инструменты Tellscope уже подключены в редакторе — ищите провайдера <b>tellscope</b>
					в списке инструментов.
				</p>

				<div className={styles.actionBar}>
					<Button
						style={{ width: 'calc(260/1440*100vw)', height: 'calc(52/1440*100vw)' }}
						onClick={openInNewTab}
					>
						Открыть в новой вкладке
					</Button>
					<button type='button' className={styles.linkBtn} onClick={reload}>
						обновить редактор
					</button>
					<span className={styles.actionMuted}>
						инструментов Tellscope: 14 · отчёты и графики попадают во вкладку «Отчёты»
					</span>
				</div>

				<div className={styles.notice}>
					<b>Как собрать инструмент по соцмедиа и СМИ.</b> В редакторе создайте приложение
					(Workflow), добавьте узел «Инструмент» → <b>tellscope</b> → нужный инструмент
					(например, <i>search_messages</i> — поиск сообщений, <i>deep_text_analysis</i> —
					подробный разбор текстов, <i>build_report</i> — отчёт DOCX/PDF). Параметры
					подставляйте переменными из узла «Начало» или из предыдущих блоков — так и получается
					цепочка. Локальная модель <i>Qwen3-32B</i> работает без оплаты, внешние модели
					подключены через aitunnel.
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
