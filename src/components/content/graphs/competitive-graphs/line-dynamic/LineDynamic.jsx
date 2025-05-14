import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { funksCompetitive } from '@/utils/editData';

const LineDynamic = () => {
	const { first_graph } = useSelector(state => state.competitiveData);
	const cashingFirst_graph = useMemo(() => first_graph, [first_graph]);

	const options = useMemo(
		() => ({
			accessibility: {
				enabled: false, //HELP: Отключаем модуль доступности
			},
			chart: {
				height: 'calc(900/1440*100vw)',
				zoomType: 'xy',
				type: 'spline',
				scrollablePlotArea: {
					minWidth: 600,
					scrollPositionX: 1,
				},
			},
			title: {
				text: null,
			},
			subtitle: {
				text: null,
			},
			xAxis: {
				title: {
					text: 'Time',
				},
				type: 'datetime',
				labels: {
					overflow: 'justify',
				},
			},
			yAxis: {
				title: {
					text: 'Count',
				},
				minorGridLineWidth: 0,
				gridLineWidth: 0,
				alternateGridColor: null,
			},
			plotOptions: {
				spline: {
					lineWidth: 4,
					states: {
						hover: {
							lineWidth: 5,
						},
					},
					marker: {
						enabled: false,
					},
					pointInterval: 3600000, // one hour
					pointStart: Date.UTC(2020, 3, 15, 0, 0, 0),
				},
			},

			series: funksCompetitive.convertDataForLineDynamic(first_graph),
			navigation: {
				menuItemStyle: {
					fontSize: '10px',
				},
			},
		}),
		[cashingFirst_graph],
	);

	return (
		<HighchartsReact
			highcharts={Highcharts}
			options={options}
			containerProps={{ style: { width: '100%' } }}
		/>
	);
};

export default LineDynamic;
