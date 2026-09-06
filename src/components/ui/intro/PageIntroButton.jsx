import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { getIntroForPath } from '@/data/intro.data';

import styles from './PageIntroButton.module.scss';

const SLIDE_MS = 6500;

const PageIntroButton = () => {
	const { pathname } = useLocation();
	const intro = getIntroForPath(pathname);
	const [open, setOpen] = useState(false);
	const [idx, setIdx] = useState(0);
	const [playing, setPlaying] = useState(true);
	const timer = useRef(null);

	useEffect(() => {
		setOpen(false);
		setIdx(0);
		setPlaying(true);
	}, [pathname]);

	useEffect(() => {
		if (timer.current) clearInterval(timer.current);
		if (open && playing && intro && intro.slides.length > 1) {
			timer.current = setInterval(() => {
				setIdx(i => (i + 1) % intro.slides.length);
			}, SLIDE_MS);
		}
		return () => { if (timer.current) clearInterval(timer.current); };
	}, [open, playing, intro]);

	if (!intro || intro.slides.length === 0) return null;

	const slide = intro.slides[idx];
	const go = i => {
		if (intro.slides.length === 0) return;
		setIdx((i + intro.slides.length) % intro.slides.length);
	};

	return (
		<>
			<button type='button' className={styles.floating} title='Введение: как пользоваться страницей' onClick={() => { setIdx(0); setPlaying(true); setOpen(true); }}>
				▶ Введение
			</button>
			{open && (
				<div style={{
					position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(16,24,40,.55)',
					display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
				}} onClick={() => setOpen(false)}>
					<div
						style={{ background: '#fff', borderRadius: 14, width: 'min(1000px, 100%)', overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,.3)' }}
						onClick={e => e.stopPropagation()}
					>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e6eaf0' }}>
							<b style={{ fontSize: 15 }}>{intro.title} · {idx + 1} из {intro.slides.length}</b>
							<button type='button' onClick={() => setOpen(false)} style={{ border: 0, background: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: '#475467' }} aria-label='Закрыть'>×</button>
						</div>
						<div key={idx} style={{ position: 'relative', background: '#0b1220', animation: 'introFade .6s ease' }}>
							<img src={slide.img} alt={slide.caption} style={{ width: '100%', height: 'min(58vh, 520px)', objectFit: 'contain', display: 'block' }} />
							{(slide.marks || []).map((m, i) => (
								<div key={i} style={{ position: 'absolute', left: m.x + '%', top: m.y + '%' }}>
									<span style={{
										position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: 10,
										background: '#ff3b30', border: '2px solid #fff', boxShadow: '0 0 0 3px rgba(255,59,48,.35)',
										animation: 'pulseRing 1.6s infinite',
									}} />
									<div style={{
										position: 'absolute', transform: 'translate(-50%, calc(-100% - 20px))', minWidth: 150, maxWidth: 260,
										background: '#ff3b30', color: '#fff', borderRadius: 10, padding: '7px 10px', fontSize: 13, lineHeight: 1.3,
										textAlign: 'center', boxShadow: '0 6px 16px rgba(0,0,0,.35)', pointerEvents: 'none',
									}}>
										{m.text}
										<div style={{ width: 0, height: 0, margin: '4px auto 0', borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '8px solid #ff3b30' }} />
									</div>
								</div>
							))}
							<div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '22px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,.78))', color: '#fff', fontSize: 14.5, lineHeight: 1.5 }}>
								{slide.caption}
							</div>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
							<button type='button' onClick={() => setPlaying(p => !p)} style={ctrl}>{playing ? '❚❚' : '▶'}</button>
							<button type='button' onClick={() => go(idx - 1)} style={ctrl}>←</button>
							<button type='button' onClick={() => go(idx + 1)} style={ctrl}>→</button>
							<div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
								{intro.slides.map((s, i) => (
									<button key={i} onClick={() => go(i)} aria-label={'шаг ' + (i + 1)} style={{
										width: 10, height: 10, borderRadius: 10, border: 0, cursor: 'pointer',
										background: i === idx ? '#1760e8' : '#d0d7e2', padding: 0,
									}} />
								))}
								<span style={{ color: '#667085', fontSize: 12, marginLeft: 8 }}>{idx + 1} / {intro.slides.length}</span>
							</div>
						</div>
					</div>
				</div>
			)}
			<style>{`
				@keyframes introFade { from { opacity: .2 } to { opacity: 1 } }
				@keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(255,59,48,.55) } 70% { box-shadow: 0 0 0 14px rgba(255,59,48,0) } 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0) } }
			`}</style>
		</>
	);
};

const ctrl = {
	border: '1px solid #d0d7e2', background: '#fff', borderRadius: 8, padding: '6px 12px',
	cursor: 'pointer', fontSize: 13, color: '#344054',
};

export default PageIntroButton;
