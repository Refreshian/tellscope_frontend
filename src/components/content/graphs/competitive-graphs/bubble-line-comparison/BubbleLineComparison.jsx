import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { funksCompetitive } from '@/utils/editData';

import { colors } from '@/app.constants';

const BubbleLineComparison = ({ activeSubcategory }) => {
	const { third_graph } = useSelector(state => state.competitiveData);
	const cashingThird_graph = useMemo(() => third_graph, [third_graph]);

	const options = useMemo(
		() => ({
			chart: {
				type: 'bubble',
				plotBorderWidth: 1,
				zoomType: 'xy',
			},
			legend: {
				enabled: true,
			},
			title: {
				text: null,
			},
			subtitle: {
				text: null,
			},
			accessibility: {
				enabled: false, //HELP: Отключаем модуль доступности
			},
			xAxis: {
				type: 'datetime',
				dateTimeLabelFormats: {
					day: '%e. %b %Y',
					month: "%e. %b '%Y",
					year: '%Y',
				},
				gridLineWidth: 1,
				title: {
					text: 'Data',
				},
				accessibility: {
					enabled: false,
				},
			},
			yAxis: {
				startOnTick: false,
				endOnTick: false,
				title: {
					text: 'Rating',
				},
				labels: {
					format: '{value}',
				},
				maxPadding: 0.2,
				accessibility: {
					enabled: false,
				},
			},
			tooltip: {
				useHTML: true,
				headerFormat: '<table>',
				pointFormat:
					'<tr><th colspan="2"><h3>{point.source}</h3></th></tr>' +
					'<tr><th>Rating:</th><td>{point.y}</td></tr>' +
					'<tr><th>Size:</th><td>{point.z}</td></tr>',
				footerFormat: '</table>',
				followPointer: true,
			},
			plotOptions: {
				bubble: {
					minSize: 0.1,
					maxSize: 20,
				},
				series: {
					cursor: 'pointer',
					point: {
						events: {
							click: function () {
								window.open(this.options.url, '_blank');
							},
						},
					},
					dataLabels: {
						enabled: true,
						format: '{point.name}',
					},
				},
			},
			series: [
				{
					name: cashingThird_graph[0].index_name,
					data: funksCompetitive.convertDataForBubbleLine(
						cashingThird_graph[0],
						activeSubcategory,
					),
					color: colors.blue_bubble,
				},
				{
					name: cashingThird_graph[1].index_name,
					data: funksCompetitive.convertDataForBubbleLine(
						cashingThird_graph[1],
						activeSubcategory,
					),
					color: colors.purple_bubble,
				},
			],
		}),
		[cashingThird_graph, activeSubcategory],
	);

	return (
		<HighchartsReact
			highcharts={Highcharts}
			options={options}
			containerProps={{ style: { width: '100%' } }}
		/>
	);
};

export default BubbleLineComparison;
