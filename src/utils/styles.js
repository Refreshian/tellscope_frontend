export function generateCalcString(array, isViewData) {
	const baseValue = 90;
	const increment = 56;
	const viewportWidth = 1440;

	if (!isViewData) {
		return `calc(${increment}/${viewportWidth}*100vw)`;
	}

	const length = array.length;
	const calculatedValue = baseValue + increment * length;
	return `calc(${calculatedValue}/${viewportWidth}*100vw)`;
}

export function generateCalc(index) {
	const baseValue = 58;
	const increment = 58;
	const viewportWidth = 1440;

	const calculatedValue = baseValue + increment * index;
	return `calc(${calculatedValue}/${viewportWidth}*100vw)`;
}
