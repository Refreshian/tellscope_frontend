import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/button/Button';
import InputAuth from '@/components/ui/fields/input-auth/InputAuth';

import { useAuth } from '@/hooks/useAuth';
import { useAuthPage } from '@/hooks/useAuthPage';

import { colors } from '../../../app.constants';

import styles from './Auth.module.scss';

const Auth = () => {
	const [message, setMessage] = useState('');
	const [viewMessage, setViewMessage] = useState(false);
	const [isViewAuth, setIsViewAuth] = useState(true);
	const {
		onSubmit,
		register,
		handleSubmit,
		errors,
		validatePasswordRepeat,
		onSubmitRegistr,
	} = useAuthPage(setMessage, setViewMessage, setIsViewAuth);
	const { isAuth } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuth) navigate('/home');
	}, [isAuth]);

	const emailError = errors.email?.message;
	const errorPassword = errors.password;
	const errorPasswordRepeat = errors.password_repeat;

	return (
		<Layout>
			<div
				className={`${styles.block__auth} ${isViewAuth ? '' : styles.registrations}`}
			>
				{/* <img
					className={styles.logo__image}
					src='/images/full_logo.svg'
					alt='logo'
				/> */}
				<div className={styles.block__logo}>
					<img
						className={styles.logo__image}
						src='/images/logo.svg'
						alt='logo'
					/>
					<p className={styles.description}>
						<span className={styles.max}>Аналитика</span>
						<br />
						Соцмедиа & СМИ
						<br />
						<span className={styles.mini}>С применением ИИ</span>
					</p>
				</div>
				<h2 className={styles.title}>
					{isViewAuth ? 'Авторизация' : 'Регистрация'}
				</h2>
				<form
					onSubmit={handleSubmit(isViewAuth ? onSubmit : onSubmitRegistr)}
					className={styles.form}
				>
					<div className={styles.block__field}>
						<InputAuth
							type='text'
							placeholder='Введите e-mail'
							register={register}
							id='email'
							label='E-mail'
							styleInput={emailError ? { borderColor: colors.color_red } : {}}
						/>
						{emailError && <span>{errors.email?.message}</span>}
					</div>
					<div className={styles.block__field}>
						<InputAuth
							label='Пароль'
							id='password'
							type='password'
							placeholder='Введите пароль'
							register={register}
							styleInput={
								errorPassword ? { borderColor: colors.color_red } : {}
							}
						/>
						{errorPassword && (
							<span>
								Неверный пароль. Повторите попытку ввода или обратитесь к
								администратору
							</span>
						)}
					</div>
					{!isViewAuth && (
						<div className={styles.block__field}>
							<InputAuth
								label='Повторите пароль'
								id='password_repeat'
								type='password'
								placeholder='Введите пароль'
								register={register}
								styleInput={
									errorPassword ? { borderColor: colors.color_red } : {}
								}
								validate={validatePasswordRepeat}
							/>
							{errorPasswordRepeat && (
								<span>{errors.password_repeat?.message}</span>
							)}
						</div>
					)}
					<Button>{isViewAuth ? 'Войти' : 'Зарегистрироваться'}</Button>
				</form>
				<button
					onClick={() => setIsViewAuth(!isViewAuth)}
					className={styles.switch__button}
				>
					{isViewAuth ? 'Регистрация' : 'Авторизация'}
				</button>
				{viewMessage && (
					<span
						className={`${styles.message} ${message === 'Регистрация прошла успешно!' ? styles.good : ''}`}
					>
						{message}
					</span>
				)}
			</div>
		</Layout>
	);
};

export default Auth;
