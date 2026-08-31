import Highcharts from 'highcharts';
import { useEffect, useRef, useState } from 'react';

// import styles from './BarInformation.module.scss';

const BarInformation = () => {
	// Константы начального и конечного года и число стран для отображения
	const startYear = 1960;
	const endYear = 2022;
	const nbr = 20;

	// Состояния для данных, текущего года, идентификатора таймера и экземпляра графика
	const [dataset, setDataset] = useState(null);
	const [year, setYear] = useState(startYear);
	const [timer, setTimer] = useState(null);
	const [chart, setChart] = useState(null);

	// Реф для контейнера графика
	const chartContainerRef = useRef(null);

	// Функция для получения данных для указанного года
	const getData = year => {
		if (!dataset) return [];
		const output = Object.entries(dataset)
			.map(([countryName, countryData]) => [
				countryName,
				Number(countryData[year]),
			])
			.sort((a, b) => b[1] - a[1]);
		// Вернём самый большой показатель отдельно и остальные страны
		return [output[0], output.slice(1, nbr)];
	};

	// Функция для формирования подзаголовка графика
	const getSubtitle = year => {
		const topData = getData(year);
		if (!topData || !topData[0]) return '';
		const population = (topData[0][1] / 1e9).toFixed(2);
		return `<span style="font-size: 80px">${year}</span>
       <br>
       <span style="font-size: 22px">
         Total: <b>${population}</b> billion
       </span>`;
	};

	// Функция обновления графика – изменяет подзаголовок и данные серии
	const updateChart = newYear => {
		if (!chart) return;
		chart.update(
			{
				subtitle: {
					text: getSubtitle(newYear),
				},
			},
			false,
			false,
			false,
		);
		chart.series[0].update({
			name: newYear,
			data: getData(newYear)[1],
		});
		chart.redraw();
	};

	// Обработчик изменения значения диапазона
	const handleRangeChange = e => {
		const newYear = parseInt(e.target.value, 10);
		setYear(newYear);
		updateChart(newYear);
	};

	// Функции для управления анимацией (пауза и воспроизведение)
	const pause = () => {
		if (timer) {
			clearInterval(timer);
			setTimer(null);
		}
	};

	const play = () => {
		// Сначала останавливаем, если таймер уже запущен
		pause();
		const newTimer = setInterval(() => {
			setYear(prevYear => {
				if (prevYear >= endYear) {
					pause();
					return prevYear;
				}
				const nextYear = prevYear + 1;
				updateChart(nextYear);
				return nextYear;
			});
		}, 500);
		setTimer(newTimer);
	};

	const handlePlayPause = () => {
		if (timer) {
			pause();
		} else {
			play();
		}
	};

	// Инициализируем график после загрузки данных
	useEffect(() => {
		// Загружаем демо-данные с сервера Highcharts
		fetch('https://demo-live-data.highcharts.com/population.json')
			.then(response => response.json())
			.then(data => {
				setDataset(data);
				// Создаём экземпляр графика после загрузки данных
				const initialData = getData(startYear);
				const chartInstance = Highcharts.chart(chartContainerRef.current, {
					chart: {
						animation: { duration: 500 },
						marginRight: 50,
					},
					title: {
						text: 'World population by country',
						align: 'left',
					},
					subtitle: {
						useHTML: true,
						text: getSubtitle(startYear),
						floating: true,
						align: 'right',
						verticalAlign: 'middle',
						y: -80,
						x: -100,
					},
					legend: {
						enabled: false,
					},
					xAxis: {
						type: 'category',
					},
					yAxis: {
						opposite: true,
						tickPixelInterval: 150,
						title: {
							text: null,
						},
					},
					plotOptions: {
						series: {
							animation: false,
							groupPadding: 0,
							pointPadding: 0.1,
							borderWidth: 0,
							colorByPoint: true,
							dataSorting: {
								enabled: true,
								matchByName: true,
							},
							type: 'bar',
							dataLabels: {
								enabled: true,
							},
						},
					},
					series: [
						{
							type: 'bar',
							name: startYear,
							data: initialData ? initialData[1] : [],
						},
					],
					responsive: {
						rules: [
							{
								condition: {
									maxWidth: 550,
								},
								chartOptions: {
									xAxis: {
										visible: false,
									},
									subtitle: {
										x: 0,
									},
									plotOptions: {
										series: {
											dataLabels: [
												{
													enabled: true,
													y: 8,
												},
												{
													enabled: true,
													format: '{point.name}',
													y: -8,
													style: {
														fontWeight: 'normal',
														opacity: 0.7,
													},
												},
											],
										},
									},
								},
							},
						],
					},
				});
				setChart(chartInstance);
			});

		// Очистка таймера и уничтожение графика при размонтировании компонента
		return () => {
			pause();
			if (chart) {
				chart.destroy();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<figure className='highcharts-figure'>
			<div id='parent-container'>
				<div id='play-controls'>
					<button
						id='play-pause-button'
						onClick={handlePlayPause}
						title={timer ? 'pause' : 'play'}
					>
						{timer ? 'Pause' : 'Play'}
					</button>
					<input
						id='play-range'
						type='range'
						value={year}
						min={startYear}
						max={endYear}
						onChange={handleRangeChange}
					/>
				</div>
				<div id='container' ref={chartContainerRef}></div>
			</div>
			<p className='highcharts-description'>
				Bar chart showing the world population by countries from 1960 to 2022.
			</p>
		</figure>
	);
};

export default BarInformation;
