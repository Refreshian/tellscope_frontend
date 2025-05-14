import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import packedbubble from 'highcharts/highcharts-more';
import { useMemo } from 'react';
import { funksMedia } from '@/utils/editData';


if (typeof Highcharts === 'object') {
  packedbubble(Highcharts);
}

const SplitBubble = ({ filteredData }) => {
	const positive = filteredData?.filtered_first_graph?.positive_smi ?? [];
	const negative = filteredData?.filtered_first_graph?.negative_smi ?? [];
	const merged = [...positive, ...negative];
  
const seriesData = useMemo(() => {
  return funksMedia
    .convertDataForSplitBubble({
      positive_smi: positive,
      negative_smi: negative
    })
    .map((series, index) => {
      const colors = ['#006400', '#8B0000'];
      return {
        ...series,
        color: colors[index % colors.length],
      };
    });
}, [positive, negative]);

  const options = useMemo(
    () => ({
      accessibility: {
        enabled: false,
      },
      chart: {
        type: 'packedbubble',
        height: 'calc(800/1440*100vw)',
      },
      title: {
        text: null,
      },
      tooltip: {
        useHTML: true,
        pointFormat:
          '<b>Источник:</b> {point.name} </br> <b>Рейтинг:</b> {point.value} </br> <b>Количество:</b> {point.message_count}',
      },
      plotOptions: {
        packedbubble: {
          minSize: '10%',
          maxSize: '50%',
          zMin: 0,
          zMax: 1000,
          layoutAlgorithm: {
            gravitationalConstant: 0.05,
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
      series: seriesData.length ? seriesData : [{ name: '', data: [] }],
      // даже если данных нет, должен быть хотя бы один объект series
    }),
    [seriesData]
  );

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      containerProps={{ style: { width: '100%' } }}
    />
  );
};

export default SplitBubble;