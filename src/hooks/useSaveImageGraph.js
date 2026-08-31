import html2canvas from 'html2canvas';

export const useSaveImageGraph = () => {
	const handleDownloadImage = id => {
		const graphElement = document.getElementById(id);
		if (graphElement) {
			html2canvas(graphElement).then(canvas => {
				const link = document.createElement('a');
				link.href = canvas.toDataURL('image/png');
				link.download = 'graph.png'; // Название скачиваемого файла
				link.click();
			});
		}
	};

	return handleDownloadImage;
};
