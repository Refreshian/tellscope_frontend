
import { useEffect, useState } from 'react';

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

	const reload = async () => {
		const [us, sh] = await Promise.all([api('/admin/users'), api('/admin/shares')]);
		setUsers(us);
		setShares(sh.shares || []);
		setOwners(us);
	};

	useEffect(() => {
		(async () => {
			try {
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

	if (ok === null) return <div style={{ padding: 24 }}>Проверка прав…</div>;
	if (ok === false) return <div style={{ padding: 24 }}>Раздел доступен только администратору.</div>;

	return (
		<div style={{ maxWidth: 1080, margin: '0 auto', padding: 20, fontFamily: 'inherit' }}>
			<h2 style={{ margin: '0 0 6px' }}>Пользователи и доступ</h2>
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
					<thead><tr><th style={th}>ID</th><th style={th}>Email</th><th style={th}>Имя</th><th style={th}>Админ</th><th style={th}>Активен</th></tr></thead>
					<tbody>
						{users.map(u => (
							<tr key={u.id}>
								<td style={td}>{u.id}</td>
								<td style={td}>{u.email}</td>
								<td style={td}>{u.username}</td>
								<td style={td}>{u.is_superuser ? 'да' : ''}</td>
								<td style={td}>{u.is_active ? 'да' : 'нет'}</td>
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
		</div>
	);
};

const th = { textAlign: 'left', borderBottom: '1px solid #e6eaf0', padding: 6 };
const td = { padding: 6, borderBottom: '1px solid #f0f2f5' };

export default AdminPage;
