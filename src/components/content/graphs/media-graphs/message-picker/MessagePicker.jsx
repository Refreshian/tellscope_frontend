import {
	formatCount,
	formatTime,
	hostFromUrl,
	openUrl,
	ruCount,
} from '../mediaView';

import styles from './MessagePicker.module.scss';

const MessagePicker = ({
	title,
	kicker = 'Источник',
	meta,
	messages,
	onClose,
}) => {
	if (!messages?.length) return null;
	return (
		<div className={styles.picker} role="dialog" aria-label="Сообщения источника">
			<div className={styles.pickerHead}>
				<div>
					<p className={styles.pickerKicker}>{kicker}</p>
					<strong>{title}</strong>
					{meta ? <p className={styles.pickerMeta}>{meta}</p> : null}
				</div>
				<button
					type="button"
					className={styles.pickerClose}
					onClick={onClose}
					aria-label="Закрыть"
				>
					×
				</button>
			</div>
			<p className={styles.pickerHint}>
				{messages.length}{' '}
				{ruCount(messages.length, 'сообщение', 'сообщения', 'сообщений')}.
				Сначала с наибольшим индексом.
			</p>
			<ul className={styles.pickerList}>
				{messages.map((item, index) => (
					<li key={`${item.url}-${index}`}>
						<button type="button" onClick={() => openUrl(item.url)}>
							<strong>
								{index === 0 ? 'Самое заметное' : `Сообщение ${index + 1}`}
							</strong>
							<span>{hostFromUrl(item.url) || title}</span>
							<em>
								{item.time ? formatTime(item.time) : 'без даты'}
								{item.index
									? ` · индекс ${formatCount(item.index)}`
									: ''}
							</em>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};

export default MessagePicker;
