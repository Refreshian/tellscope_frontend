import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import sunburst from 'highcharts/modules/sunburst';
import { useMemo } from 'react';
import { funksTonality } from '@/utils/editData';
import styles from './AuthorsGraph.module.scss';

sunburst(Highcharts);


const AuthorsGraph = ({ cashingData, isViewSource }) => {
  const { negative_hubs: negative = [], positive_hubs: positive = [] } = 
    cashingData?.tonality_hubs_values || {};

    const [childrenNegative, childrenPositive] = useMemo(() => {
      try {
        const result = funksTonality.addThreeCircle( 
          cashingData?.negative_authors_values || [],
          cashingData?.positive_authors_values || [],
          negative,
          positive
        );
        console.log("Результат addThreeCircle:", result);
        return result;
      } catch (error) {
        console.error('Error in addThreeCircle:', error);
        return [{}, {}];
      }
    }, [cashingData, negative, positive]);
    
    const cashingTransformAuthorsData = useMemo(() => {
      try {
        const transformedData = funksTonality.transformAuthorsData({
          negative,
          positive,
          childrenNegative,
          childrenPositive,
        });
        console.log("Трансформированные данные:", transformedData);
        return transformedData;
      } catch (error) {
        console.error('Error transforming authors data:', error);
        return [];
      }
    }, [negative, positive, childrenNegative, childrenPositive]);

  const renderAuthors = () => {
    const allAuthors = [];
    
    const addAuthors = (authors, tonality) => {
      authors?.forEach((authorGroup, index) => {
        authorGroup?.author_data?.forEach((authorData, dataIndex) => {
          allAuthors.push(
            <p 
              key={`${tonality}-${index}-${dataIndex}`} 
              className={styles.author_item}
            >
              {authorData.fullname} ({tonality})
            </p>
          );
        });
      });
    };
  
    addAuthors(cashingData?.negative_authors_values, 'негативный');
    addAuthors(cashingData?.positive_authors_values, 'позитивный');
  
    return allAuthors;
  };

  const options = useMemo(() => ({
    accessibility: { enabled: false },
    chart: { height: 'calc(800/1440*100vw)' },
    colors: ['transparent'].concat(Highcharts.getOptions().colors),
    title: { text: null },
    subtitle: { text: null },
    series: [{
      type: 'sunburst',
      data: cashingTransformAuthorsData,
      name: 'Root',
      allowDrillToNode: true,
      borderRadius: 3,
      cursor: 'pointer',
      dataLabels: {
        format: '{point.name}',
        filter: { property: 'innerArcLength', operator: '>', value: 16 },
        style: { textOverflow: 'ellipsis', color: '#333', fontSize: '11px' }
      },
      levels: [
        {
          level: 1,
          levelIsConstant: false,
          dataLabels: { filter: { property: 'outerArcLength', operator: '>', value: 64 } }
        },
        { level: 2, colorByPoint: true, dataLabels: { style: { fontSize: '10px' } } },
        { 
          level: 3, 
          colorVariation: { key: 'brightness', to: -0.5 },
          dataLabels: { style: { fontSize: '9px' } }
        },
        { 
          level: 4, 
          colorVariation: { key: 'brightness', to: 0.5 },
          dataLabels: { style: { fontSize: '8px' } }
        }
      ],
      point: {
        events: {
          mouseOver() {
            const point = this;
            this.graphic.element.addEventListener('dblclick', () => {
              if (point.options?.url) {
                window.open(point.options.url, '_blank');
              }
            });
          }
        }
      }
    }],
    tooltip: {
      headerFormat: '',
      pointFormat: 'Источник - <b>{point.name}</b><br>Количество сообщений - <b>{point.value}</b>'
    }
  }), [cashingTransformAuthorsData]);

  return (
    <>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          ...options,
          series: [{ ...options.series[0], data: cashingTransformAuthorsData }]
        }}
        containerProps={{ style: { width: '100%' } }}
      />

      <div
        className={styles.block__sources}
        style={isViewSource ? { display: 'flex' } : { display: 'none' }}
      >
        {renderAuthors()}
      </div>
    </>
  );
};

export default AuthorsGraph;