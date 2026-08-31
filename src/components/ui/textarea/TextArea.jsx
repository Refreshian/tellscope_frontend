import styles from './TextArea.module.scss';

const TextArea = ({
	value,
	onChange = () => {},
	styleBlock,
	style,
	placeholder,
}) => {
	return (
		<div className={styles.block__textarea} style={styleBlock}>
			<textarea
				value={value}
				onChange={onChange}
				style={style}
				placeholder={placeholder}
				className={styles.textarea}
			/>
			<p className={styles.description}>{value.length}/150</p>
		</div>
	);
};

export default TextArea;
