import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { funksInformationGraph } from '@/utils/editData';
import {
	convertDateFormat,
	convertFromTimestampToRegular,
} from '@/utils/timestamp';

import styles from './BarInformation.module.scss';

const BarInformation = () => {
	const { dynamicdata_audience } = useSelector(
		state => state.informationGraphData,
	);
	const chartComponent = useRef(null);

	const data =
		funksInformationGraph.convertInformationDataFormat(dynamicdata_audience);

	let firstObjectKey = Object.keys(data)[0];
	let firstObjectValue = data[firstObjectKey];

	const nbr = 20;
	const startStep = 0;
	const endStep = Object.keys(data[firstObjectKey]).length - 1;
	const [currentStep, setCurrentStep] = useState(startStep);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const FLOAT = /^-?\d+\.?\d*$/;

		Highcharts.Fx.prototype.textSetter = function () {
			let startValue = this.start.replace(/ /g, ''),
				endValue = this.end.replace(/ /g, ''),
				currentValue = this.end.replace(/ /g, '');

			if ((startValue || '').match(FLOAT)) {
				startValue = parseInt(startValue, 10);
				endValue = parseInt(endValue, 10);
				currentValue = Highcharts.numberFormat(
					Math.round(startValue + (endValue - startValue) * this.pos),
					0,
				);
			}

			this.elem.endText = this.end;

			this.elem.attr(this.prop, currentValue, null, true);
		};

		Highcharts.SVGElement.prototype.textGetter = function () {
			const ct = this.text.element.textContent || '';
			return this.endText ? this.endText : ct.substring(0, ct.length / 2);
		};

		Highcharts.wrap(
			Highcharts.Series.prototype,
			'drawDataLabels',
			function (proceed) {
				const attr = Highcharts.SVGElement.prototype.attr,
					chart = this.chart;

				if (chart.sequenceTimer) {
					this.points.forEach(point =>
						(point.dataLabels || []).forEach(
							label =>
								(label.attr = function (hash) {
									if (
										hash &&
										hash.text !== undefined &&
										chart.isResizing === 0
									) {
										const text = hash.text;

										delete hash.text;

										return this.attr(hash).animate({ text });
									}
									return attr.apply(this, arguments);
								}),
						),
					);
				}

				const ret = proceed.apply(
					this,
					Array.prototype.slice.call(arguments, 1),
				);

				this.points.forEach(p =>
					(p.dataLabels || []).forEach(d => (d.attr = attr)),
				);

				return ret;
			},
		);
	}, [Highcharts]);

	const getData = index => {
		if (!data) {
			return [[], []];
		}

		const output = Object.entries(data)
			.map(country => {
				const [countryName, countryData] = country;
				return [countryName, Number(countryData[index].value)];
			})
			.sort((a, b) => b[1] - a[1]);
		return [output[0], output.slice(0, nbr)];
	};

	const getSubtitle = () => {
		const population = getData(currentStep)[0][1];
		return `<span style="font-size: 2rem">${convertDateFormat(
			convertFromTimestampToRegular(firstObjectValue[currentStep].year),
		)}</span>
        <br>
        <span style="font-size: 22px">
            Total: <b>: ${population}</b>
        </span>`;
	};

	const options = {
		accessibility: {
			enabled: false,
		},
		chart: {
			animation: {
				duration: 500,
			},
			marginRight: 50,
		},
		title: {
			text: null,
		},
		subtitle: {
			useHTML: true,
			text: getSubtitle(),
			floating: true,
			align: 'right',
			verticalAlign: 'middle',
			y: 80,
			x: -100,
		},
		legend: {
			enabled: false,
		},
		xAxis: {
			type: 'category',
		},
		yAxis: {
			type: 'datetime',
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
				name: startStep,
				data: getData(startStep)[1],
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
	};

	const pause = () => {
		setIsPlaying(false);
		clearInterval(chartComponent.current.chart.sequenceTimer);
		chartComponent.current.chart.sequenceTimer = undefined;
	};

	const update = (increment = 0) => {
		setCurrentStep(prev => {
			const newStep = prev + increment;
			if (newStep > endStep) {
				pause();
				return prev;
			}
			return newStep;
		});

		if (chartComponent.current) {
			const chart = chartComponent.current.chart;
			chart.update(
				{
					subtitle: {
						text: getSubtitle(),
					},
				},
				false,
				false,
				false,
			);

			chart.series[0].update({
				name: currentStep,
				data: getData(currentStep)[1],
			});
		}
	};

	const play = () => {
		setIsPlaying(true);
		chartComponent.current.chart.sequenceTimer = setInterval(() => {
			setCurrentStep(prevYear =>
				prevYear < endStep ? prevYear + 1 : prevYear,
			);
		}, 500);
	};

	const togglePlay = () => {
		if (isPlaying) {
			pause();
		} else {
			if (currentStep === endStep) setCurrentStep(startStep);
			play();
		}
	};

	useEffect(() => {
		update();
	}, [currentStep]);

	useEffect(() => {
		if (!isPlaying) {
			update();
		}
	}, [isPlaying]);

	return (
		<div className={styles.wrapper_bar}>
			<div className={styles.block__button}>
				<button className={styles.button__play} onClick={togglePlay}>
					{isPlaying ? '\u2758 \u2758' : '\u25B6'}
				</button>
				<input
					className={styles.range}
					type='range'
					value={currentStep}
					min={startStep}
					max={endStep}
					onChange={event => setCurrentStep(Number(event.target.value))}
				/>
			</div>
			<HighchartsReact
				ref={chartComponent}
				highcharts={Highcharts}
				options={options}
			/>
		</div>
	);
};

export default BarInformation;
