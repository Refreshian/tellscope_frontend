import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsSankey from 'highcharts/modules/sankey';
import { useMemo } from 'react';

import { funksVoice } from '@/utils/editData';
import { colors as colorsConstant } from '@/app.constants';

HighchartsSankey(Highcharts);

const Sankey = ({ filteredData = [] }) => {
  const { nodes, links } = useMemo(() => {
    return funksVoice.convertDataToSankeyFormat(
      funksVoice.concatData(filteredData),
      filteredData,
    );
  }, [filteredData]);

  const colors = useMemo(() => {
    return funksVoice.generateColorsForObjects(nodes);
  }, [nodes]);

  const coloredNodes = useMemo(() => {
    return nodes.map((node, i) => ({
      ...node,
      color: colors[i]
    }));
  }, [nodes, colors]);

  const options = useMemo(
    () => ({
      title: {
        text: null,
      },
      chart: {
        height: 'calc(900/1440*100vw)',
      },
      accessibility: {
        enabled: false,
      },
      tooltip: {
        headerFormat: null,
        pointFormat:
          '{point.fromNode.name} \u2192 {point.toNode.name}: {point.weight:.2f} count',
        nodeFormat: '{point.name}: {point.sum:.2f} count',
      },
      series: [
        {
          keys: ['from', 'to', 'weight'],
          nodes: coloredNodes,
          data: links,
          type: 'sankey',
          dataLabels: {
            enabled: true,
            style: {
              color: colorsConstant.color_full_black,
              textOutline: 'none',
            },
            backgroundColor: colorsConstant.color_white,
            borderRadius: 3,
            padding: 4,
          },
        },
      ],
    }),
    [coloredNodes, links],
  );

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      containerProps={{ style: { width: '100%' } }}
    />
  );
};

export default Sankey;