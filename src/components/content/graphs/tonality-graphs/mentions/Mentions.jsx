import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

import { topNWithOther, TOP_PIE_SLICES } from '@/utils/chartPerf';

import styles from './Mentions.module.scss';

const Mentions = ({ data, setData, activeButton, onVisibleChange, hubStats }) => {
	const svgRef = useRef(null);
	const containerRef = useRef(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [deletedData, setDeletedData] = useState([]);

	const formatCount = value => Number(value || 0).toLocaleString('ru-RU');


	useEffect(() => setDeletedData([]), [activeButton]);

	useEffect(() => {
		onVisibleChange?.({
			type: 'mentions',
			side: activeButton,
			hubNames: (data || []).map(item => item.name).filter(Boolean),
		});
	}, [data, activeButton, onVisibleChange]);

	useEffect(() => {
		if (!containerRef.current) return;
		let frame = 0;
		const observer = new ResizeObserver(entries => {
			if (!entries[0]) return;
			const { width, height } = entries[0].contentRect;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				setDimensions(prev =>
					Math.abs(prev.width - width) < 4 && Math.abs(prev.height - height) < 4
						? prev
						: { width, height },
				);
			});
		});
		observer.observe(containerRef.current);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, []);

	const chartData = useMemo(() => topNWithOther(data, TOP_PIE_SLICES), [data]);

	useEffect(() => {
		if (!svgRef.current || !dimensions.width || !dimensions.height || !chartData.length)
			return;

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

		const pie = d3.pie().value(d => d.value).sort(null);
		const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
		const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 1.08);

		const textGroup = g.append('g').attr('class', 'center-text');
		textGroup
			.append('text')
			.attr('class', 'center-tone')
			.attr('text-anchor', 'middle')
			.attr('dy', '-34px')
			.style('font-size', '20px')
			.style('font-weight', 'bold')
			.style('fill', '#101828');
		textGroup
			.append('text')
			.attr('class', 'center-tone-label')
			.attr('text-anchor', 'middle')
			.attr('dy', '-16px')
			.style('font-size', '10.5px')
			.style('fill', '#8a94a6');
		textGroup
			.append('text')
			.attr('class', 'center-total')
			.attr('text-anchor', 'middle')
			.attr('dy', '24px')
			.style('font-size', '13.5px')
			.style('font-weight', '600')
			.style('fill', '#101828');
		textGroup
			.append('text')
			.attr('class', 'center-total-label')
			.attr('text-anchor', 'middle')
			.attr('dy', '37px')
			.style('font-size', '10.5px')
			.style('fill', '#8a94a6');
		textGroup
			.append('text')
			.attr('class', 'center-pct')
			.attr('text-anchor', 'middle')
			.attr('dy', '55px')
			.style('font-size', '13px')
			.style('font-weight', '600')
			.style('fill', '#101828');
		textGroup
			.append('text')
			.attr('class', 'center-pct-label')
			.attr('text-anchor', 'middle')
			.attr('dy', '67px')
			.style('font-size', '10.5px')
			.style('fill', '#8a94a6');

		const toneNoun =
			activeButton === 'Негативные упоминания'
				? 'Негативных сообщений'
				: 'Позитивных сообщений';

		const toneRemaining = (data || []).reduce(
			(sum, item) => sum + (Number(item.value) || 0),
			0,
		);
		const totalRemaining = (data || []).reduce((sum, item) => {
			const st = hubStats?.[item.name];
			if (st) return sum + st.neg + st.pos + st.neu;
			return sum + (Number(item.value) || 0);
		}, 0);

		const pctShare = totalRemaining > 0 ? (toneRemaining / totalRemaining) * 100 : 0;
		const pctText = `${pctShare.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`;
		const pctLabel =
			activeButton === 'Негативные упоминания'
				? 'Негативных от общего'
				: 'Позитивных от общего';

		const setCenterDefault = () => {
			textGroup.select('.center-tone').text(formatCount(toneRemaining));
			textGroup.select('.center-tone-label').text(toneNoun);
			textGroup.select('.center-total').text(formatCount(totalRemaining));
			textGroup.select('.center-total-label').text('Всего сообщений');
			textGroup.select('.center-pct').text(pctText);
			textGroup.select('.center-pct-label').text(pctLabel);
		};
		const setCenterHover = (name, count) => {
			textGroup.select('.center-tone').text(name || '');
			textGroup.select('.center-tone-label').text('');
			textGroup.select('.center-total').text(formatCount(count));
			textGroup.select('.center-total-label').text('сообщений');
			textGroup.select('.center-pct').text('');
			textGroup.select('.center-pct-label').text('');
		};
		setCenterDefault();

		const arcs = g.selectAll('.arc').data(pie(chartData)).enter().append('g').attr('class', 'arc');

		arcs
			.append('path')
			.attr('d', arc)
			.attr('fill', d => d.data.color)
			.attr('stroke', 'white')
			.attr('stroke-width', chartData.length > 24 ? 1 : 2)
			.style('cursor', 'pointer')
			.on('mouseenter', function (event, d) {
				d3.select(this).attr('d', arcHover);
				setCenterHover(d.data.name || '', d.data.value ?? '');
			})
			.on('mouseleave', function () {
				d3.select(this).attr('d', arc);
				setCenterDefault();
			})
			.on('click', function (event, d) {
				if (d.data.isOther) return;
				const clickedName = d.data.name;
				setData(prevData => {
					const idx = prevData.findIndex(item => item.name === clickedName);
					if (idx < 0) return prevData;
					const next = [...prevData];
					const deletedItem = next.splice(idx, 1)[0];
					setDeletedData(prevDeleted => [...prevDeleted, deletedItem]);
					return next;
				});
			});
	}, [chartData, dimensions, setData]);

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
		<div className={styles.mentionsWrap}>
			<div ref={containerRef} className={styles.mentionsContainer}>
				<svg ref={svgRef}></svg>
			</div>
			{deletedData.length > 0 && (
				<div
					className={styles.block__sources}
					style={
						activeButton === 'Негативные упоминания'
							? {
									background: 'rgba(217, 45, 32, 0.07)',
									borderColor: 'rgba(217, 45, 32, 0.35)',
								}
							: activeButton === 'Позитивные упоминания'
								? {
										background: 'rgba(3, 152, 85, 0.07)',
										borderColor: 'rgba(3, 152, 85, 0.35)',
									}
								: undefined
					}
				>
					<div className={styles.bandHead}>
						<span className={styles.cellName}>Источник</span>
						<span className={styles.cell}>Всего</span>
						<span className={styles.cell}>Позитив</span>
						<span className={styles.cell}>Негатив</span>
						<span className={styles.cell}>Нейтрал</span>
						<span className={styles.cell}>Аудитория</span>
					</div>
					{deletedData.map((entry, index) => {
						const s = hubStats?.[entry.name];
						const neg = s?.neg || 0;
						const pos = s?.pos || 0;
						const neu = s?.neu || 0;
						const aud = s?.aud ?? (Number(entry.audience_sum) || 0);
						const total = neg + pos + neu;
						return (
							<button
								type='button'
								key={`deleted-${index}`}
								className={styles.bandRow}
								onClick={() => handleRestoreClick(index)}
								title='Клик — вернуть источник на график'
							>
								<span className={styles.cellName}>
									<span
										className={styles.restoreDot}
										style={{ background: entry.color }}
									/>
									<span className={styles.restoreName}>{entry.name}</span>
								</span>
								<span className={styles.cell}>{formatCount(total)}</span>
								<span className={`${styles.cell} ${styles.vPos}`}>{formatCount(pos)}</span>
								<span className={`${styles.cell} ${styles.vNeg}`}>{formatCount(neg)}</span>
								<span className={`${styles.cell} ${styles.vNeu}`}>{formatCount(neu)}</span>
								<span className={`${styles.cell} ${styles.vAud}`}>{formatCount(aud)}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default memo(Mentions);
