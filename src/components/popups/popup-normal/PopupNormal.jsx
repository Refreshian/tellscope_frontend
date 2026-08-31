import { useActions } from '@/hooks/useActions';

import styles from './PopupNormal.module.scss';

const PopupNormal = ({ text, url, time }) => {
	const { default_popupNormal } = useActions();

	return (
		<div className={styles.block__popup}>
			<button
				className={styles.button__exit}
				onClick={() => default_popupNormal('')}
			>
				<img src='/images/icons/exit.svg' alt='exit' />
			</button>
			{time !== null && <p className={styles.time}>{time}</p>}
			<p className={styles.text}>{text}</p>
			{url !== null && (
				<div className={styles.block__link}>
					<span className={styles.title}>Оригинал сообщения: </span>
					<a href={url} className={styles.link}>
						{url}
					</a>
				</div>
			)}
		</div>
	);
};

export default PopupNormal;
