import styles from './Layout.module.scss';

const Layout = ({ children, style }) => {
	return (
		<div className={styles.wrapper} style={style}>
			{children}
		</div>
	);
};

export default Layout;
