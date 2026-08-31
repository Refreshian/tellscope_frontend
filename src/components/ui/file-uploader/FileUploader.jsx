import React, { useRef, useState } from 'react';
import styles from './FileUploader.module.scss';

const FileUploader = ({ onFileUpload, acceptedTypes = '.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls' }) => {
	const fileInputRef = useRef(null);
	const [dragActive, setDragActive] = useState(false);

	const handleFiles = (files) => {
		const fileArray = Array.from(files);
		const validFiles = fileArray.filter(file => {
			const extension = '.' + file.name.split('.').pop().toLowerCase();
			return acceptedTypes.includes(extension);
		});

		if (validFiles.length > 0) {
			onFileUpload(validFiles);
		}
	};

	const handleDrag = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true);
		} else if (e.type === 'dragleave') {
			setDragActive(false);
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const handleChange = (e) => {
		e.preventDefault();
		if (e.target.files && e.target.files[0]) {
			handleFiles(e.target.files);
		}
	};

	const onButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className={styles.file__uploader}>
			<div
				className={`${styles.upload__area} ${dragActive ? styles.drag__active : ''}`}
				onDragEnter={handleDrag}
				onDragLeave={handleDrag}
				onDragOver={handleDrag}
				onDrop={handleDrop}
				onClick={onButtonClick}
			>
				<input
					ref={fileInputRef}
					type="file"
					className={styles.file__input}
					multiple
					onChange={handleChange}
					accept={acceptedTypes}
				/>
				<div className={styles.upload__content}>
					<div className={styles.upload__icon}>📁</div>
					<p className={styles.upload__text}>
						Перетащите файлы сюда или нажмите для выбора
					</p>
					<p className={styles.upload__formats}>
						Поддерживаемые форматы: PDF, DOC, TXT, CSV, XLSX
					</p>
				</div>
			</div>
		</div>
	);
};

export default FileUploader;