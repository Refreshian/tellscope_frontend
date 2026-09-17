import styles from './MosinformArchive.module.scss';

/**
 * Переключатель «Показать все задачи» для журналов задач («Очередь ML», «Мосинформ.Рейтинг»).
 *
 * Показывается только администратору: обычному пользователю бэкенд отдаёт лишь его задачи.
 * Состояние (включено/выключено) хранит `useJobsScope` в localStorage.
 */
const JobsScopeSwitch = ({ checked, onChange, hint = '' }) => (
	<div className={styles.scope}>
		<label className={styles.scopeToggle}>
			<input
				type='checkbox'
				checked={Boolean(checked)}
				onChange={event => onChange && onChange(event.target.checked)}
			/>
			<span>Показать все задачи</span>
		</label>
		{hint ? <span className={styles.scopeHint}>{hint}</span> : null}
	</div>
);

export default JobsScopeSwitch;
