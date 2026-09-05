import { Fragment, useEffect } from 'react';

import styles from './HelpDrawer.module.scss';

// Поддержка **жирного** внутри текстовых блоков
const renderInline = (text = '') =>
	String(text || '')
		.split(/(\*\*[^*]+\*\*)/g)
		.map((part, i) =>
			part.startsWith('**') && part.endsWith('**') ? (
				<strong key={i}>{part.slice(2, -2)}</strong>
			) : (
				<Fragment key={i}>{part}</Fragment>
			),
		);

const Blocks = ({ blocks }) =>
	(blocks || []).map((block, i) => {
		if (block.t === 'p') {
			return (
				<p key={i} className={styles.paragraph}>
					{renderInline(block.v)}
				</p>
			);
		}
		if (block.t === 'ul' || block.t === 'ol') {
			const ListTag = block.t === 'ul' ? 'ul' : 'ol';
			return (
				<ListTag key={i} className={styles.list}>
					{(block.v || []).map((item, j) => (
						<li key={j}>{renderInline(item)}</li>
					))}
				</ListTag>
			);
		}
		return null;
	});

const HelpDrawer = ({ doc, onClose }) => {
	useEffect(() => {
		if (!doc) return undefined;

		const onKey = e => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [doc, onClose]);

	if (!doc) return null;

	return (
		<div className={styles.root}>
			<button
				type='button'
				className={styles.backdrop}
				onClick={onClose}
				aria-label='Закрыть справку'
			/>
			<aside
				className={styles.panel}
				role='dialog'
				aria-modal='true'
				aria-label='Справка по разделу'
			>
				<header className={styles.header}>
					<div className={styles.titleBlock}>
						<span className={styles.kicker}>Справка</span>
						<h2 className={styles.title}>{doc.title}</h2>
					</div>
					<button
						type='button'
						className={styles.close}
						onClick={onClose}
						aria-label='Закрыть'
					>
						×
					</button>
				</header>
				<div className={styles.body}>
					{doc.summary && <p className={styles.lead}>{doc.summary}</p>}
					{(doc.sections || []).map((section, i) => (
						<section key={i} className={styles.section}>
							<h3 className={styles.sectionTitle}>{section.heading}</h3>
							<Blocks blocks={section.blocks} />
						</section>
					))}
				</div>
				<footer className={styles.footer}>
					Справка по каждому разделу открывается кнопкой «?» в правом верхнем углу
					страницы.
				</footer>
			</aside>
		</div>
	);
};

export default HelpDrawer;
