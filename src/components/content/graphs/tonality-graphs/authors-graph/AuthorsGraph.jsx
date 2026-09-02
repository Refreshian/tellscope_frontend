import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import sunburst from 'highcharts/modules/sunburst';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { funksTonality } from '@/utils/editData';
import { capSunburstPoints } from '@/utils/chartPerf';

import styles from './AuthorsGraph.module.scss';

sunburst(Highcharts);

const esc = value =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const ruCount = (n, one, few, many) => {
	const abs = Math.abs(Number(n) || 0) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (last === 1) return one;
	if (last >= 2 && last <= 4) return few;
	return many;
};

const hostFromUrl = url => {
	if (!url) return '';
	try {
		const withProto = url.includes('://') ? url : `https://${url}`;
		return new URL(withProto).hostname.replace(/^www\./, '');
	} catch {
		return String(url).replace(/^https?:\/\//, '').split('/')[0];
	}
};

const sortMessages = messages =>
	[...(messages || [])]
		.filter(item => item?.url)
		.sort(
			(a, b) =>
				(b.views || 0) - (a.views || 0) ||
				(b.audience || 0) - (a.audience || 0) ||
				(b.likes || 0) - (a.likes || 0),
		);

const openUrl = url => {
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
};

const AuthorsGraph = ({ cashingData, isViewSource }) => {
	const wrapRef = useRef(null);
	const hoverRef = useRef(null);
	const [side, setSide] = useState(0);
	const [picker, setPicker] = useState(null);

	const { negative_hubs: negative = [], positive_hubs: positive = [] } =
		cashingData?.tonality_hubs_values || {};

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		let frame = 0;
		const apply = width => {
			const height = el.clientHeight;
			const next = Math.floor(Math.max(0, Math.min(width, height)));
			setSide(prev => (Math.abs(prev - next) < 4 ? prev : next));
		};

		const observer = new ResizeObserver(entries => {
			const width = entries[0]?.contentRect?.width || 0;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => apply(width));
		});
		observer.observe(el);
		apply(el.clientWidth);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, []);

	const [childrenNegative, childrenPositive] = useMemo(() => {
		try {
			return funksTonality.addThreeCircle(
				cashingData?.negative_authors_values || [],
				cashingData?.positive_authors_values || [],
				negative,
				positive,
			);
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
			return capSunburstPoints(transformedData);
		} catch (error) {
			console.error('Error transforming authors data:', error);
			return [];
		}
	}, [negative, positive, childrenNegative, childrenPositive]);

	const busy = cashingTransformAuthorsData.length > 120;

	const openAuthorPoint = useCallback(point => {
		const opts = point?.options || {};
		if (opts.role !== 'author') return;
		const messages = sortMessages(opts.messages);
		if (messages.length === 1) {
			openUrl(messages[0].url);
			return;
		}
		if (messages.length > 1) {
			setPicker({
				author: point.name,
				hub: opts.hub,
				messages,
			});
			return;
		}
		openUrl(opts.url);
	}, []);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return undefined;
		const onDblClick = event => {
			event.preventDefault();
			const target = event.target?.closest?.('path.highcharts-point, .highcharts-point') || event.target;
			const point = target?.point || hoverRef.current;
			if (point) openAuthorPoint(point);
		};
		el.addEventListener('dblclick', onDblClick);
		return () => el.removeEventListener('dblclick', onDblClick);
	}, [openAuthorPoint, side]);

	useEffect(() => {
		if (!picker) return undefined;
		const onKey = event => {
			if (event.key === 'Escape') setPicker(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [picker]);

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
						</p>,
					);
				});
			});
		};
		addAuthors(cashingData?.negative_authors_values, 'негативный');
		addAuthors(cashingData?.positive_authors_values, 'позитивный');
		return allAuthors;
	};

	const options = useMemo(
		() => ({
			accessibility: { enabled: false },
			chart: {
				height: side || null,
				width: side || null,
				backgroundColor: 'transparent',
				spacing: [4, 4, 4, 4],
				animation: !busy,
			},
			colors: ['transparent'].concat(Highcharts.getOptions().colors),
			title: { text: null },
			subtitle: { text: null },
			credits: { enabled: false },
			plotOptions: {
				sunburst: {
					animation: !busy,
					dataLabels: {
						enabled: !busy,
					},
				},
			},
			series: [
				{
					type: 'sunburst',
					data: cashingTransformAuthorsData,
					name: 'Root',
					allowDrillToNode: true,
					borderRadius: 3,
					cursor: 'pointer',
					turboThreshold: 0,
					dataLabels: {
						format: '{point.name}',
						filter: { property: 'innerArcLength', operator: '>', value: 22 },
						style: { textOverflow: 'ellipsis', color: '#333', fontSize: '11px' },
					},
					levels: [
						{
							level: 1,
							levelIsConstant: false,
							dataLabels: {
								filter: { property: 'outerArcLength', operator: '>', value: 64 },
							},
						},
						{
							level: 2,
							colorByPoint: true,
							dataLabels: { style: { fontSize: '10px' } },
						},
						{
							level: 3,
							colorVariation: { key: 'brightness', to: -0.5 },
							dataLabels: { style: { fontSize: '9px' } },
						},
						{
							level: 4,
							colorVariation: { key: 'brightness', to: 0.5 },
							dataLabels: { style: { fontSize: '8px' } },
						},
					],
					point: {
						events: {
							mouseOver() {
								hoverRef.current = this;
							},
							mouseOut() {
								if (hoverRef.current === this) hoverRef.current = null;
							},
						},
					},
				},
			],
			tooltip: {
				useHTML: true,
				headerFormat: '',
				formatter() {
					const point = this.point;
					const opts = point.options || {};
					const count = point.value ?? opts.value ?? '';
					if (opts.role === 'author') {
						const n = Number(opts.messages?.length) || Number(count) || 0;
						const hint =
							n > 1
								? '<br><span style="opacity:.65">Двойной щелчок — выбрать сообщение</span>'
								: n === 1
									? '<br><span style="opacity:.65">Двойной щелчок — открыть сообщение</span>'
									: '';
						return (
							`Автор - <b>${esc(point.name)}</b><br>` +
							`Количество сообщений - <b>${esc(count)}</b><br>` +
							`Источник - <b>${esc(opts.hub)}</b>${hint}`
						);
					}
					if (opts.role === 'hub') {
						return (
							`Источник - <b>${esc(point.name)}</b><br>` +
							`Количество сообщений - <b>${esc(count)}</b>`
						);
					}
					if (count !== '' && count != null && opts.role !== 'root') {
						return `<b>${esc(point.name)}</b><br>Количество сообщений - <b>${esc(count)}</b>`;
					}
					return `<b>${esc(point.name)}</b>`;
				},
			},
		}),
		[cashingTransformAuthorsData, side, busy],
	);

	return (
		<>
			<div ref={wrapRef} className={styles.chartFill}>
				{side > 40 && (
					<HighchartsReact
						highcharts={Highcharts}
						options={options}
						immutable={busy}
						containerProps={{
							style: { width: side, height: side, maxWidth: '100%' },
						}}
					/>
				)}
				{picker && (
					<div className={styles.picker} role="dialog" aria-label="Сообщения автора">
						<div className={styles.pickerHead}>
							<div>
								<p className={styles.pickerKicker}>Автор</p>
								<strong>{picker.author}</strong>
								<p className={styles.pickerMeta}>Источник - {picker.hub}</p>
							</div>
							<button
								type="button"
								className={styles.pickerClose}
								onClick={() => setPicker(null)}
								aria-label="Закрыть"
							>
								×
							</button>
						</div>
						<p className={styles.pickerHint}>
							{picker.messages.length}{' '}
							{ruCount(
								picker.messages.length,
								'сообщение',
								'сообщения',
								'сообщений',
							)}
							. Сначала самое просматриваемое.
						</p>
						<ul className={styles.pickerList}>
							{picker.messages.map((item, index) => {
								const views = Number(item.views) || 0;
								const likes = Number(item.likes) || 0;
								const host = hostFromUrl(item.url) || picker.hub;
								return (
									<li key={`${item.url}-${index}`}>
										<button type="button" onClick={() => openUrl(item.url)}>
											<strong>
												{index === 0 ? 'Самое просматриваемое' : `Сообщение ${index + 1}`}
											</strong>
											<span>{host}</span>
											<em>
												{views
													? `${views.toLocaleString('ru-RU')} ${ruCount(views, 'просмотр', 'просмотра', 'просмотров')}`
													: 'без просмотров'}
												{likes
													? ` · ${likes.toLocaleString('ru-RU')} ${ruCount(likes, 'лайк', 'лайка', 'лайков')}`
													: ''}
											</em>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</div>
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
