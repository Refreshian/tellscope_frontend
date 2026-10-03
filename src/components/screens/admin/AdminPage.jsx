
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
const tabButton = active => ({
	padding: '8px 18px',
	borderRadius: 999,
	border: active ? '1px solid rgba(108,92,231,.0)' : '1px solid #d0d7e2',
	background: active ? 'linear-gradient(135deg, #6C5CE7 0%, #22B8F0 100%)' : '#fff',
	color: active ? '#fff' : '#344054',
	cursor: 'pointer',
	fontSize: 13,
	fontWeight: active ? 600 : 400,
	fontFamily: 'inherit',
	boxShadow: active ? '0 4px 14px rgba(108,92,231,.28)' : 'none',
});

// Названия уровней доступа к выданной папке (те же, что на сервере).
const ACCESS_LABELS = {
	read: 'только чтение',
	write: 'чтение и редактирование',
	delete: 'чтение, редактирование и удаление',
};
const accessLabel = value => ACCESS_LABELS[value] || ACCESS_LABELS.read;

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
	const [tab, setTab] = useState('users');


	// user create form
	const [uEmail, setUEmail] = useState('');
	const [uPass, setUPass] = useState('');
	const [uName, setUName] = useState('');
	const [uSuper, setUSuper] = useState(false);

	// share form
	const [ownerId, setOwnerId] = useState('');
	const [ownerFolders, setOwnerFolders] = useState([]);
	const [folder, setFolder] = useState('');
	// Выдать доступ можно сразу к нескольким папкам: отмечаем их галочками.
	const [foldersSel, setFoldersSel] = useState([]);
	const [targetId, setTargetId] = useState('');
	const [access, setAccess] = useState('read');
	const [llmUsage, setLlmUsage] = useState([]);
	const [llmDays, setLlmDays] = useState([]);
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [appliedFrom, setAppliedFrom] = useState('');
	const [appliedTo, setAppliedTo] = useState('');




	// Вкладки интерфейса для конкретного пользователя: открываются кнопкой в строке.
	const [tabsUser, setTabsUser] = useState(null);
	const [tabsCatalog, setTabsCatalog] = useState([]);
	const [tabsAllowed, setTabsAllowed] = useState([]);
	const [tabsAll, setTabsAll] = useState(true);
	const [tabsBusy, setTabsBusy] = useState(false);
	const [tabsMsg, setTabsMsg] = useState('');
	const openTabs = async u => {
		setTabsUser(u);
		setTabsMsg('');
		try {
			const data = await api('/admin/users/' + u.id + '/sections');
			setTabsCatalog(data.catalog || []);
			setTabsAllowed(data.sections || []);
			setTabsAll(!!data.all);
		} catch (e) {
			setTabsMsg('Не удалось получить вкладки: ' + ((e && e.message) || e));
		}
	};
	const saveTabs = async () => {
		if (!tabsUser) return;
		setTabsBusy(true);
		setTabsMsg('');
		try {
			const data = await api('/admin/users/' + tabsUser.id + '/sections', {
				method: 'PUT',
				body: JSON.stringify({ sections: tabsAll ? ['*'] : tabsAllowed }),
			});
			setTabsCatalog(data.catalog || tabsCatalog);
			setTabsAllowed(data.sections || []);
			setTabsAll(!!data.all);
			setTabsMsg(data.all ? 'Сохранено: доступны все вкладки' : 'Сохранено: вкладок ' + (data.sections || []).length);
		} catch (e) {
			setTabsMsg('Ошибка: ' + ((e && e.message) || e));
		} finally {
			setTabsBusy(false);
		}
	};
	// Вкладки можно выдать вместе с доступом к папкам — одной кнопкой «Выдать».
	const [grantTabsOn, setGrantTabsOn] = useState(false);
	const [grantTabsAll, setGrantTabsAll] = useState(true);
	const [grantTabsAllowed, setGrantTabsAllowed] = useState([]);
	const [grantTabsCatalog, setGrantTabsCatalog] = useState([]);
	const [grantTabsMsg, setGrantTabsMsg] = useState('');
	const loadGrantTabs = async userId => {
		if (!userId) return;
		try {
			const data = await api('/admin/users/' + userId + '/sections');
			setGrantTabsCatalog(data.catalog || []);
			setGrantTabsAllowed(data.sections || []);
			setGrantTabsAll(!!data.all);
		} catch (e) {
			setGrantTabsMsg('Не удалось получить вкладки: ' + ((e && e.message) || e));
		}
	};
	const pickTarget = id => {
		setTargetId(id);
		setGrantTabsMsg('');
		if (grantTabsOn) loadGrantTabs(id);
	};
	const toggleGrantTabs = on => {
		setGrantTabsOn(on);
		setGrantTabsMsg('');
		if (on) loadGrantTabs(targetId);
	};
	// Чувствительные вкладки («Администрирование») подсвечиваем красным и объясняем, что они дают:
	// иначе это выглядит как обычная галочка в списке выдачи.
	const dangerNote = (catalog, allowed) => {
		const items = (catalog || []).filter(section => section.danger);
		if (items.length === 0) return null;
		return (
			<div style={{ marginTop: 6, fontSize: 12, color: '#b42318', maxWidth: 760, lineHeight: 1.4 }}>
				{items.map(section => (
					<div key={section.slug}>
						<b>{section.title}</b> — {section.hint || 'чувствительный раздел'}
						{(allowed || []).includes(section.slug) ? ' · сейчас выдано' : ''}
					</div>
				))}
			</div>
		);
	};

	// Правка самой учётной записи: имя, почта, пароль.
	const [editUser, setEditUser] = useState(null);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editPass, setEditPass] = useState('');
	const [editBusy, setEditBusy] = useState(false);
	const [editMsg, setEditMsg] = useState('');
	const openEdit = u => {
		setEditUser(u);
		setEditName(u.username || '');
		setEditEmail(u.email || '');
		setEditPass('');
		setEditMsg('');
	};
	const saveEdit = async () => {
		if (!editUser) return;
		const payload = {};
		if (editName !== (editUser.username || '')) payload.username = editName;
		if (editEmail !== (editUser.email || '')) payload.email = editEmail;
		if (editPass) payload.password = editPass;
		if (Object.keys(payload).length === 0) {
			setEditMsg('Ничего не изменено');
			return;
		}
		setEditBusy(true);
		setEditMsg('');
		try {
			await api('/admin/users/' + editUser.id, { method: 'PATCH', body: JSON.stringify(payload) });
			await reload();
			setEditUser(null);
		} catch (e) {
			setEditMsg('Ошибка: ' + ((e && e.message) || e));
		} finally {
			setEditBusy(false);
		}
	};

	const loadLlm = async (from, to) => {
		const f = from !== undefined && from !== null ? from : appliedFrom;
		const t = to !== undefined && to !== null ? to : appliedTo;
		const dateQs = [];
		if (f) dateQs.push('date_from=' + encodeURIComponent(f));
		if (t) dateQs.push('date_to=' + encodeURIComponent(t));
		const mainQ = dateQs.length ? '?' + dateQs.join('&') : '';
		const dayQ = dateQs.slice();
		if (dayQ.length === 0) dayQ.push('days=30');
		const [lu, ld] = await Promise.all([
			api('/admin/llm-usage' + mainQ),
			api('/admin/llm-usage/days?' + dayQ.join('&')),
		]);
		setLlmUsage(lu && lu.rows ? lu.rows : []);
		setLlmDays(ld && ld.rows ? llmDaySums(ld.rows) : []);
	};

	const reload = async () => {
		const [us, sh] = await Promise.all([
			api('/admin/users'), api('/admin/shares'),
		]);
		await loadLlm();
		setUsers(us);
		setShares(sh.shares || []);
		setOwners(us);
	};

	const applyRange = () => {
		if (fromDate && toDate && fromDate > toDate) {
			setErr('Дата «С» не может быть позже «По»');
			return;
		}
		setErr('');
		setAppliedFrom(fromDate);
		setAppliedTo(toDate);
		loadLlm(fromDate, toDate);
	};
	const resetRange = () => {
		setFromDate(''); setToDate(''); setAppliedFrom(''); setAppliedTo('');
		loadLlm('', '');
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
		setFoldersSel([]);
	};

	const grant = async () => {
		setErr('');
		setGrantTabsMsg('');
		try {
			await api('/admin/shares/bulk', {
				method: 'POST',
				body: JSON.stringify({ owner_user_id: Number(ownerId), folders: foldersSel, user_id: Number(targetId), access }),
			});
			// Вкладки сохраняем тем же действием: администратор выдаёт доступ к данным и к
			// разделам одним нажатием, а не ищет второе место в интерфейсе.
			if (grantTabsOn && targetId) {
				const data = await api('/admin/users/' + targetId + '/sections', {
					method: 'PUT',
					body: JSON.stringify({ sections: grantTabsAll ? ['*'] : grantTabsAllowed }),
				});
				setGrantTabsCatalog(data.catalog || grantTabsCatalog);
				setGrantTabsAllowed(data.sections || []);
				setGrantTabsAll(!!data.all);
				setGrantTabsMsg(data.all ? 'Вкладки: доступны все' : 'Вкладки: выдано ' + (data.sections || []).length);
			}
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
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
				<h2 style={{ margin: 0 }}>{tab === 'users' ? 'Пользователи и доступ' : 'Потребление ИИ (LLM-токены)'}</h2>
				<span style={{ color: '#98a2b3', fontSize: 12 }}>
					{tab === 'users' ? 'Управление пользователями, доступом к наборам данных и аккаунтами' : 'Учёт запросов и токенов по аккаунтам, страницам и моделям'}
				</span>
			</div>
			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 2px' }}>
				<button type='button' onClick={() => setTab('users')} style={tabButton(tab === 'users')}>Пользователи</button>
				<button type='button' onClick={() => { setTab('llm'); loadLlm(); }} style={tabButton(tab === 'llm')}>Потребление ИИ (LLM-токены)</button>
			</div>
			{err && <div style={{ color: '#c53030', marginBottom: 8 }}>{err}</div>}

			{tab === 'users' && (
			<>
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
				{/* Таблица должна влезать в ширину экрана: кнопки действий компактные и переносятся
				    по строкам, длинные email и активность тоже переносятся, а не растягивают таблицу. */}
				<table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 12, tableLayout: 'fixed' }}>
					<colgroup>
						<col style={{ width: 34 }} />
						<col style={{ width: '18%' }} />
						<col style={{ width: '10%' }} />
						<col style={{ width: 52 }} />
						<col style={{ width: 58 }} />
						<col style={{ width: '16%' }} />
						<col />
						<col style={{ width: 74 }} />
					</colgroup>
					<thead>
						<tr>
							<th style={th}>ID</th>
							<th style={th}>Email</th>
							<th style={th}>Имя</th>
							<th style={th}>Админ</th>
							<th style={th}>Активен</th>
							<th style={th}>Активность</th>
							<th style={th}>Действия</th>
							<th style={th}>Выдан</th>
						</tr>
					</thead>
					<tbody>
						{users.map(u => (
							<tr key={u.id}>
								<td style={tdTop}>{u.id}</td>
								<td style={{ ...tdTop, wordBreak: 'break-all' }}>{u.email}</td>
								<td style={{ ...tdTop, wordBreak: 'break-word' }}>{u.username}</td>
								<td style={tdTop}>{u.is_superuser ? 'да' : '—'}</td>
								<td style={tdTop}>{u.is_active ? 'да' : 'нет'}</td>
								<td style={tdTop}>
									<div style={{ fontSize: 11, color: '#667085', lineHeight: 1.35 }}>
										<button type='button' onClick={() => openActivity(u)} title='Показать время в системе по дням'
											style={{ border: 0, background: 'none', padding: 0, color: '#1760e8', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', fontFamily: 'inherit' }}>
											заходов: {u.login_count || 0}
										</button>
										<div>последний: {fmtDate(u.last_login)}</div>
										<div>в системе: {fmtDur(u.total_seconds)}</div>
									</div>
								</td>
								<td style={tdTop}>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
										{u.id !== meId && (u.is_superuser ? (
											<button style={cellBtn} title='Снять права администратора' onClick={() => patchUser(u.id, { is_superuser: false })}>снять админа</button>
										) : (
											<button style={cellBtn} title='Выдать права администратора' onClick={() => patchUser(u.id, { is_superuser: true })}>сделать админом</button>
										))}
										{u.id !== meId && (u.is_active ? (
											<button style={cellBtn} title='Запретить вход' onClick={() => patchUser(u.id, { is_active: false })}>деактивировать</button>
										) : (
											<button style={cellBtn} title='Разрешить вход' onClick={() => patchUser(u.id, { is_active: true })}>активировать</button>
										))}
										<button style={cellBtn} title='Задать новый пароль' onClick={async () => {
											const p = window.prompt('Новый пароль для ' + u.email + ' (мин. 6 символов)');
											if (!p) return;
											await patchUser(u.id, { password: p });
										}}>пароль</button>
										<button style={cellBtn} title='Какие вкладки системы видит этот аккаунт' onClick={() => openTabs(u)}>вкладки</button>
										<button style={cellBtn} title='Имя, почта, пароль' onClick={() => openEdit(u)}>изменить</button>
										{u.id !== meId && (
											<button style={cellBtnRed} title='Удалить аккаунт вместе с его данными' onClick={() => delUser(u)}>удалить</button>
										)}
									</div>
								</td>
								<td style={tdTop}>{fmtDate(u.registered_at)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			</>
			)}

			{tab === 'llm' && (
			<div style={card}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
					<b style={{ fontSize: 13, color: '#152A5A' }}>Период:</b>
					<input type='date' value={fromDate} onChange={e => setFromDate(e.target.value)} style={input} />
					<span style={{ color: '#98a2b3', fontSize: 12 }}>—</span>
					<input type='date' value={toDate} onChange={e => setToDate(e.target.value)} style={input} />
					<button type='button' style={btn} onClick={applyRange}>Применить</button>
					<button type='button' style={{ ...btn, background: '#fff', color: '#344054', border: '1px solid #d0d7e2' }} onClick={resetRange}>Сбросить</button>
				</div>
				<div style={{ color: '#667085', fontSize: 12, marginBottom: 4 }}>
					{appliedFrom || appliedTo
						? <>Показаны данные за период: <b style={{ color: '#344054' }}>{appliedFrom || '…'} — {appliedTo || '…'}</b> (по дате запроса)</>
						: <>Показаны данные <b style={{ color: '#344054' }}>за всё время</b>. Выберите даты выше, чтобы отфильтровать таблицу и график.</>}
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
						<b style={{ fontSize: 13, color: '#152A5A' }}>
						По дням {(appliedFrom || appliedTo) ? `за период ${appliedFrom || '…'} — ${appliedTo || '…'}` : '(последние 30 дней)'}
					</b>
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
			)}

			{tab === 'users' && (
			<>
			<div style={card}>
				<b>Выдать доступ к папке</b>
				<div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
					<select style={input} value={ownerId} onChange={e => pickOwner(e.target.value)}>
						<option value=''>Владелец данных…</option>
						{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
					</select>
					<div style={{ ...input, minWidth: 300 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
							<span style={{ fontSize: 12, color: '#344054' }}>Папки (можно несколько):</span>
							<button type='button' style={{ ...miniBtn, padding: '2px 8px' }}
								onClick={() => setFoldersSel(ownerFolders.map(f => f.name))}>выбрать все</button>
							<button type='button' style={{ ...miniBtn, padding: '2px 8px' }}
								onClick={() => setFoldersSel([])}>снять</button>
							{foldersSel.length > 0 && <span style={{ fontSize: 12, color: '#067647' }}>выбрано: {foldersSel.length}</span>}
						</div>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6, maxHeight: 132, overflowY: 'auto' }}>
							{ownerFolders.length === 0 && <span style={{ fontSize: 12, color: '#98a2b3' }}>Выберите владельца данных</span>}
							{ownerFolders.map(f => (
								<label key={f.name} style={{ fontSize: 13, minWidth: 200, display: 'flex', alignItems: 'center', gap: 6 }}>
									<input type='checkbox' checked={foldersSel.includes(f.name)}
										onChange={e => setFoldersSel(prev => e.target.checked
											? [...prev, f.name]
											: prev.filter(item => item !== f.name))} />
									{f.name} ({f.files})
								</label>
							))}
						</div>
					</div>
					<select style={input} value={targetId} onChange={e => pickTarget(e.target.value)}>
						<option value=''>Кому…</option>
						{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
					</select>
					<select style={input} value={access} onChange={e => setAccess(e.target.value)}>
						<option value='read'>только чтение</option>
						<option value='write'>чтение и редактирование</option>
						<option value='delete'>чтение, редактирование и удаление</option>
					</select>
					<button style={btn} onClick={grant}>Выдать</button>
				</div>
				<div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e6eaf0' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
						<input type='checkbox' checked={grantTabsOn} disabled={!targetId}
							onChange={e => toggleGrantTabs(e.target.checked)} />
						также задать вкладки системы для получателя
					</label>
					{!targetId && (
						<div style={{ fontSize: 12, color: '#98a2b3', marginTop: 4 }}>Сначала выберите, кому выдаём доступ.</div>
					)}
					{grantTabsOn && targetId && (
						<div style={{ marginTop: 6 }}>
							<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
								<input type='checkbox' checked={grantTabsAll}
									onChange={e => { setGrantTabsMsg(''); setGrantTabsAll(e.target.checked); }} />
								доступны все вкладки
							</label>
							{!grantTabsAll && (
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6 }}>
									{grantTabsCatalog.map(section => (
										<label key={section.slug} style={{ fontSize: 12, minWidth: 200, display: 'flex', alignItems: 'center', gap: 6, ...(section.danger ? { color: '#b42318', fontWeight: 600 } : {}) }}>
											<input type='checkbox' checked={grantTabsAllowed.includes(section.slug)}
												onChange={e => {
													setGrantTabsMsg('');
													setGrantTabsAllowed(prev => e.target.checked
														? [...prev, section.slug]
														: prev.filter(item => item !== section.slug));
												}} />
											{section.title}
											{section.hint && (
												<span title={section.hint}
													style={{ cursor: 'help', color: section.danger ? '#b42318' : '#98a2b3' }}>ⓘ</span>
											)}
										</label>
									))}
								</div>
								{dangerNote(grantTabsCatalog, grantTabsAllowed)}
							)}
							<div style={{ fontSize: 12, color: '#667085', marginTop: 6 }}>
								Снятые вкладки не показываются на главной и в левом меню, а по прямой ссылке
								открывается «Раздел не выдан».
							</div>
						</div>
					)}
					{grantTabsMsg && <div style={{ fontSize: 12, color: '#475467', marginTop: 6 }}>{grantTabsMsg}</div>}
				</div>
			</div>


			<div style={card}>
				<b>Выданные доступы</b>
				{shares.length === 0 && <div style={{ color: '#98a2b3', marginTop: 6 }}>Пока нет выданных доступов</div>}
				{shares.map((s, i) => (
					<div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px dashed #e6eaf0', fontSize: 13 }}>
						<span>владелец #{s.owner_user_id} · папка «{s.folder}» · пользователь #{s.user_id} · {s.access_label || accessLabel(s.access)}</span>
						<button style={{ border: 0, background: 'none', color: '#c53030', cursor: 'pointer' }} onClick={() => revoke(s)}>забрать</button>
					</div>
				))}
			</div>
			</>
			)}


		</div>

			{tabsUser && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={() => setTabsUser(null)}>
					<div style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', width: 'min(94vw, 720px)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 12px 32px rgba(16,24,40,.28)' }} onClick={e => e.stopPropagation()}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
							<b style={{ fontSize: 15, wordBreak: 'break-all' }}>Вкладки системы: {tabsUser.email}</b>
							<button type='button' onClick={() => setTabsUser(null)} style={{ border: 0, background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#667085' }}>×</button>
						</div>
						<div style={{ color: '#667085', fontSize: 12, margin: '4px 0 10px' }}>
							Отметьте, что видит этот аккаунт. Снятая вкладка исчезает из меню и не открывается по прямой ссылке.
						</div>
						<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
							<input type='checkbox' checked={tabsAll} onChange={e => { setTabsMsg(''); setTabsAll(e.target.checked); }} />
							доступны все вкладки
						</label>
						{!tabsAll && (
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
								{tabsCatalog.map(section => (
									<label key={section.slug} style={{ fontSize: 13, minWidth: 220, display: 'flex', alignItems: 'center', gap: 6, ...(section.danger ? { color: '#b42318', fontWeight: 600 } : {}) }}>
										<input type='checkbox' checked={tabsAllowed.includes(section.slug)}
											onChange={e => {
												setTabsMsg('');
												setTabsAllowed(prev => e.target.checked
													? [...prev, section.slug]
													: prev.filter(item => item !== section.slug));
											}} />
										{section.title}
										{section.hint && (
											<span title={section.hint}
												style={{ cursor: 'help', color: section.danger ? '#b42318' : '#98a2b3' }}>ⓘ</span>
										)}
									</label>
								))}
							</div>
							{dangerNote(tabsCatalog, tabsAllowed)}
						)}
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
							<button style={btn} disabled={tabsBusy} onClick={saveTabs}>{tabsBusy ? 'Сохраняю…' : 'Сохранить'}</button>
							{tabsMsg && <span style={{ fontSize: 12, color: '#475467' }}>{tabsMsg}</span>}
						</div>
					</div>
				</div>
			)}
			{editUser && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }} onClick={() => setEditUser(null)}>
					<div style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', width: 'min(94vw, 520px)', boxShadow: '0 12px 32px rgba(16,24,40,.28)' }} onClick={e => e.stopPropagation()}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
							<b style={{ fontSize: 15 }}>Учётная запись #{editUser.id}</b>
							<button type='button' onClick={() => setEditUser(null)} style={{ border: 0, background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: '#667085' }}>×</button>
						</div>
						<div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
							<label style={{ fontSize: 12, color: '#344054' }}>
								Имя
								<input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...input, display: 'block', width: '100%', marginTop: 4 }} />
							</label>
							<label style={{ fontSize: 12, color: '#344054' }}>
								Email (он же логин)
								<input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ ...input, display: 'block', width: '100%', marginTop: 4 }} />
							</label>
							<label style={{ fontSize: 12, color: '#344054' }}>
								Новый пароль (оставьте пустым, чтобы не менять)
								<input type='password' value={editPass} onChange={e => setEditPass(e.target.value)} style={{ ...input, display: 'block', width: '100%', marginTop: 4 }} />
							</label>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
							<button style={btn} disabled={editBusy} onClick={saveEdit}>{editBusy ? 'Сохраняю…' : 'Сохранить'}</button>
							{editMsg && <span style={{ fontSize: 12, color: '#c53030' }}>{editMsg}</span>}
						</div>
					</div>
				</div>
			)}
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
const tdTop = { ...td, verticalAlign: 'top' };
// Кнопки в строке таблицы: узкие, переносятся по строкам — иначе колонка «Действия»
// растягивала таблицу и она уезжала за правый край экрана.
const cellBtn = {
	padding: '3px 7px',
	borderRadius: 6,
	border: '1px solid #d0d7e2',
	background: '#fff',
	color: '#344054',
	cursor: 'pointer',
	fontSize: 11,
	lineHeight: 1.25,
	fontFamily: 'inherit',
	whiteSpace: 'nowrap',
};
const cellBtnRed = { ...cellBtn, borderColor: '#f2c6c6', color: '#c53030' };

export default AdminPage;
