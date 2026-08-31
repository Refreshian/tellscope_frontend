export const findKeyById = (id, obj) => {
	//HELP: Проходимся по каждому ключу в объекте
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const array = obj[key];
			//HELP: Проверяем, является ли значение массивом
			if (Array.isArray(array)) {
				//HELP: Ищем объект с совпадающим id в массиве
				const found = array.find(
					item => Number(item.index_number) === Number(id),
				);
				if (found) {
					return key; //HELP: Возвращаем название ключа, если найдено совпадение
				}
			}
		}
	}
	return null; //HELP: Если ничего не найдено, возвращаем null
};
