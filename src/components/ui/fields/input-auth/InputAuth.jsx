import { useState } from 'react';

import styles from './InputAuth.module.scss';

const InputAuth = ({
	type,
	placeholder,
	register,
	id,
	label,
	styleInput,
	validate,
}) => {
	const [isViewPassword, setIsViePassword] = useState(false);

	return (
		<div className={styles.block__input}>
			<label className={styles.label} htmlFor={id}>
				{label}
			</label>
			<input
				style={styleInput}
				className={styles.input}
				{...register(
					id,
					id === 'email'
						? {
								required: true,
								pattern: {
									value:
										/^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/,
									message: 'Некорректный формат почты',
								},
							}
						: {
								required: true,
								validate,
							},
				)}
				type={isViewPassword ? 'text' : type}
				id={id}
				placeholder={placeholder}
			/>

			{(label === 'Пароль' || label === 'Повторите пароль') && (
				<button
					className={styles.button__view}
					onClick={() => setIsViePassword(!isViewPassword)}
					type='button'
				>
					<img
						src='/images/icons/input_button/view_password.svg'
						alt='view_password'
					/>
				</button>
			)}
		</div>
	);
};

export default InputAuth;
