import styles from './Loader.module.scss';

const Loader = () => {
	return (
		<svg width='50' height='50' viewBox='0 0 50 50' className={styles.loader}>
			<circle
				cx='25'
				cy='25'
				r='20'
				fill='none'
				stroke='#1760E8'
				strokeWidth='4'
				strokeDasharray='100'
				strokeDashoffset='50'
			>
				<animateTransform
					attributeName='transform'
					type='rotate'
					from='0 25 25'
					to='360 25 25'
					dur='3s'
					repeatCount='indefinite'
				/>
			</circle>
			<circle
				cx='25'
				cy='25'
				r='15'
				fill='none'
				stroke='#0B42A7'
				strokeWidth='4'
				strokeDasharray='75'
				strokeDashoffset='37.5'
			>
				<animateTransform
					attributeName='transform'
					type='rotate'
					from='360 25 25'
					to='0 25 25'
					dur='2s'
					repeatCount='indefinite'
				/>
			</circle>
			<circle
				cx='25'
				cy='25'
				r='10'
				fill='none'
				stroke='#228BE6'
				strokeWidth='4'
				strokeDasharray='50'
				strokeDashoffset='25'
			>
				<animateTransform
					attributeName='transform'
					type='rotate'
					from='0 25 25'
					to='360 25 25'
					dur='1.5s'
					repeatCount='indefinite'
				/>
			</circle>
		</svg>
	);
};

export default Loader;
