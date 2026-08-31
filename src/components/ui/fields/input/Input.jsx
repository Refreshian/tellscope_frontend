import styles from './Input.module.scss';

const Input = ({
	placeholder,
	style,
	value,
	onChange,
	styleInput,
	styleImage,
}) => {
	return (
		<div className={styles.block__input} style={style}>
			<img
				style={styleImage}
				src='/images/icons/input_button/search.svg'
				alt='search'
				className={styles.img}
			/>
			<input
				style={styleInput}
				placeholder={placeholder}
				type='text'
				className={styles.input}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
};

export default Input;
