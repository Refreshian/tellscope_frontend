// Космическая (ночная) тема Highcharts — концепция A
import Highcharts from 'highcharts';

Highcharts.setOptions({
	colors: ['#7C8CFF', '#38C6FF', '#B98CFF', '#5EE0C0', '#FFC46B', '#FF8FA3', '#8F9BB3', '#C7D3EA'],
	chart: {
		backgroundColor: 'linear-gradient(180deg, #0E1D3F 0%, #0A1836 100%)',
		borderRadius: 12,
		style: { fontFamily: 'Inter, system-ui, sans-serif', color: '#D9E4FA' },
	},
	title: { style: { color: '#F1F5FF' } },
	subtitle: { style: { color: '#B9C6E4' } },
	xAxis: {
		gridLineColor: 'rgba(255,255,255,0.07)',
		lineColor: 'rgba(255,255,255,0.18)',
		tickColor: 'rgba(255,255,255,0.2)',
		labels: { style: { color: '#B9C6E4' } },
		title: { style: { color: '#D9E4FA' } },
	},
	yAxis: {
		gridLineColor: 'rgba(255,255,255,0.07)',
		lineColor: 'rgba(255,255,255,0.18)',
		tickColor: 'rgba(255,255,255,0.2)',
		labels: { style: { color: '#B9C6E4' } },
		title: { style: { color: '#D9E4FA' } },
	},
	legend: {
		itemStyle: { color: '#C7D3EA' },
		itemHoverStyle: { color: '#FFFFFF' },
		itemHiddenStyle: { color: '#5A6A8A' },
	},
	tooltip: {
		backgroundColor: '#0E1D3F',
		borderColor: 'rgba(124,140,255,0.45)',
		style: { color: '#EAF1FF' },
	},
	credits: { style: { color: '#5A6A8A' } },
	plotOptions: {
		series: { dataLabels: { style: { color: '#EAF1FF', textOutline: 'none' } } },
	},
});
