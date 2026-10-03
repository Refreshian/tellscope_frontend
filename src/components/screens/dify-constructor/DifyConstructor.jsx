import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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

// Рабочее пространство Dify одно на весь сервис и вход в него отдельный, поэтому конструктор
// открываем только администратору: иначе пользователь попадал в чужие схемы — у него в браузере
// могла остаться сессия другой учётной записи («С возвращением, Alex»).
const DifyConstructor = () => {
	useCheckAuth();

	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { active_menu } = useSelector(store => store.booleanValues);
	const me = useCurrentUser();
	const isAdmin = Boolean(me && me.is_superuser);

	const [url] = useState(() => difyUrl());
	const [loaded, setLoaded] = useState(false);
	const [slow, setSlow] = useState(false);
	const frameRef = useRef(null);

	useEffect(() => {
		if (!isAdmin) return undefined;
		const timer = setTimeout(() => setSlow(true), 6000);
		return () => clearTimeout(timer);
	}, [isAdmin]);

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

	const shell = children => (
		<Layout>
			{pathname !== '/home' && active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>{children}</Content>
		</Layout>
	);

	if (me === null) {
		return shell(
			<div className={styles.frameWrap}>
				<div className={styles.frameLoader}>
					<span className={styles.spinner} />
					Проверяю доступ…
				</div>
			</div>,
		);
	}

	if (!isAdmin) {
		return shell(
			<>
				<div className={styles.head}>
					<span className={styles.headMark}>DIFY</span>
					<h2 className={styles.headTitle}>Конструктор Dify</h2>
					<span className={styles.headHint}>открыт администратору</span>
				</div>
				<div
					style={{
						maxWidth: 760,
						margin: '6px 0 0',
						padding: '14px 18px',
						border: '1px solid rgba(16,24,40,.12)',
						borderRadius: 12,
						background: '#fff',
						fontSize: 14,
						lineHeight: 1.55,
						color: '#344054',
					}}
				>
					<p style={{ margin: '0 0 10px' }}>
						Схемы задач собираются в общем редакторе Dify, а рабочее пространство у него одно
						на весь сервис — открывать его всем аккаунтам нельзя, иначе в нём видны чужие агенты
						и отчёты. Поэтому визуальный конструктор сейчас доступен только администратору.
					</p>
					<p style={{ margin: '0 0 10px' }}>
						Свои данные и агенты — в разделах Tellscope: задачи, прогоны и отчёты лежат
						в вашем аккаунте и другим не видны.
					</p>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
						<button type='button' className={styles.chipBtn} onClick={() => navigate('/agents')}>
							Мои агенты
						</button>
						<button type='button' className={styles.chipBtn} onClick={() => navigate('/harness')}>
							Центр задач
						</button>
						<button type='button' className={styles.chipBtn} onClick={() => navigate('/data-set')}>
							Наборы данных
						</button>
					</div>
					<p style={{ margin: '12px 0 0', fontSize: 13, color: '#667085' }}>
						Если конструктор нужен в работе — напишите администратору: личное рабочее
						пространство в Dify выдаётся отдельно.
					</p>
				</div>
			</>,
		);
	}

	return shell(
		<>
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
		</>,
	);
};

export default DifyConstructor;
