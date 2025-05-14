import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { funksCompetitive } from '@/utils/editData';

import { colors } from '@/app.constants';

const BubbleComparison = ({ one, activeSubcategory }) => {
	const { second_graph } = useSelector(state => state.competitiveData);

	const cashingSecond_graph = useMemo(() => second_graph, [second_graph]);

	const selectedGraphData = one
		? cashingSecond_graph[0]
		: cashingSecond_graph[1];

	console.log('activeSubcategory', activeSubcategory);

	const options = useMemo(
		() => ({
			accessibility: {
				enabled: false,
			},
			chart: {
				type: 'packedbubble',
			},
			title: {
				text: null,
			},
			tooltip: {
				useHTML: true,
				pointFormat: '<b>{point.name}:</b> {point.value}',
			},
			plotOptions: {
				packedbubble: {
					minSize: '10%',
					maxSize: '40%',
					zMin: 0,
					zMax: 1000,
					layoutAlgorithm: {
						gravitationalConstant: 0.01,
						splitSeries: true,
						seriesInteraction: false,
						dragBetweenSeries: true,
						parentNodeLimit: true,
					},
					dataLabels: {
						enabled: true,
						format: '{point.name}',
						filter: {
							property: 'y',
							operator: '>',
							value: 250,
						},
						style: {
							color: 'black',
							textOutline: 'none',
							fontWeight: 'normal',
						},
					},
				},
			},
			series: [
				{
					...funksCompetitive.transformBubbleData(
						{
							SMI: selectedGraphData.SMI,
							Socmedia: selectedGraphData.Socmedia,
							index_name: selectedGraphData.index_name,
						},
						activeSubcategory === 'SMI',
					),
					color: one ? colors.blue_bubble : colors.purple_bubble,
				},
			],
		}),
		[selectedGraphData, activeSubcategory, one],
	);

	return (
		<HighchartsReact
			highcharts={Highcharts}
			options={options}
			containerProps={{ style: { width: '100%' } }}
		/>
	);
};

export default BubbleComparison;
