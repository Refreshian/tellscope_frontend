import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import styles from './NoData.module.scss';

const NoData = () => {
	const { addText_PopupInFolder, toggle_PopupInFolder } = useActions();
	const { isPopupInFolder } = useSelector(state => state.popupInFolder);

	const onClick = () => {
		addText_PopupInFolder({
			title: 'Новая папка',
			name_file: isPopupInFolder.name_file,
		});
		toggle_PopupInFolder('');
	};

	return (
		<div className={styles.block__noDat}>
			<h2 className={styles.title}>Здесь пока ничего нет</h2>
			<p className={styles.description}>
				Создайте первую папку, в которой будут храниться файлы для дальнейшей
				обработки
			</p>
			<button onClick={onClick}>Создать папку</button>
		</div>
	);
};

export default NoData;
