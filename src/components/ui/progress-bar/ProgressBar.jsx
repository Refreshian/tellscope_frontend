import { useSelector } from 'react-redux';

import styles from './ProgressBar.module.scss';

const ProgressBar = ({ style }) => {
	const { progress_load } = useSelector(state => state.aiData);

	return (
		<div className={styles.wrapper_progressBar} style={style}>
			<div className={styles.block__progressBar}>
				<div
					className={
						progress_load === 100
							? `${styles.progress} ${styles.green}`
							: `${styles.progress}`
					}
					style={{ width: `${progress_load}%` }}
				></div>
			</div>
			<p
				className={styles.present}
				style={progress_load === 100 ? { color: '#3DCC6D' } : {}}
			>
				{progress_load}%
			</p>
		</div>
	);
};

export default ProgressBar;
