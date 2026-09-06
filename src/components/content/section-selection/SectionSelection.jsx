import { useEffect, useState } from 'react';
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

	return (
		<div className={styles.page}>
			{/* <img
				className={styles.logo}
				src='/images/full_logo.svg'
				alt='full_logo'
			/> */}
			{/* <p className={styles.description}>Powered by using machine learning</p> */}
			<div className={styles.block__logo}>
				<img className={styles.logo__image} src='/images/logo.svg' alt='logo' />
				<p className={styles.description}>
					<span className={styles.max}>Аналитика</span>
					<br />
					Соцмедиа & СМИ
					<br />
					<span className={styles.mini}>С применением ИИ</span>
				</p>
			</div>
			<h2 className={styles.title}>Выберите нужный раздел</h2>
			<div className={styles.block__choice}>
				{menuPageData.filter(elemInfo => !elemInfo.sidebarOnly).map(elemInfo => {
					return <SectionInfo key={elemInfo.id} elemInfo={elemInfo} />;
				})}
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

