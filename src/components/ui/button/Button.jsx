import styles from './Button.module.scss';

const Button = ({ onClick, children, style, disabled }) => {
	return (
		<button
			onClick={onClick}
			style={style}
			className={styles.button}
			disabled={disabled}
		>
			{children}
		</button>
	);
};

export default Button;
