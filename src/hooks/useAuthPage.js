import { useForm } from 'react-hook-form';
import { useAuth } from './useAuth';
import { authService } from '@/services/auth.service';

export const useAuthPage = (setMessage, setViewMessage, setIsViewAuth) => {
  const { setIsAuth } = useAuth();

const {
  register,
  handleSubmit,
  watch,
  formState: { errors },
} = useForm({
  mode: 'onChange',
  defaultValues: {
    username: '', // Добавьте это
  },
});

  const onSubmit = async data => {
    console.log(data);
    authService.login(data.email, data.password, setIsAuth);
  };

  const onSubmitRegistr = async data => {
    setViewMessage(true);
    try {
      console.log(data);
      await authService.registration(
        data.email,
        data.password,
        data.username, // Добавляем username
        2              // role_id (можете изменить по необходимости)
      );
      setMessage('Регистрация прошла успешно!');
      setIsViewAuth(true);
    } catch (error) {
      console.error(error);
      setMessage(
        error.response?.data?.detail || 
        'Ошибка регистрации, попробуйте еще раз.'
      );
    } finally {
      setTimeout(() => setViewMessage(false), 3000);
    }
  };

  const validatePasswordRepeat = value => {
    return value === watch('password') || 'Пароли не совпадают';
  };

  return {
    onSubmit,
    register,
    handleSubmit,
    errors,
    validatePasswordRepeat,
    onSubmitRegistr,
  };
};