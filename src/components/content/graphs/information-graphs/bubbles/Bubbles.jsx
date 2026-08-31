import * as am5 from '@amcharts/amcharts5';
import * as am5hierarchy from '@amcharts/amcharts5/hierarchy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

import styles from './Bubbles.module.scss';

const Bubbles = ({ data }) => {
	const chartRef = useRef(null);
  
	useEffect(() => {
	  if (!data?.values || data.values.length === 0) return;
  
	  if (chartRef.current) {
		chartRef.current.dispose();
	  }
  
	  const root = am5.Root.new('chartdiv');
	  root.setThemes([am5themes_Animated.new(root)]);
  
	  const container = root.container.children.push(
		am5.Container.new(root, {
		  width: am5.percent(100),
		  height: am5.percent(100),
		  layout: root.verticalLayout,
		}),
	  );
  
	  const series = container.children.push(
		am5hierarchy.Tree.new(root, {
		  singleBranchOnly: false,
		  downDepth: 1,
		  initialDepth: 5,
		  topDepth: 0,
		  valueField: 'value',
		  categoryField: 'name',
		  childDataField: 'children',
		  orientation: 'vertical',
		}),
	  );
  
	series.nodes.template.events.on('dblclick', function (ev) {
	const data = ev.target.dataItem.dataContext;
	if (!data.type) { // если это главный круг или нужный вам тип
		ev.preventDefault?.();  // отменяет дефолтное действие (зум)
		ev.stopPropagation?.(); // на всякий случай останавливает всплытие
		return;
	}
	// если это не главный круг — ваше основное действие (например, открыть URL)
	const url = data.url;
	if (url) {
		window.open(url);
	}
	});

		series.nodes.template.events.on('click', function (ev) {
		const data = ev.target.dataItem.dataContext;
		// Это исходный автор (верхний родитель)
		// Его type не установлен (у него нет type), у остальных кругов type есть
		if (!data.type) {
			// Отменяем стандартное поведение (зум на исходный круг)
			ev.preventDefault?.();
			return;
		}
		// иначе даем работать зуму (ничего не делаем)
		});
  
	  series.data.setAll([
		{
		  name: data.values[0].author.fullname,
		  url: data.values[0].author.url || '',
		  value: 0,
		  children: data.values.map(author => ({
			name: author.author.fullname,
			url: author.author.url || '',
			type: 'values',
			...(author.reposts.length === 0
			  ? { value: author.author.audienceCount }
			  : {
				  children: author.reposts.map(repost => ({
					name: repost.fullname,
					value: repost.audienceCount,
					url: repost.url || '',
					type: 'reposts',
				  })),
				}),
		  })),
		},
	  ]);
  
	  series.set('selectedDataItem', series.dataItems[0]);
	  chartRef.current = root;
  
	  return () => {
		if (chartRef.current) {
		  chartRef.current.dispose();
		  chartRef.current = null;
		}
	  };
	}, [data]); // Зависимость от пропса data
  
	return (
	  <TransformWrapper>
		<TransformComponent>
		  <div id="chartdiv" className={styles.chartdiv}></div>
		</TransformComponent>
	  </TransformWrapper>
	);
  };

export default Bubbles;
