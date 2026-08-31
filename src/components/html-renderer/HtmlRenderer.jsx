import { memo, useEffect, useRef } from 'react';

const HtmlRenderer = memo(({ htmlString }) => {
	const iframeRef = useRef(null);

	useEffect(() => {
		if (iframeRef.current) {
			const doc = iframeRef.current.contentDocument;
			doc.open();
			doc.write(htmlString);
			doc.close();
		}
	}, [htmlString]);

	return <iframe ref={iframeRef} style={{ width: '100%', border: 'none' }} />;
});

export default HtmlRenderer;
