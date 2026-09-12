import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './SectionSelection.module.scss';
import SectionInfo from './section-info/SectionInfo';
import { menuPageData } from '@/data/menuPage.data';

const SectionSelection = () => {
	const [me, setMe] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		let on = true;
		(async () => {
			try {
				const m = document.cookie.split('; ').find(x => x.startsWith('token='));
				const tok = m ? decodeURIComponent(m.slice('token='.length)) : '';
				if (!tok) return;
				const r = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + tok } });
				if (r.ok && on) setMe(await r.json());
			} catch (e) {}
		})();
		return () => { on = false; };
	}, []);

	const isAdmin = me && me.is_superuser;

	// ИИ-разделы (Центр задач, агенты, конструктор) идут первыми, дальше — аналитика и данные
	const groups = useMemo(() => {
		const visible = menuPageData.filter(item => !item.sidebarOnly);
		const ai = visible.filter(item => item.accent);
		const tools = visible.filter(item => !item.accent);
		return [
			{
				id: 'ai',
				title: 'ИИ-инструменты',
				hint: 'задачу можно описать словами — разделы работают через агентов и инструменты Tellscope',
				items: ai,
			},
			{
				id: 'tools',
				title: 'Аналитика и данные',
				hint: 'готовые срезы и отчёты по соцмедиа и СМИ',
				items: tools,
			},
		].filter(group => group.items.length > 0);
	}, []);

	return (
		<div className={styles.page}>
			<div className={styles.block__logo}>
				<img className={styles.logo__image} src='/images/logo.svg' alt='logo' />
				<div className={styles.brand}>
					<span className={styles.brandTop}>Аналитика</span>
					<span className={styles.brandMain}>Соцмедиа &amp; СМИ</span>
					<span className={styles.brandNote}>с применением ИИ</span>
				</div>
			</div>

			<h2 className={styles.title}>Выберите раздел</h2>

			<div className={styles.groups}>
				{groups.map(group => (
					<section
					key={group.id}
					className={`${styles.group} ${group.id === 'ai' ? styles.groupAccent : ''}`}
				>
						<div className={styles.groupHead}>
							<span className={styles.groupTitle}>{group.title}</span>
							<span className={styles.groupHint}>{group.hint}</span>
						</div>
						<div className={styles.groupRow}>
							{group.items.map(elemInfo => (
								<SectionInfo key={elemInfo.id} elemInfo={elemInfo} />
							))}
						</div>
					</section>
				))}
			</div>

			{isAdmin && (
				<button
					type='button'
					className={styles.adminBtn}
					onClick={() => navigate('/admin')}
					title='Администрирование'
				>
					<img src='/images/icons/admin.svg' alt='' />
					<span>Администрирование</span>
				</button>
			)}
		</div>
	);
};

export default SectionSelection;
