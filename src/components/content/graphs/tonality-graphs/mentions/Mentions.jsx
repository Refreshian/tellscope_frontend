import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

import styles from './Mentions.module.scss';

const Mentions = ({ isViewSource, data, setData, activeButton }) => {
	const svgRef = useRef(null);
	const containerRef = useRef(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [activeIndex, setActiveIndex] = useState(null);
	const [deletedData, setDeletedData] = useState([]);

	useEffect(() => setDeletedData([]), [activeButton]);

	// Отслеживание размеров контейнера
	useEffect(() => {
		if (!containerRef.current) return;

		const resizeObserver = new ResizeObserver(entries => {
			if (!entries[0]) return;
			const { width, height } = entries[0].contentRect;
			setDimensions({ width, height });
		});

		resizeObserver.observe(containerRef.current);
		return () => resizeObserver.disconnect();
	}, []);

	// Отрисовка диаграммы
	useEffect(() => {
		if (!svgRef.current || !dimensions.width || !dimensions.height || !data.length) return;

		const svg = d3.select(svgRef.current);
		svg.selectAll('*').remove();

		const margin = 40;
		const width = dimensions.width;
		const height = dimensions.height;
		const radius = Math.min(width, height) / 2 - margin;

		svg.attr('width', width).attr('height', height);

		const g = svg
			.append('g')
			.attr('transform', `translate(${width / 2}, ${height / 2})`);

		const pie = d3
			.pie()
			.value(d => d.value)
			.sort(null);

		const arc = d3
			.arc()
			.innerRadius(radius * 0.6)
			.outerRadius(radius);

		const arcHover = d3
			.arc()
			.innerRadius(radius * 0.6)
			.outerRadius(radius * 1.1);

		const arcs = g
			.selectAll('.arc')
			.data(pie(data))
			.enter()
			.append('g')
			.attr('class', 'arc');

		arcs
			.append('path')
			.attr('d', arc)
			.attr('fill', d => d.data.color)
			.attr('stroke', 'white')
			.attr('stroke-width', 2)
			.style('cursor', 'pointer')
			.style('transition', 'all 0.3s ease')
			.on('mouseenter', function (event, d) {
				setActiveIndex(d.index);
				d3.select(this)
					.transition()
					.duration(200)
					.attr('d', arcHover);
			})
			.on('mouseleave', function () {
				d3.select(this)
					.transition()
					.duration(200)
					.attr('d', arc);
			})
			.on('click', function (event, d) {
				const clickedIndex = d.index;
				setData(prevData => {
					const newData = [...prevData];
					const deletedItem = newData.splice(clickedIndex, 1)[0];
					setDeletedData(prevDeletedData => [...prevDeletedData, deletedItem]);
					return newData;
				});
				setActiveIndex(null);
			});

		// Добавляем текст с информацией при наведении
		const textGroup = g.append('g').attr('class', 'center-text');

		textGroup
			.append('text')
			.attr('class', 'center-name')
			.attr('text-anchor', 'middle')
			.attr('dy', '-0.5em')
			.style('font-size', '16px')
			.style('font-weight', 'bold')
			.style('fill', '#333');

		textGroup
			.append('text')
			.attr('class', 'center-value')
			.attr('text-anchor', 'middle')
			.attr('dy', '1em')
			.style('font-size', '14px')
			.style('fill', '#666');

		// Обновление центрального текста
		const updateCenterText = () => {
			if (activeIndex !== null && data[activeIndex]) {
				textGroup.select('.center-name').text(data[activeIndex].name);
				textGroup.select('.center-value').text(data[activeIndex].value);
			} else {
				textGroup.select('.center-name').text('');
				textGroup.select('.center-value').text('');
			}
		};

		updateCenterText();
	}, [data, dimensions, activeIndex, setData]);

	const handleRestoreClick = useCallback(
		index => {
			setDeletedData(prevDeletedData => {
				const restoredItem = prevDeletedData[index];
				setData(prevData => [...prevData, restoredItem]);
				return prevDeletedData.filter((_, i) => i !== index);
			});
		},
		[setData],
	);

	return (
		<>
			<div ref={containerRef} className={styles.mentionsContainer}>
				<svg ref={svgRef}></svg>
			</div>

			<div
				className={styles.block__sources}
				style={{ opacity: isViewSource ? 1 : 0 }}
			>
				{deletedData.map((entry, index) => (
					<p
						key={`deleted-${index}`}
						onClick={() => handleRestoreClick(index)}
						style={{ cursor: 'pointer', color: entry.color }}
					>
						{entry.name}
					</p>
				))}
			</div>
		</>
	);
};

export default Mentions;