import { getFirstWordAfterUnderscore } from './editText';

export const groupByFirstWord = dataArray => {
	return dataArray.reduce((acc, item) => {
		const firstWord = getFirstWordAfterUnderscore(item.file);
		if (!acc[firstWord]) {
			acc[firstWord] = []; // Если группа еще не существует, создаем
		}
		acc[firstWord].push(item); // Добавляем элемент в соответствующую группу
		return acc;
	}, {});
};

function addThreeCircle(authors, data, negative) {
    // Создаем пустые массивы для положительных и отрицательных детей
    const childrenPositive = [];
    const childrenNegative = [];
    
    // Создаем объекты для отслеживания уже добавленных авторов по источникам
    const addedAuthorsPositive = {};
    const addedAuthorsNegative = {};
    
    // Перебираем всех авторов
    authors.forEach(author => {
        let sourceFound = false;
        
        // Проверяем, есть ли у автора тексты
        if (author.texts && author.texts.length > 0) {
            // Перебираем тексты автора для определения источника
            author.texts.forEach(text => {
                if (text.hub) {
                    const hubName = text.hub.toLowerCase();
                    
                    // Проверяем, соответствует ли источник текста одному из источников в данных
                    data.children.forEach(source => {
                        const sourceName = source.name.toLowerCase();
                        
                        // Если источники совпадают, добавляем автора к соответствующему источнику
                        if (hubName.includes(sourceName) || sourceName.includes(hubName)) {
                            // Создаем идентификатор для отслеживания уникальности
                            const authorId = `${author.name}_${source.name}`;
                            
                            // Проверяем, не был ли этот автор уже добавлен к этому источнику
                            if (negative) {
                                if (!addedAuthorsNegative[authorId]) {
                                    // Если автор еще не добавлен, добавляем его
                                    if (!source.children) {
                                        source.children = [];
                                    }
                                    
                                    source.children.push({
                                        name: author.name,
                                        value: author.totalTexts || 1,
                                        colorValue: 0.4
                                    });
                                    
                                    addedAuthorsNegative[authorId] = true;
                                    childrenNegative.push(author.name);
                                }
                            } else {
                                if (!addedAuthorsPositive[authorId]) {
                                    // Если автор еще не добавлен, добавляем его
                                    if (!source.children) {
                                        source.children = [];
                                    }
                                    
                                    source.children.push({
                                        name: author.name,
                                        value: author.totalTexts || 1,
                                        colorValue: 0.4
                                    });
                                    
                                    addedAuthorsPositive[authorId] = true;
                                    childrenPositive.push(author.name);
                                }
                            }
                            
                            sourceFound = true;
                        }
                    });
                }
            });
        }
        
        // Если не найден источник через тексты, пробуем через URL
        if (!sourceFound && author.url) {
            const authorUrl = author.url.toLowerCase();
            
            data.children.forEach(source => {
                const sourceName = source.name.toLowerCase();
                
                if (authorUrl.includes(sourceName) || sourceName.includes(authorUrl)) {
                    const authorId = `${author.name}_${source.name}`;
                    
                    if (negative) {
                        if (!addedAuthorsNegative[authorId]) {
                            if (!source.children) {
                                source.children = [];
                            }
                            
                            source.children.push({
                                name: author.name,
                                value: author.totalTexts || 1,
                                colorValue: 0.4
                            });
                            
                            addedAuthorsNegative[authorId] = true;
                            childrenNegative.push(author.name);
                        }
                    } else {
                        if (!addedAuthorsPositive[authorId]) {
                            if (!source.children) {
                                source.children = [];
                            }
                            
                            source.children.push({
                                name: author.name,
                                value: author.totalTexts || 1,
                                colorValue: 0.4
                            });
                            
                            addedAuthorsPositive[authorId] = true;
                            childrenPositive.push(author.name);
                        }
                    }
                }
            });
        }
    });
    
    // Если для каких-то источников не нашлось авторов, добавляем заглушку
    data.children.forEach(source => {
        if (!source.children || source.children.length === 0) {
            source.children = [{
                name: 'Нет авторов',
                value: 1,
                colorValue: 0.2
            }];
        }
    });
    
    return { childrenPositive, childrenNegative };
}

export const convertDataMultiCalendar = (index1, index2, dataObject) => {
	if (!dataObject || typeof dataObject !== 'object') {
	  console.warn('Invalid dataObject:', dataObject); 
	  return { min_data: 0, max_data: 0 }; 
	}
   
	// Получаем все элементы из всех групп
	const allItems = Object.values(dataObject).flat();
  
	// Преобразуем индексы в строки для сравнения
	const strIndex1 = String(index1);
	const strIndex2 = String(index2);
  
	// Находим объекты, сравнивая index_number как строки
	const obj1 = allItems.find(item => String(item.index_number) === strIndex1);
	const obj2 = allItems.find(item => String(item.index_number) === strIndex2);
  
	if (!obj1 || !obj2) {
	  console.warn('Objects not found:', {
		searchingFor: { index1: strIndex1, index2: strIndex2 },
		availableIndexes: allItems.map(i => i.index_number),
	  });
	  return { min_data: 0, max_data: 0 };
	}
  
	const { min_data: minData1, max_data: maxData1 } = obj1;
	const { min_data: minData2, max_data: maxData2 } = obj2;
  
	// Проверяем пересечение временных промежутков
	const overlapStart = Math.max(minData1, minData2);
	const overlapEnd = Math.min(maxData1, maxData2);
  
	return overlapStart <= overlapEnd
	  ? { min_data: overlapStart, max_data: overlapEnd }
	  : { min_data: 0, max_data: 0 };
  };

export const funksTonality = {
	addColor: (arr, color) => {
		const generateShade = (index, total, color) => {
			const intensity = Math.floor((index / total) * 200); // Меньше значение, чтобы начинать с насыщенного цвета
			if (color === 'red') {
				return `rgb(255, ${intensity}, ${intensity})`; // Начинаем с насыщенного красного
			} else if (color === 'green') {
				return `rgb(${intensity}, 255, ${intensity})`; // Начинаем с насыщенного зеленого
			} else {
				return '#000'; // Черный цвет по умолчанию, если цвет не red и не green
			}
		};
		// Добавляем каждому объекту в массиве поле color с соответствующим оттенком
		return arr.map((item, index) => ({
			...item,
			color: generateShade(index, arr.length, color),
		}));
	},
	convertValuesToValue: data => {
		return data.map(({ values, ...rest }) => ({
			...rest,
			value: values,
		}));
	},
	addThreeCircle: (arrNegAuthor, arrPosAuthor, negHubs, posHubs) => {
		// Создаем объекты для хранения авторов по источникам
		const negativeAuthors = {};
		const positiveAuthors = {};
		
		// Инициализируем объекты для всех источников
		negHubs.forEach(hub => { negativeAuthors[hub.name] = []; });
		posHubs.forEach(hub => { positiveAuthors[hub.name] = []; });
		
		// Отладочная информация
		console.log("Негативные хабы:", negHubs.map(h => h.name));
		console.log("Позитивные хабы:", posHubs.map(h => h.name));
		console.log("Негативные авторы группы:", arrNegAuthor);
		console.log("Позитивные авторы группы:", arrPosAuthor);
		
		// Функция для распределения авторов по источникам
		const processAuthors = (authorGroups, authorsByHub, isNegative) => {
			authorGroups.forEach(group => {
				if (!group.author_data || !Array.isArray(group.author_data)) {
					console.warn("Некорректные данные автора:", group);
					return;
				}
				
				group.author_data.forEach(author => {
					let hubAssigned = false;
					
					// Проверяем тексты автора для определения источника
					if (author.texts && author.texts.length > 0) {
						author.texts.forEach(text => {
							if (text.hub && authorsByHub[text.hub]) {
								// Проверяем, не добавили ли мы уже этого автора
								if (!authorsByHub[text.hub].some(a => a.name === author.fullname)) {
									authorsByHub[text.hub].push({
										name: author.fullname,
										value: author.count_texts || 1,
										url: author.url
									});
									hubAssigned = true;
									console.log(`Автор ${author.fullname} добавлен к хабу ${text.hub}`);
								}
							}
						});
					}
					
					// Если автор не привязан к источнику через тексты, пробуем через URL
					if (!hubAssigned && author.url) {
						Object.keys(authorsByHub).forEach(hubName => {
							const authorUrl = author.url.toLowerCase();
							const hubLower = hubName.toLowerCase();
							
							if (authorUrl.includes(hubLower) || 
								(hubLower.length > 4 && authorUrl.includes(hubLower.substring(0, 4)))) {
								if (!authorsByHub[hubName].some(a => a.name === author.fullname)) {
									authorsByHub[hubName].push({
										name: author.fullname,
										value: author.count_texts || 1,
										url: author.url
									});
									console.log(`Автор ${author.fullname} добавлен к хабу ${hubName} через URL`);
								}
							}
						});
					}
				});
			});
		};
		
		// Обрабатываем негативных и позитивных авторов
		processAuthors(arrNegAuthor, negativeAuthors, true);
		processAuthors(arrPosAuthor, positiveAuthors, false);
		
		// Выводим результаты для отладки
		console.log("Распределение негативных авторов:", negativeAuthors);
		console.log("Распределение позитивных авторов:", positiveAuthors);
		
		return [negativeAuthors, positiveAuthors];
	},

	transformAuthorsData: data => {
		const { negative, positive, childrenNegative, childrenPositive } = data;
	
		const positiveColor = '#006400'; // Цвет для позитивных данных
		const negativeColor = '#8B0000'; // Цвет для негативных данных
	
		const transformedData = [
			{
				id: 'root',
				parent: '',
				name: 'Тональность авторов',
			},
			{
				id: 'negative',
				parent: 'root',
				name: 'Негатив',
				color: negativeColor,
			},
			{
				id: 'positive',
				parent: 'root',
				name: 'Позитив',
				color: positiveColor,
			}
		];
	
		// Добавляем источники негативных сообщений
		negative.forEach((item, index) => {
			transformedData.push({
				id: `negative.${index + 1}`,
				parent: 'negative',
				name: item.name,
				value: item.values
			});
	
			// Добавляем авторов, если они есть
			const authors = childrenNegative[item.name] || [];
			console.log(`Авторы для ${item.name} (негатив):`, authors);
			authors.forEach((author, authorIndex) => {
				transformedData.push({
					id: `negative.${index + 1}.${authorIndex + 1}`,
					parent: `negative.${index + 1}`,
					name: author.name,
					value: author.value,
					url: author.url // Добавляем URL для возможного перехода
				});
			});
		});
	
		// Добавляем источники позитивных сообщений
		positive.forEach((item, index) => {
			transformedData.push({
				id: `positive.${index + 1}`,
				parent: 'positive',
				name: item.name,
				value: item.values
			});
	
			// Добавляем авторов, если они есть
			const authors = childrenPositive[item.name] || [];
			console.log(`Авторы для ${item.name} (позитив):`, authors);
			authors.forEach((author, authorIndex) => {
				transformedData.push({
					id: `positive.${index + 1}.${authorIndex + 1}`,
					parent: `positive.${index + 1}`,
					name: author.name,
					value: author.value,
					url: author.url
				});
			});
		});
	
		console.log('Transformed sunburst data:', transformedData);
		return transformedData;
	},
};

export const funksInformationGraph = {
	modifyParams: params => {
		const data = {
			index: params.index,
			min_date: params.min_range_date,
			max_date: params.max_range_date,
			post: params.post,
			repost: params.repost,
			SMI: params.SMI,
			query_str: params.query_str,
		};

		Object.keys(data).forEach(
			key =>
				(data[key] === false || data[key] === null || data[key] === '') &&
				delete data[key],
		);

		return data;
	},
	convertInformationDataFormat: oldData => {
		const newData = {};

		for (const country in oldData) {
			newData[country] = Object.entries(oldData[country]).map(
				([year, value]) => ({
					year: parseInt(year, 10),
					value: value,
				}),
			);
		}

		return newData;
	},
	generateColorsForObjects: array => {
		const colors = [];
		const hueStep = Math.floor(360 / array.length); // Разделите 360 (полный круг цветов) на количество объектов

		for (let i = 0; i < array.length; i++) {
			const hue = hueStep * i;
			const color = `hsl(${hue}, 100%, 50%)`; // Создайте цвет HSL с насыщенностью 100% и светлотой 50%
			colors.push(color);
		}

		return colors;
	},
	countTextAuthors: array => {
		return array
			.map(author => author.reposts.length)
			.reduce((a, b) => a + b, 0);
	},
	getDomainFromUrl: url => {
		let hostname;
		if (url.indexOf('//') > -1) {
			hostname = url.split('/')[2];
		} else {
			hostname = url.split('/')[0];
		}
		hostname = hostname.split(':')[0];
		hostname = hostname.split('?')[0];
		hostname = hostname.replace('www.', '');
		return hostname;
	},
};

export const funksMedia = {
	convertDataForSplitBubble: data => {
		let newData = [];

		for (let categor in data) {
			if (data.hasOwnProperty(categor)) {
				let transformedData = data[categor].map(item => {
					return {
						name: item.name,
						value: item.index,
						message_count: item.message_count,
					};
				});
				newData.push({
					name: categor === 'positive_smi' ? 'Позитив СМИ' : 'Негатив СМИ',
					data: transformedData,
				});
			}
		}
		return newData;
	},
	convertDataForBubbleChart: data => {
		let newData = [];

		data.forEach(elem => {
			let transformedData = {
				x: elem.time,
				y: elem.index,
				z: 5,
				color: elem.color,
				name: elem.name.slice(0, 2).toUpperCase(),
				source: elem.name,
				url: elem.url,
			};
			newData.push(transformedData);
		});

		return newData;
	},
};

export const funksVoice = {
	getCategoryData: data => {
		const uniqueHubs = [...new Set(data.map(item => item.hub))];

		return uniqueHubs.map(hub => {
			return `${hub} <span class="f16"><span id="flag" class="flag"></span></span>`;
		});
	},
	concatData: data => {
		// Создаем пустой массив для объединенных данных
		let combinedArray = [];

		// Перебираем все объекты в массиве data
		for (const obj of data) {
			if (obj.sunkey_data && Array.isArray(obj.sunkey_data)) {
				// Если у объекта есть свойство sunkey_data и оно является массивом,
				// то добавляем его элементы в combinedArray
				combinedArray = combinedArray.concat(obj.sunkey_data);
			}
		}
		console.log('combinedArray', combinedArray);
		return combinedArray;
	},
	getSeriesData: data => {
		// Получаем уникальные значения hub
		const hubs = [...new Set(data.map(item => item.hub))];

		// Создаем пустой объект для хранения данных серии
		const seriesData = {};

		// Перебираем каждый уникальный hub
		hubs.forEach(hub => {
			// Перебираем каждый объект в данных
			data.forEach(item => {
				// Если tonality еще не существует в seriesData, добавляем его
				if (!seriesData[item.tonality]) {
					seriesData[item.tonality] = {
						name: item.tonality,
						data: new Array(hubs.length).fill(0), // Инициализируем массив нулями
					};
				}

				// Если hub текущего объекта совпадает с текущим hub, добавляем count к соответствующему элементу в массиве
				if (item.hub === hub) {
					const index = hubs.indexOf(hub);
					seriesData[item.tonality].data[index] += item.count;
				}
			});
		});

		// Возвращаем данные серии как массив объектов
		return Object.values(seriesData);
	},

	getCategoriesName: data => {
		let nameCategories = [];

		for (const obj of data) {
			nameCategories.push(obj.name);
		}

		return nameCategories;
	},
	convertDataToSankeyFormat: (data, fulldata) => {
		const nodes = [];
		const links = [];

		// Логика для обработки узлов и связей
		fulldata.forEach(item => {
			// Добавляем узел 'name' если он не существует
			if (!nodes.find(node => node.id === item.name)) {
				nodes.push({ id: item.name });
			}

			const typeCounts = {};
			let totalCount = 0;

			// Считаем общую сумму count для узла 'name'
			item.sunkey_data.forEach(dataItem => {
				if (!nodes.find(node => node.id === dataItem.type)) {
					nodes.push({ id: dataItem.type });
				}

				typeCounts[dataItem.type] =
					(typeCounts[dataItem.type] || 0) + dataItem.count;
				totalCount += dataItem.count;
			});

			// Создаем связи от 'name' к 'type' с суммами count
			Object.entries(typeCounts).forEach(([type, count]) => {
				links.push([item.name, type, count]);
			});
		});

		// Обрабатываем дополнительные данные для связей
		data.forEach(item => {
			// Добавляем узлы если они еще не существуют
			if (!nodes.find(node => node.id === item.hub)) {
				nodes.push({ id: item.hub });
			}
			if (!nodes.find(node => node.id === item.tonality)) {
				nodes.push({ id: item.tonality });
			}
			if (!nodes.find(node => node.id === item.type)) {
				nodes.push({ id: item.type });
			}

			// Добавляем связи
			links.push([item.hub, item.tonality, item.count]);
			links.push([item.type, item.hub, item.count]);
		});

		return { nodes, links };
	},
	// generateColorsForObjects: array => {
	// 	const fixedColors = {
	// 		Нейтрал: '#667085',
	// 		Негатив: '#D92D20',
	// 		Позитив: '#039855',
	// 		Пост: '#FD853A',
	// 		Комментарий: '#FEB173',
	// 		name: '#2E90FA', // Специальный цвет для первого узла с именем 'name'
	// 	};

	// 	const colors = [];
	// 	const hueStep = Math.floor(360 / array.length); // Разделите 360 (полный круг цветов) на количество объектов

	// 	for (let i = 0; i < array.length; i++) {
	// 		const nodeName = array[i].id;

	// 		// Если для узла есть фиксированный цвет, используем его
	// 		if (fixedColors[nodeName]) {
	// 			colors.push(fixedColors[nodeName]);
	// 		} else {
	// 			// Если нет, генерируем цвет HSL
	// 			const hue = hueStep * i;
	// 			const color = `hsl(${hue}, 100%, 50%)`;
	// 			colors.push(color);
	// 		}
	// 	}

	// 	return colors;
	// },
	generateColorsForObjects: array => {
		const fixedColors = {
			Нейтрал: '#667085',
			Негатив: '#D92D20',
			Позитив: '#039855',
			Пост: '#FD853A',
			Комментарий: '#FEB173',
		};

		const colors = [];
		let startColor = '#2E90FA'; // Начальный цвет для первого узла, не имеющего фиксированный цвет

		for (let i = 0; i < array.length; i++) {
			const nodeName = array[i].id;

			// Если для узла установлен фиксированный цвет, используем его
			if (fixedColors[nodeName]) {
				colors.push(fixedColors[nodeName]);
			} else if (colors.length === 0) {
				// Если это первый узел без фиксированного цвета, задаем стартовый цвет
				colors.push(startColor);
			} else {
				// Для остальных узлов генерируем случайные цвета, начиная с HSL
				const hueStep = 360 / (array.length - Object.keys(fixedColors).length);
				const hue = hueStep * (colors.length - Object.keys(fixedColors).length);
				const color = `hsl(${hue}, 100%, 50%)`; // Генерация цвета HSL
				colors.push(color);
			}
		}

		return colors;
	},
};

export const funksCompetitive = {
	convertDataForLineDynamic: data => {
		let newData = [];

		data.forEach(elem => {
			let newObj = {};

			newObj.name = elem.index_name;
			newObj.data = [];

			elem.values.forEach(point =>
				newObj.data.push([point.timestamp, point.count]),
			);

			newData.push(newObj);
		});

		return newData;
	},
	transformBubbleData: (inputObject, useSMI) => {
		const { SMI, Socmedia, index_name } = inputObject;
		const category = useSMI ? SMI : Socmedia;

		// Проверка на случай, если данные отсутствуют
		if (!category || (!category.neg && !category.pos)) {
			console.warn('Нет данных для построения графика:', index_name);
			return {
				name: index_name,
				data: [], // Пустой массив данных, чтобы избежать ошибки Highcharts
			};
		}

		const { neg = [], pos = [] } = category;
		const sourceArray = [...(neg || []), ...(pos || [])];

		// Если массив пуст, возвращаем пустой график
		if (sourceArray.length === 0) {
			console.warn('Пустой массив данных для графика:', index_name);
			return {
				name: index_name,
				data: [],
			};
		}

		// Трансформация данных
		const transformedData = sourceArray.map(item => ({
			name: item?.hub || 'Unknown',
			value: item?.rating || 0, // Установка значения по умолчанию
		}));

		return {
			name: index_name,
			data: transformedData,
		};
	},
	convertDataForBubbleLine: (data, array) => {
		let newData = [];

		data[array].forEach(elem => {
			let transformedData = {
				x: elem.date,
				y: elem.rating,
				z: 20,
				source: elem.name,
				url: elem.url,
			};
			newData.push(transformedData);
		});

		return newData;
	},
};
