import styles from './BackgroundLoader.module.scss';

const BackgroundLoader = ({ onClick }) => {
	return <div className={styles.background__loader} onClick={onClick}></div>;
};

export default BackgroundLoader;
