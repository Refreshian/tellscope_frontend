
import { useEffect, useState } from 'react';
import Content from '@/components/content/Content';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';

const getToken = () => {
	const m = document.cookie.split('; ').find(x => x.startsWith('token='));
	return m ? decodeURIComponent(m.slice('token='.length)) : '';
};

const api = async (url, opts) => {
	const headers = { 'Content-Type': 'application/json' };
	const tok = getToken();
	if (tok) headers['Authorization'] = 'Bearer ' + tok;
	const r = await fetch('/api' + url, { headers, ...opts });
	let data = null;
	try { data = await r.json(); } catch (e) {}
	if (!r.ok) throw new Error((data && data.detail) || r.statusText);
	return data;
};

const input = {
	padding: '7px 10px',
	borderRadius: 8,
	border: '1px solid #d0d7e2',
	fontSize: 13,
	marginRight: 8,
};
const btn = {
	padding: '8px 14px',
	borderRadius: 8,
	border: '0',
	background: '#1760e8',
	color: '#fff',
	cursor: 'pointer',
	fontSize: 13,
};
const miniBtn = {
	display: 'block',
	width: '128px',
	flex: '0 0 128px',
	boxSizing: 'border-box',
	border: '1px solid #d0d7e2',
	borderLeft: '4px solid #1760e8',
	background: '#fff',
	borderRadius: 6,
	padding: '6px 10px',
	margin: 0,
	cursor: 'pointer',
	fontSize: 12,
	color: '#344054',
	textAlign: 'left',
};
const redBtn = {
	display: 'block',
	width: '128px',
	flex: '0 0 128px',
	boxSizing: 'border-box',
	border: '1px solid #fecdca',
	borderLeft: '4px solid #c53030',
	background: '#fff',
	borderRadius: 6,
	padding: '6px 10px',
	margin: 0,
	cursor: 'pointer',
	fontSize: 12,
	color: '#c53030',
	textAlign: 'left',
};
const card = {
	border: '1px solid rgba(16,24,40,.1)',
	borderRadius: 10,
	padding: '14px 16px',
	margin: '10px 0',
	background: '#fff',
};

const AdminPage = () => {
	const [ok, setOk] = useState(null); // null=loading,false=forbidden,true=admin
	const [users, setUsers] = useState([]);
	const [shares, setShares] = useState([]);
	const [owners, setOwners] = useState([]);
	const [err, setErr] = useState('');
	const [meId, setMeId] = useState(null);
	const [actUser, setActUser] = useState(null);
	const [actDays, setActDays] = useState([]);
	const [actLoading, setActLoading] = useState(false);


	// user create form
	const [uEmail, setUEmail] = useState('');
	const [uPass, setUPass] = useState('');
	const [uName, setUName] = useState('');
	const [uSuper, setUSuper] = useState(false);

	// share form
	const [ownerId, setOwnerId] = useState('');
	const [ownerFolders, setOwnerFolders] = useState([]);
	const [folder, setFolder] = useState('');
	const [targetId, setTargetId] = useState('');
	const [access, setAccess] = useState('read');
	const [llmUsage, setLlmUsage] = useState([]);
	const [llmDays, setLlmDays] = useState([]);

	const reload = async () => {
		const [us, sh, lu, ld] = await Promise.all([
			api('/admin/users'), api('/admin/shares'), api('/admin/llm-usage'), api('/admin/llm-usage/days?days=30'),
		]);
		setLlmUsage(lu && lu.rows ? lu.rows : []);
		setLlmDays(ld && ld.rows ? llmDaySums(ld.rows) : []);
		setUsers(us);
		setShares(sh.shares || []);
		setOwners(us);
	};

	useEffect(() => {
		(async () => {
			try {
				const me = await api('/me');
				setMeId(me.id);
				await reload();
				setOk(true);
			} catch (e) {
				setOk(false);
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const createUser = async () => {
		setErr('');
		try {
			await api('/admin/users', {
				method: 'POST',
				body: JSON.stringify({
					email: uEmail,
					password: uPass,
					username: uName || 'user',
					role_id: 1,
					is_active: true,
					is_superuser: uSuper,
					is_verified: true,
				}),
			});
			setUEmail(''); setUPass(''); setUName(''); setUSuper(false);
			await reload();
		} catch (e) { setErr(String((e && e.message) || e)); }
	};

	const openActivity = async u => {
		setActUser(u); setActDays([]); setActLoading(true);
		try {
			const d = await api('/admin/user-days/' + u.id);
			setActDays(d.days || []);
		} catch (e) { setActDays([]); }
		setActLoading(false);
	};
	const closeActivity = () => { setActUser(null); setActDays([]); };

	const pickOwner = async id => {
		setOwnerId(id);
		const f = await api('/admin/folders/' + id);
		setOwnerFolders(f.folders || []);
		setFolder('');
	};

	const grant = async () => {
		setErr('');
		try {
			await api('/admin/shares', {
				method: 'POST',
				body: JSON.stringify({ owner_user_id: Number(ownerId), folder, user_id: Number(targetId), access }),
			});
			await reload();
		} catch (e) { setErr(String((e && e.message) || e)); }
	};

	const revoke = async share => {
		setErr('');
		try {
			await api('/admin/shares', {
				method: 'DELETE',
				body: JSON.stringify({ owner_user_id: share.owner_user_id, folder: share.folder, user_id: share.user_id, access: share.access }),
			});
			await reload();
		} catch (e) { setErr(String((e && e.message) || e)); }
	};

	const patchUser = async (id, payload) => {
		setErr('');
		try {
			await api('/admin/users/' + id, {
				method: 'PATCH',
				body: JSON.stringify(payload),
			});
			await reload();
		} catch (e) { setErr(String((e && e.message) || e)); }
	};

	const delUser = async u => {
		if (!window.confirm('Удалить аккаунт «' + u.email + '»?\nБудут удалены сам пользователь, все его доступы и данные наборов. Это действие необратимо.')) return;
		if (!window.confirm('Вы уверены? Удалить окончательно?')) return;
		setErr('');
		try {
			await api('/admin/users/' + u.id, { method: 'DELETE' });
			await reload();
		} catch (e) { setErr(String((e && e.message) || e)); }
	};

	if (ok === null) return <div style={{ padding: 24 }}>Проверка прав…</div>;
	if (ok === false) return <div style={{ padding: 24 }}>Раздел доступен только администратору.</div>;

	return (
		<Layout>
			<LeftMenu />
			<Content alignStart style={{ width: '100%', overflowY: 'auto', alignItems: 'flex-start', justifyContent: 'flex-start', paddingBottom: 28 }}>
		<div style={{ width: '100%', maxWidth: 1500, margin: '0 auto', padding: '18px 28px', fontFamily: 'inherit', boxSizing: 'border-box' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
				<h2 style={{ margin: 0 }}>Пользователи и доступ</h2>
				<span style={{ color: '#98a2b3', fontSize: 12 }}>Управление пользователями, доступом к наборам данных и аккаунтами Brand Analytics</span>
			</div>
			{err && <div style={{ color: '#c53030', marginBottom: 8 }}>{err}</div>}

			<div style={card}>
				<b>Создать пользователя</b>
				<div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
					<input placeholder='Email' value={uEmail} onChange={e => setUEmail(e.target.value)} style={input} />
					<input placeholder='Пароль' type='password' value={uPass} onChange={e => setUPass(e.target.value)} style={input} />
					<input placeholder='Имя' value={uName} onChange={e => setUName(e.target.value)} style={input} />
					<label style={{ fontSize: 12, marginRight: 10 }}>
						<input type='checkbox' checked={uSuper} onChange={e => setUSuper(e.target.checked)} /> админ
					</label>
					<button style={btn} onClick={createUser}>Создать</button>
				</div>
			</div>

			<div style={card}>
				<b>Пользователи</b>
				<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 13 }}>
					<thead><tr><th style={th}>ID</th><th style={th}>Email</th><th style={th}>Имя</th><th style={th}>Админ</th><th style={th}>Активен</th><th style={th}>Активность</th><th style={th}>Действия</th><th style={th}>Дата выдачи</th></tr></thead>
					<tbody>
						{users.map(u => (
							<tr key={u.id}>
								<td style={td}>{u.id}</td>
								<td style={td}>{u.email}</td>
								<td style={td}>{u.username}</td>
								<td style={td}>{u.is_superuser ? 'да' : ''}</td>
								<td style={td}>{u.is_active ? 'да' : 'нет'}</td>
								<td style={td}><div style={{ fontSize: 11, color: '#667085', lineHeight: 1.5, whiteSpace: 'nowrap' }}><button type='button' onClick={() => openActivity(u)} title='Показать время в системе по дням' style={{ border: 0, background: 'none', padding: 0, color: '#1760e8', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', fontFamily: 'inherit' }}>заходов: {u.login_count || 0}</button><br />последний вход: {fmtDate(u.last_login)}<br />в системе: {fmtDur(u.total_seconds)}</div></td>
							<td style={td}>
							<div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, alignItems: 'flex-start' }}>
							{u.id !== meId && (u.is_superuser ? (
								<button style={miniBtn} onClick={() => patchUser(u.id, { is_superuser: false })}>снять админа</button>
							) : (
								<button style={miniBtn} onClick={() => patchUser(u.id, { is_superuser: true })}>сделать админом</button>
							))}
							{u.id !== meId && (u.is_active ? (
								<button style={miniBtn} onClick={() => patchUser(u.id, { is_active: false })}>деактивировать</button>
							) : (
								<button style={miniBtn} onClick={() => patchUser(u.id, { is_active: true })}>активировать</button>
							))}
							<button style={miniBtn} onClick={async () => {
								const p = window.prompt('Новый пароль для ' + u.email + ' (мин. 6 символов)');
								if (!p) return;
								await patchUser(u.id, { password: p });
							}}>сбросить пароль</button>
						
						{u.id !== meId && (
							<button style={redBtn} onClick={() => delUser(u)}>удалить аккаунт</button>
						)}
						</div></td>
						<td style={td}><div style={{ whiteSpace: 'nowrap' }}>{fmtDate(u.registered_at)}</div></td>
					</tr>
						))}
					</tbody>
				</table>
			</div>

			<div style={card}>
				<b>Выдать доступ к папке</b>
				<div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
					<select style={input} value={ownerId} onChange={e => pickOwner(e.target.value)}>
						<option value=''>Владелец данных…</option>
						{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
					</select>
					<select style={input} value={folder} onChange={e => setFolder(e.target.value)}>
						<option value=''>Папка…</option>
						{ownerFolders.map(f => <option key={f.name} value={f.name}>{f.name} ({f.files})</option>)}
					</select>
					<select style={input} value={targetId} onChange={e => setTargetId(e.target.value)}>
						<option value=''>Кому…</option>
						{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
					</select>
					<select style={input} value={access} onChange={e => setAccess(e.target.value)}>
						<option value='read'>только чтение</option>
						<option value='write'>чтение и редактирование</option>
					</select>
					<button style={btn} onClick={grant}>Выдать</button>
				</div>
			</div>

			<div style={card}>
				<b>Выданные доступы</b>
				{shares.length === 0 && <div style={{ color: '#98a2b3', marginTop: 6 }}>Пока нет выданных доступов</div>}
				{shares.map((s, i) => (
					<div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px dashed #e6eaf0', fontSize: 13 }}>
						<span>владелец #{s.owner_user_id} · папка «{s.folder}» · пользователь #{s.user_id} · {s.access === 'read' ? 'чтение' : 'чтение+запись'}</span>
						<button style={{ border: 0, background: 'none', color: '#c53030', cursor: 'pointer' }} onClick={() => revoke(s)}>забрать</button>
					</div>
				))}
			</div>

			<div style={card}>
				<b>Потребление ИИ (LLM-токены)</b>
				<div style={{ color: '#667085', fontSize: 12, marginTop: 4 }}>
					Учёт запросов и токенов по аккаунтам, страницам и моделям (задел под биллинг).
				</div>
				{llmUsage.length === 0 && (
					<div style={{ color: '#98a2b3', marginTop: 8, fontSize: 13 }}>Пока нет данных — токены появятся после первого запроса к ИИ</div>
				)}
				{llmUsage.length > 0 && (
					<div style={{ marginTop: 10 }}>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
							{[
								{ label: 'Запросы', v: llmUsage.reduce((s, r) => s + r.requests, 0) },
								{ label: 'Токены вход', v: llmUsage.reduce((s, r) => s + (r.prompt_tokens || 0), 0) },
								{ label: 'Токены выход', v: llmUsage.reduce((s, r) => s + (r.completion_tokens || 0), 0) },
								{ label: 'Токены всего', v: llmUsage.reduce((s, r) => s + (r.total_tokens || 0), 0) },
							].map(x => (
								<div key={x.label} style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 10, padding: '6px 12px', fontSize: 12 }}>
									<b style={{ color: '#152A5A' }}>{x.v.toLocaleString('ru-RU')}</b>&nbsp; {x.label}
								</div>
							))}
						</div>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
							<thead>
								<tr>
									<th style={th}>Аккаунт</th><th style={th}>Кейс (страница)</th><th style={th}>Провайдер</th><th style={th}>Модель</th>
									<th style={th}>Запросы</th><th style={th}>Токены in</th><th style={th}>Токены out</th><th style={th}>Всего</th><th style={th}>Стоимость, $</th>
								</tr>
							</thead>
							<tbody>
								{llmUsage.map((r, idx) => {
									const u = users.find(x => Number(x.id) === Number(r.user_id));
									return (
										<tr key={idx}>
											<td style={td}>{u ? u.email : (r.user_id === 0 || r.user_id == null ? '— (не определён)' : '#' + r.user_id)}</td>
											<td style={td}>{caseLabel(r.case_id)}</td>
											<td style={td}>{r.provider}</td>
											<td style={td}><div style={{ wordBreak: 'break-word' }}>{r.model}</div></td>
											<td style={td}>{r.requests}</td>
											<td style={td}>{(r.prompt_tokens || 0).toLocaleString('ru-RU')}</td>
											<td style={td}>{(r.completion_tokens || 0).toLocaleString('ru-RU')}</td>
											<td style={td}>{(r.total_tokens || 0).toLocaleString('ru-RU')}</td>
											<td style={td}>{Number(r.cost_usd || 0).toFixed(5)}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{llmDays.length > 0 && (
					<div style={{ marginTop: 16 }}>
						<b style={{ fontSize: 13, color: '#152A5A' }}>По дням (30 дней)</b>
						<div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 8, minHeight: 96, overflowX: 'auto', paddingBottom: 2 }}>
							{llmDays.slice(-30).map(x => {
								const max = Math.max(1, ...llmDays.slice(-30).map(y => y.total_tokens));
								const h = Math.max(4, Math.round((x.total_tokens / max) * 70));
								const k = Math.round(x.total_tokens / 1000);
								return (
									<div key={x.day} title={x.day + ' · ' + x.total_tokens.toLocaleString('ru-RU') + ' токенов · $' + Number(x.cost_usd).toFixed(4)} style={{ flex: '0 0 auto', textAlign: 'center' }}>
										<div style={{ width: 18, height: h, background: 'linear-gradient(180deg, #7C8CFF, #38C6FF)', borderRadius: '3px 3px 0 0', margin: '0 auto' }} />
										<div style={{ fontSize: 9, color: '#98a2b3', marginTop: 3 }}>{k >= 1 ? k + 'k' : ''}</div>
									</div>
								);
							})}
						</div>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
							<thead>
								<tr>
									<th style={th}>Дата</th><th style={th}>Запросы</th><th style={th}>Токены in</th><th style={th}>Токены out</th><th style={th}>Всего</th><th style={th}>Стоимость, $</th>
								</tr>
							</thead>
							<tbody>
								{llmDays.slice(-30).slice().reverse().map(x => (
									<tr key={x.day}>
										<td style={td}>{x.day}</td>
										<td style={td}>{x.requests}</td>
										<td style={td}>{x.prompt_tokens.toLocaleString('ru-RU')}</td>
										<td style={td}>{x.completion_tokens.toLocaleString('ru-RU')}</td>
										<td style={td}>{x.total_tokens.toLocaleString('ru-RU')}</td>
										<td style={td}>{Number(x.cost_usd).toFixed(4)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>

			{actUser && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={closeActivity}>
					<div style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', width: 'min(94vw, 780px)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 12px 32px rgba(16,24,40,.28)' }} onClick={e => e.stopPropagation()}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 4 }}>
							<b style={{ fontSize: 15, wordBreak: 'break-all' }}>Активность: {actUser.email}</b>
							<button type='button' onClick={closeActivity} style={{ border: 0, background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#667085' }}>×</button>
						</div>
						<div style={{ color: '#667085', fontSize: 12, marginBottom: 10 }}>Время в системе по дням{actUser.login_count ? ' · всего заходов: ' + actUser.login_count : ''}</div>
						{actLoading ? (
							<div style={{ padding: 24, color: '#98a2b3' }}>Загрузка…</div>
						) : actDays.length === 0 ? (
							<div style={{ padding: 24, color: '#98a2b3' }}>Нет данных за эти дни — время в системе начнёт учитываться, когда пользователь откроет сайт</div>
						) : (
							<ActivityChart days={actDays} />
						)}
					</div>
				</div>
			)}

			</Content>
		</Layout>
	);
};

const fmtDate = v => {
	if (!v) return '—';
	const s = String(v).includes('T') ? String(v) : String(v).replace(' ', 'T');
	const d = new Date(s + (String(v).includes('Z') || String(v).includes('+') ? '' : 'Z'));
	if (isNaN(d.getTime())) return String(v);
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return dd + '.' + mm + '.' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

const fmtDur = sec => {
	sec = Number(sec) || 0;
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	if (h <= 0 && m <= 0) return 'менее 1 мин';
	return (h > 0 ? h + ' ч ' : '') + m + ' мин';
};



const ActivityChart = ({ days }) => {
	const data = (days || []).slice(-45);
	if (!data.length) return null;
	const max = Math.max(1, ...data.map(d => Number(d.seconds) || 0));
	const fmtV = sec => {
		sec = Number(sec) || 0;
		const m = Math.round(sec / 60);
		if (sec > 0 && m < 1) return '<1 мин';
		if (m >= 60) return Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин';
		return m + ' мин';
	};
	const dlabel = day => {
		const p = String(day).split('-');
		return p.length === 3 ? p[2] + '.' + p[1] : day;
	};
	return (
		<div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minHeight: 195, paddingTop: 8, overflowX: 'auto' }}>
			{data.map(d => {
				const sec = Number(d.seconds) || 0;
				const h = sec <= 0 ? 2 : Math.max(6, Math.round((sec / max) * 140));
				return (
					<div key={d.day} title={dlabel(d.day) + ' — ' + fmtV(sec)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: '1 1 0', minWidth: 42 }}>
						<div style={{ fontSize: 10, color: '#344054', marginBottom: 3, whiteSpace: 'nowrap' }}>{sec <= 0 ? '' : (sec >= 60 ? Math.round(sec / 60) + ' м' : sec + ' с')}</div>
						<div style={{ width: 28, height: h, background: sec <= 0 ? '#eef1f5' : '#1760e8', borderRadius: '4px 4px 0 0' }} />
						<div style={{ fontSize: 10, color: '#98a2b3', marginTop: 4, whiteSpace: 'nowrap' }}>{dlabel(d.day)}</div>
					</div>
				);
			})}
		</div>
	);
};

const caseLabel = c => {
	const map = {
		'llm_run': 'Полный расчёт ИИ',
		'ai_question': 'ИИ-анализ / вопросы',
		'information-graf': 'Информационный граф',
		'media-rating': 'Медиа-рейтинг (СМИ)',
		'voice-of-customer': 'Голос клиента',
		'analysis-of-themes': 'Анализ тем',
		'ai-bot': 'AI-бот',
		'smart-agent': 'Smart Agent',
		'lca-examples': 'LCA-примеры',
		'graph-analysis': 'Анализ графа связей',
	};
	return map[c] || c || '—';
};

const llmDaySums = rows => {
	const m = new Map();
	rows.forEach(r => {
		const cur = m.get(r.day) || { day: r.day, requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: 0 };
		cur.requests += r.requests || 0;
		cur.prompt_tokens += r.prompt_tokens || 0;
		cur.completion_tokens += r.completion_tokens || 0;
		cur.total_tokens += r.total_tokens || 0;
		cur.cost_usd += r.cost_usd || 0;
		m.set(r.day, cur);
	});
	return [...m.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
};

const th = { textAlign: 'left', borderBottom: '1px solid #e6eaf0', padding: 6 };
const td = { padding: 6, borderBottom: '1px solid #f0f2f5' };

export default AdminPage;
