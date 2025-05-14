import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';

import { funksInformationGraph } from '@/utils/editData';

import { truncateDescription } from '../../../../../utils/editText';

const ScatterChart = ({ data }) => {
	const chartComponent = useRef(null);
	const colors = useMemo(() => funksInformationGraph.generateColorsForObjects(data?.values || []), [data]);
  
	const newData = useMemo(() => {
	  return data?.values?.map(author => ({
		name: author.author.fullname,
		id: author.author.fullname,
		marker: { symbol: 'circle' },
		url: author.author.url,
		data: [
		  {
			x: Number(author.author.timeCreate),
			y: author.author.audienceCount,
			url: author.author.url,
			name: author.author.fullname,
		  },
		],
	  }));
	}, [data]);

	const options = useMemo(
		() => ({
			accessibility: {
				enabled: false,
			},
			chart: {
				type: 'scatter',
				zoomType: 'xy',
			},
			title: {
				text: null,
			},
			xAxis: {
				type: 'datetime',
				title: {
					text: 'Дата / время',
				},
				labels: {
					formatter: function () {
						return Highcharts.dateFormat(
							'%a %e %b %Y, %H:%M',
							this.value * 1000,
						);
					},
				},
				startOnTick: true,
				endOnTick: true,
				showLastLabel: true,
			},
			yAxis: {
				title: {
					text: 'Аудитория',
				},
				labels: {
					format: '{value}',
				},
			},
			legend: {
				enabled: true,
				labelFormatter: function () {
					return truncateDescription(this.name, 10); // Сокращаем имя только для легенды
				},
			},
			plotOptions: {
				series: {
					cursor: 'pointer',
					point: {
						events: {
							click: function () {
								window.open(this.options.url, '_blank');
							},
						},
					},
				},
				scatter: {
					marker: {
						radius: 4.5,
						symbol: 'circle',
						states: {
							hover: {
								enabled: true,
								lineColor: 'rgb(100,100,100)',
							},
						},
					},
					states: {
						hover: {
							marker: {
								enabled: false,
							},
						},
					},
					jitter: {
						x: 0.005,
					},
				},
			},
			tooltip: {
				formatter: function () {
					const { url, name, y: audienceCount } = this.point.options;
					return `Источник: <a href="${url}" target="_blank">${funksInformationGraph.getDomainFromUrl(url)}</a><br/>Автор: ${name}<br/>Аудитория: ${audienceCount}`;
				},
				useHTML: true,
			},
			series: newData,
		}),
		[newData],
	);

	return (
		<HighchartsReact
			ref={chartComponent}
			highcharts={Highcharts}
			options={options}
			containerProps={{ style: { width: '100%' } }}
		/>
	);
};

export default ScatterChart;
