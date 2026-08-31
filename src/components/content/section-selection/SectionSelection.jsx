import styles from './SectionSelection.module.scss';
import SectionInfo from './section-info/SectionInfo';
import { menuPageData } from '@/data/menuPage.data';

const SectionSelection = () => {
	return (
		<>
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
		</>
	);
};

export default SectionSelection;
