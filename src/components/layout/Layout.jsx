import styles from './Layout.module.scss';
import { menuPageData, menuSettings } from '@/data/menuPage.data';

// Заранее загружаем иконки меню: при переключении вкладки картинка меняется
// (серая ↔ активная) и без прогрева заметна вспышка/моргание.
const MENU_ICONS = Array.from(
	new Set(
		[...menuPageData, ...menuSettings]
			.flatMap(item => [item?.src, item?.src_active])
			.filter(Boolean)
	)
);

const Layout = ({ children, style }) => {
	return (
		<div className={styles.wrapper} style={style}>
			<div className={styles.preload} aria-hidden='true'>
				{MENU_ICONS.map(src => (
					<img key={src} src={src} alt='' />
				))}
			</div>
			{children}
		</div>
	);
};

export default Layout;
