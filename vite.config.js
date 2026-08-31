import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@st': path.resolve(__dirname, 'src/styles'),
		},
	},
	css: {
		preprocessorOptions: {
			scss: {
				silenceDeprecations: ['legacy-js-api'],
			},
		},
	},
	server: {
		host: '0.0.0.0',
		port: 4000,
		proxy: {
			'/api': {
				target: 'http://194.146.113.124:5000', // измените на ваш сервер
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/api/, '')
			},
			'/auth': {
				target: 'http://194.146.113.124:5000', // измените на ваш сервер
				changeOrigin: true,
				secure: false,
			}
		}
	}
});