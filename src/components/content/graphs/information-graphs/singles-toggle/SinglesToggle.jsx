import { formatCount } from '../chainView';

import styles from './SinglesToggle.module.scss';

const SinglesToggle = ({ on, onChange, count = 0 }) => (
	<button
		type="button"
		role="switch"
		aria-checked={on}
		className={`${styles.toggle} ${on ? styles.on : ''}`}
		onClick={() => onChange(!on)}
		disabled={!count}
		title={
			on
				? 'Скрыть публикации, которые не входят в цепочки'
				: 'Показать публикации, которые не входят в цепочки'
		}
	>
		<span className={styles.track} aria-hidden="true">
			<span className={styles.knob} />
		</span>
		<span className={styles.label}>
			Вне цепочек
			{count ? ` · ${formatCount(count)}` : ''}
		</span>
	</button>
);

export default SinglesToggle;
