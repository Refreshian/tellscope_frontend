import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { getIntroForPath } from '@/data/intro.data';

import styles from './PageIntroButton.module.scss';

const SLIDE_MS = 4500;

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
		if (open && !intro?.video && playing && intro && intro.slides.length > 1) {
			timer.current = setInterval(() => {
				setIdx(i => (i + 1) % intro.slides.length);
			}, SLIDE_MS);
		}
		return () => { if (timer.current) clearInterval(timer.current); };
	}, [open, playing, intro]);

	if (!intro || intro.slides.length === 0) return null;

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
						style={{ background: '#fff', borderRadius: 14, width: 'min(960px, 100%)', overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,.3)' }}
						onClick={e => e.stopPropagation()}
					>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #e6eaf0' }}>
							<b style={{ fontSize: 15 }}>{intro.title}</b>
							<button type='button' onClick={() => setOpen(false)} style={{ border: 0, background: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: '#475467' }} aria-label='Закрыть'>×</button>
						</div>
						{intro.video ? (
							<div style={{ background: '#000' }}>
								<video
									key={intro.video}
									src={intro.video}
									controls
									autoPlay
									playsInline
									poster={intro.poster}
									style={{ width: '100%', maxHeight: 'min(62vh, 600px)', display: 'block', margin: '0 auto' }}
								/>
								<div style={{ padding: '6px 16px 10px', color: '#98a2b3', fontSize: 12 }}>
									Видео с текстовыми пояснениями (без звука). Нажмите ▶, если автозапуск не сработал.
								</div>
							</div>
						) : (
							<>
								<div key={idx} style={{ position: 'relative', background: '#0b1220', animation: 'introFade .45s ease' }}>
									<img src={intro.slides[idx].img} alt={intro.slides[idx].caption} style={{ width: '100%', height: 'min(62vh, 560px)', objectFit: 'contain', display: 'block' }} />
									<div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,.72))', color: '#fff', fontSize: 14, lineHeight: 1.45 }}>
										{intro.slides[idx].caption}
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
							</>
						)}
					</div>
				</div>
			)}
			<style>{`@keyframes introFade { from { opacity: .25 } to { opacity: 1 } }`}</style>
		</>
	);
};

const ctrl = {
	border: '1px solid #d0d7e2', background: '#fff', borderRadius: 8, padding: '6px 12px',
	cursor: 'pointer', fontSize: 13, color: '#344054',
};

export default PageIntroButton;
