import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsSolidGauge from "highcharts/modules/solid-gauge";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSelector } from "react-redux";
import { funksVoice } from "@/utils/editData";
import { truncateDescription } from "../../../../../utils/editText";
import styles from "./RadialBar.module.scss";
import { colors } from "@/app.constants";

HighchartsMore(Highcharts);
HighchartsSolidGauge(Highcharts);

const RadialBar = ({ voiceData = [] }) => {
  const [indexData, setIndexData] = useState(-1);
  const originalColors = useRef({});
  const chartComponentRef = useRef(null); // Для доступа к инстансу графика
  const containerRef = useRef(null); // Для ResizeObserver

  const resultData = useMemo(
    () =>
      indexData === -1
        ? funksVoice.concatData(voiceData)
        : voiceData[indexData]?.sunkey_data || [],
    [indexData, voiceData]
  );

  const categoryData = useMemo(
    () => funksVoice.getCategoryData(resultData),
    [resultData]
  );

  const seriesData = useMemo(() => {
    const tonalityColorMap = {
      Позитив: colors.green_graph,
      Негатив: colors.red_graph,
      Нейтрал: colors.grey_graph,
    };
    const series = funksVoice.getSeriesData(resultData);
    series.forEach((serie) => {
      serie.data.sort((a, b) => b - a);
      const tonality = serie.name.trim();
      serie.color = tonalityColorMap[tonality] || colors.grey_graph;
      if (!originalColors.current[serie.name]) {
        originalColors.current[serie.name] = serie.color;
      } else {
        serie.color = originalColors.current[serie.name];
      }
    });
    return series;
  }, [resultData]);

  // Единожды на приложение — цвета графа
  Highcharts.setOptions({
    colors: [colors.grey_graph, colors.green_graph, colors.red_graph],
  });

  const options = useMemo(
    () => ({
      accessibility: { enabled: false },
      title: { text: null },
      chart: {
        type: "column",
        inverted: true,
        polar: true,
        spacingBottom: 0,
        marginBottom: 40, // <--- увеличение нижнего отступа, не даст лишне обрезаться
      },
      tooltip: {
        outside: true,
        formatter: function () {
          return `<b>${this.series.name}</b><br/>${this.x}: ${this.y}`;
        },
      },
      pane: {
        size: "85%",
        innerSize: "5%",
        endAngle: 270,
      },
      xAxis: {
        tickInterval: 1,
        labels: {
          align: "right",
          useHTML: true,
          allowOverlap: true,
          step: 1,
          y: 3,
          style: {
            fontSize: "0.7rem",
          },
        },
        lineWidth: 0,
        gridLineWidth: 0,
        categories: categoryData,
      },
      yAxis: {
        lineWidth: 0,
        tickInterval: 25,
        reversedStacks: false,
        endOnTick: true,
        showLastLabel: true,
        gridLineWidth: 0,
        min: 0,
      },
      plotOptions: {
        column: {
          stacking: "normal",
          borderWidth: 0,
          pointPadding: 0,
          groupPadding: 0.15,
        },
      },
      series: seriesData,
    }),
    [categoryData, seriesData]
  );

  // -- Fix: адаптивность и баг первой отрисовки --
  useEffect(() => {
    const chart = chartComponentRef.current && chartComponentRef.current.chart;
    if (!chart) return;

    if (typeof window !== "undefined") {
      setTimeout(() => {
        chart.reflow(); // сразу после монтирования компонента
      }, 10);
    }
    // Если размер данных или индекс поменялся — тоже reflow
  }, [categoryData, seriesData, indexData]);

  // -- Fix: автоматический reflow по любому изменению размера родителя --
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = chartComponentRef.current && chartComponentRef.current.chart;
    if (!chart) return;

    let frameId = null;
    // Для Highcharts лучше делать reflow через requestAnimationFrame
    const doReflow = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        chart.reflow();
      });
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(doReflow);
      ro.observe(containerRef.current);
      // cleanup
      return () => {
        ro.disconnect();
        if (frameId) cancelAnimationFrame(frameId);
      };
    }
    // Fallback (старые браузеры)
    window.addEventListener("resize", doReflow);
    return () => {
      window.removeEventListener("resize", doReflow);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const handleButtonClick = useCallback((index) => {
    setIndexData(index);
  }, []);

  return (
    <div className={styles.wrapper_graf} ref={containerRef}>
      <div className={styles.block__categories}>
        <button
          className={indexData === -1 ? styles.name_active : styles.name}
          onClick={() => handleButtonClick(-1)}
        >
          Все
        </button>
        {funksVoice
          .getCategoriesName(voiceData)
          .map((name, index) => (
            <button
              key={index}
              className={indexData === index ? styles.name_active : styles.name}
              onClick={() => handleButtonClick(index)}
            >
              {truncateDescription(name, 20)}
            </button>
          ))}
      </div>
      {/* ! Блок графика: flex: 1 1 auto берется из родителя */}
      <div style={{ flex: 1, width: "100%", height: "calc(100% - 82px)" }}>
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          ref={chartComponentRef}
          containerProps={{
            style: {
              width: "100%",
              height: "100%",
              minHeight: "400px",
            },
          }}
        />
      </div>
    </div>
  );
};

export default RadialBar;