import styles from './Pagination.module.scss';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
	const getPagination = () => {
		let pages = [];
		if (totalPages <= 6) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			if (currentPage <= 4) {
				pages = [1, 2, 3, 4, 5, '...', totalPages];
			} else if (currentPage > 4 && currentPage < totalPages - 3) {
				pages = [
					1,
					'...',
					currentPage - 1,
					currentPage,
					currentPage + 1,
					'...',
					totalPages,
				];
			} else {
				pages = [
					1,
					'...',
					totalPages - 4,
					totalPages - 3,
					totalPages - 2,
					totalPages - 1,
					totalPages,
				];
			}
		}
		return pages;
	};

	return (
		<div className={styles.pagination}>
			<button
				className={styles.arrow}
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}
			>
				&lt;
			</button>
			{getPagination().map((page, index) => (
				<button
					key={index}
					className={`${styles.page} ${
						currentPage === page ? styles.active : ''
					}`}
					onClick={() => onPageChange(page)}
					disabled={page === '...'}
				>
					{page}
				</button>
			))}
			<button
				className={styles.arrow}
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === totalPages}
			>
				&gt;
			</button>
		</div>
	);
};

export default Pagination;
