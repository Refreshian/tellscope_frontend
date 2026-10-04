import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { $axios } from '@/api';
import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/button/Button';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';
import { useCheckAuth } from '@/hooks/useCheckAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

import styles from './Usage.module.scss';

const rub = value => {
	const number = Number(value) || 0;
	return number.toLocaleString('ru-RU', { minimumFractionDigits: number % 1 ? 2 : 0, maximumFractionDigits: 2 });
};

const minutes = value => {
	const number = Number(value) || 0;
	if (number < 1) return `${Math.round(number * 60)} с`;
	if (number < 60) return `${number.toFixed(1)} мин`;
	const hours = Math.floor(number / 60);
	return `${hours} ч ${Math.round(number - hours * 60)} мин`;
};

const LEVEL_CLASS = { ok: '', warn: '', exceeded: '' };

// Экран «Расходы и лимиты»: видно, сколько потрачено за месяц, на что именно и сколько осталось.
// Наша модель показана в GPU-минутах и помечена как «входит в тариф»: отдельных платежей за
// токены у неё нет, но ресурс не бесконечный.
const Usage = () => {
	useCheckAuth();

	const { active_menu } = useSelector(store => store.booleanValues);
	const me = useCurrentUser();

	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [sending, setSending] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await $axios.get('/usage/me');
			setData(response.data);
			setError('');
		} catch (e) {
			setError('Не удалось загрузить расходы. Обновите страницу или войдите заново.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const toneClass = useMemo(() => {
		const level = data?.levels?.external;
		if (level === 'exceeded') return styles.levelBad;
		if (level === 'warn') return styles.levelWarn;
		return styles.levelOk;
	}, [data]);

	const requestLimit = async () => {
		const message = window.prompt(
			'Что нужно увеличить и на сколько? Это увидят администраторы сервиса.',
			'Прошу увеличить лимит на внешние модели — расходуем больше запланированного',
		);
		if (!message) return;
		setSending(true);
		try {
			await $axios.post('/usage/me/request-limit', { message });
			setNotice('Запрос отправлен администратору сервиса');
		} catch (e) {
			setNotice('Не удалось отправить запрос. Попробуйте позже.');
		} finally {
			setSending(false);
		}
	};

	const maxDay = useMemo(() => {
		const values = (data?.by_day || []).map(item => Number(item.cost_rub) || 0);
		return Math.max(1, ...values);
	}, [data]);

	if (loading && !data) {
		return (
			<Layout>
				<div className={styles.wrapper}>
					<p className={styles.state}>Загружаю расходы…</p>
				</div>
			</Layout>
		);
	}

	const limits = data?.limits || {};
	const spent = data?.spent || {};
	const remaining = data?.remaining || {};
	const internal = data?.internal;

	return (
		<Layout>
			{active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				<div className={styles.wrapper}>
					<div className={styles.head}>
						<div>
							<h2 className={styles.title}>Расходы и лимиты</h2>
							<p className={styles.subtitle}>
								{data?.period?.title} · до сброса лимитов {data?.period?.reset_in_days} дн.
							</p>
						</div>
						<div className={styles.headActions}>
							<a className={styles.linkBtn} href='/api/usage/me.csv'>
								Скачать CSV
							</a>
							<Button style={{ width: '190px', height: '32px', fontSize: '12.5px' }} onClick={requestLimit}>
								{sending ? 'Отправляю…' : 'Запросить больше'}
							</Button>
						</div>
					</div>

					{error && <p className={styles.error}>{error}</p>}
					{notice && <p className={styles.notice}>{notice}</p>}

					{data?.warnings?.length > 0 && (
						<div className={styles.warnings}>
							{data.warnings.map(warning => (
								<p key={warning} className={styles.warning}>
									{warning}
								</p>
							))}
						</div>
					)}

					<div className={styles.cards}>
						<div className={`${styles.card} ${toneClass}`}>
							<span className={styles.cardTitle}>Внешние модели</span>
							<span className={styles.cardValue}>
								{rub(spent.external_rub)} ₽ <span className={styles.cardOf}>из {rub(limits.external_rub_month)} ₽</span>
							</span>
							<div className={styles.bar}>
								<span
									style={{
										width: `${Math.min(100, limits.external_rub_month ? (spent.external_rub / limits.external_rub_month) * 100 : 0)}%`,
									}}
								/>
							</div>
							<span className={styles.cardHint}>
								Осталось {rub(remaining.external_rub)} ₽ · на самую дорогую модель не больше{' '}
								{rub(data?.expensive_limit_rub ?? remaining.expensive_rub + spent.expensive_rub)} ₽
							</span>
							<span className={styles.cardHint}>
								Дневной предохранитель: {rub(spent.tokens_day)} из {rub(limits.tokens_day)} токенов
							</span>
						</div>

						<div className={styles.card}>
							<span className={styles.cardTitle}>Qwen3-32B (наш сервер)</span>
							<span className={styles.cardValue}>
								{minutes(spent.gpu_minutes)} <span className={styles.cardOf}>из {minutes(limits.gpu_minutes_month)}</span>
							</span>
							<div className={styles.bar}>
								<span
									className={styles.barOwn}
									style={{
										width: `${Math.min(100, limits.gpu_minutes_month ? (spent.gpu_minutes / limits.gpu_minutes_month) * 100 : 0)}%`,
									}}
								/>
							</div>
							<span className={styles.cardHint}>Входит в тариф: отдельной оплаты за токены нет</span>
							<span className={styles.cardHint}>
								Вызовов: {data?.own?.calls || 0} · сообщений и запросов обработано: {rub(data?.own?.tokens)}
							</span>
						</div>

						{internal && (
							<div className={styles.card}>
								<span className={styles.cardTitle}>Внутренняя оценка (администратор)</span>
								<span className={styles.cardValue}>{rub(internal.own_cost_rub)} ₽</span>
								<span className={styles.cardHint}>
									Своя модель по цене {rub(internal.own_pricing?.price_in_rub)}/{rub(internal.own_pricing?.price_out_rub)} ₽
									за 1 млн токенов ({internal.own_pricing?.source})
								</span>
								<span className={styles.cardHint}>
									Внешние модели: {rub(internal.external_cost_rub)} ₽ · всего:{' '}
									{rub(internal.total_cost_rub)} ₽
								</span>
							</div>
						)}
					</div>

					{data?.by_model?.length > 0 && (
						<div className={styles.block}>
							<h3 className={styles.blockTitle}>По моделям</h3>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Модель</th>
										<th>Вызовов</th>
										<th>Токенов</th>
										<th>Стоимость</th>
										<th>GPU</th>
									</tr>
								</thead>
								<tbody>
									{data.by_model.map(row => (
										<tr key={`${row.provider}-${row.model}`}>
											<td>
												{row.title}
												{row.price_text ? <span className={styles.muted}> · {row.price_text}</span> : null}
											</td>
											<td className={styles.num}>{rub(row.calls)}</td>
											<td className={styles.num}>{rub(row.tokens)}</td>
											<td className={styles.num}>{row.kind === 'own' ? '—' : `${rub(row.cost_rub)} ₽`}</td>
											<td className={styles.num}>{row.gpu_minutes ? minutes(row.gpu_minutes) : '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{data?.by_kind?.length > 0 && (
						<div className={styles.block}>
							<h3 className={styles.blockTitle}>По видам работ</h3>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Работа</th>
										<th>Вызовов</th>
										<th>Токенов</th>
										<th>Стоимость</th>
									</tr>
								</thead>
								<tbody>
									{data.by_kind.map(row => (
										<tr key={row.key || row.title}>
											<td>{row.title}</td>
											<td className={styles.num}>{rub(row.calls)}</td>
											<td className={styles.num}>{rub(row.tokens)}</td>
											<td className={styles.num}>{row.cost_rub ? `${rub(row.cost_rub)} ₽` : '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{data?.by_day?.length > 0 && (
						<div className={styles.block}>
							<h3 className={styles.blockTitle}>По дням</h3>
							<div className={styles.chart}>
								{data.by_day.map(day => (
									<div key={day.day} className={styles.chartColumn} title={`${day.day}: ${rub(day.cost_rub)} ₽`}>
										<span
											className={styles.chartBar}
											style={{ height: `${Math.max(2, (Number(day.cost_rub) / maxDay) * 100)}%` }}
										/>
										<span className={styles.chartLabel}>{day.day.slice(8)}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{data?.operations?.length > 0 && (
						<div className={styles.block}>
							<h3 className={styles.blockTitle}>Последние операции</h3>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Когда</th>
										<th>Работа</th>
										<th>Модель</th>
										<th>Токенов</th>
										<th>Стоимость</th>
									</tr>
								</thead>
								<tbody>
									{data.operations.map((op, index) => (
										<tr key={`${op.ts}-${index}`}>
											<td className={styles.muted}>{String(op.ts || '').replace('T', ' ').slice(0, 16)}</td>
											<td>{op.kind_title}</td>
											<td>{op.model}</td>
											<td className={styles.num}>{rub(op.tokens)}</td>
											<td className={styles.num}>{op.cost_rub ? `${rub(op.cost_rub)} ₽` : '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<p className={styles.note}>{data?.note}</p>
				</div>
			</Content>
		</Layout>
	);
};

export default Usage;
