import { SORT_OPTIONS } from '@/utils/fileSort';

import styles from './FileSortSwitch.module.scss';

/**
 * Компактный переключатель порядка списка: «Сначала новые» / «Сначала старые» / «По имени».
 *
 * Один и тот же контрол стоит и в списке отчётов, и в списке внутри папки датасета, поэтому
 * выбранный режим хранится в localStorage (см. useFileSort) и не сбрасывается при переходах.
 */
const FileSortSwitch = ({ value, onChange, className = '' }) => (
	<div
		className={`${styles.switch} ${className}`.trim()}
		role='group'
		aria-label='Сортировка файлов'
	>
		{SORT_OPTIONS.map(option => {
			const active = option.value === value;

			return (
				<button
					key={option.value}
					type='button'
					className={`${styles.option} ${active ? styles.optionActive : ''}`.trim()}
					title={option.title || option.label}
					aria-pressed={active}
					onClick={() => onChange && onChange(option.value)}
				>
					{option.label}
				</button>
			);
		})}
	</div>
);

export default FileSortSwitch;
