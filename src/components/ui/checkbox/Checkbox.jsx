import { useSelector } from 'react-redux';

import { useActions } from '@/hooks/useActions';

import styles from './Checkbox.module.scss';

const Checkbox = ({ id, text }) => {
	const { currentCheckBox } = useActions();
	const value = useSelector(state => state.dataForRequest);

	return (
		<div className={styles.block__option}>
			<input
				type='checkbox'
				id={id}
				value={value[id]}
				className={styles.check}
				onChange={() => currentCheckBox(id)}
			/>
			<label htmlFor={id} className={styles.option}>
				{text}
			</label>
		</div>
	);
};

export default Checkbox;
