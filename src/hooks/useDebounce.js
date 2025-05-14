import { useRef, useState } from 'react';

export const useDebounce = (setStateValue, delay, length, default_value) => {
	// const timeoutId = useRef(null); // Храним таймаут в useRef

	// return (...args) => {
	// 	if (timeoutId.current) clearTimeout(timeoutId.current); // Очищаем предыдущий таймаут

	// 	timeoutId.current = setTimeout(() => {
	// 		callback(...args); // Вызываем callback через заданную задержку
	// 	}, delay);
	// };

	const [value, setValue] = useState(default_value);
	//HELP: Ref для хранения ID таймера
	const timeoutId = useRef(null);

	//HELP: Функция для обработки ввода
	const onChange = e => {
		const newValue = e.target.value;

		//HELP: Мгновенно обновляем состояние инпута
		if (newValue.length <= length) setValue(newValue);

		//HELP: Очищаем предыдущий таймер
		if (timeoutId.current) {
			clearTimeout(timeoutId.current);
		}

		//HELP: Устанавливаем новый таймер для дебаунсинга
		timeoutId.current = setTimeout(
			() => setStateValue(newValue), //HELP: Обновляем дебаунсированное значение
			delay,
		);
	};

	return { onChange, value };
};
