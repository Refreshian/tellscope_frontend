import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { funksMedia } from '@/utils/editData';
import { convertFromTimestampToTime } from '../../../../../utils/timestamp';

const BubbleChart = ({ filteredData }) => {
  const safeFilteredData = filteredData && Array.isArray(filteredData.filtered_second_graph)
    ? filteredData
    : { filtered_second_graph: [] };

  // Пустой массив = пустой график, но чарт будет показан
  const seriesData = useMemo(
    () => funksMedia.convertDataForBubbleChart(safeFilteredData.filtered_second_graph),
    [safeFilteredData]
  );

  const options = useMemo(
    () => ({
      chart: {
        type: 'bubble',
        plotBorderWidth: 1,
        zoomType: 'xy',
      },
      legend: {
        enabled: false,
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
          text: 'Дата',
        },
        accessibility: {
          enabled: false, //HELP: Отключаем модуль доступности
        },
      },
      yAxis: {
        startOnTick: false,
        endOnTick: false,
        title: {
          text: 'Индекс СМИ',
        },
        labels: {
          format: '{value}',
        },
        maxPadding: 0.2,
        accessibility: {
          enabled: false, //HELP: Отключаем модуль доступности
        },
      },
      tooltip: {
        useHTML: true,
        headerFormat: '<table>',
        pointFormatter: function () {
          const time = convertFromTimestampToTime(this.x);
          const rating = this.y === 0 ? '-' : this.y; // Определяем значение рейтинга
          return `
            <tr><th colspan="2"><h3>${this.source}</h3></th></tr>
            <tr><th>Рейтинг:</th><td>${rating}</td></tr>
            <tr><th>Время:</th><td>${time}</td></tr>
          `;
        },
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
          data: seriesData,
          colorByPoint: false,
        },
      ],
      // ... прочее
    }),
    [seriesData]
  );

  const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: 0,
  };

  // показывать всегда, даже если данных нет (Highcharts покажет пустоту)
  return (
    <div style={containerStyle}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ style: { width: '100%', height: '100%' } }}
      />
    </div>
  );
};

export default BubbleChart;