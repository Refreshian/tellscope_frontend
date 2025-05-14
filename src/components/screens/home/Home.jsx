import { useSelector } from 'react-redux';

import Content from '@/components/content/Content';
import SectionSelection from '@/components/content/section-selection/SectionSelection';
import Layout from '@/components/layout/Layout';
import LeftMenu from '@/components/ui/left-menu/LeftMenu';
import LeftMenuActive from '@/components/ui/left-menu/left-menu-active/LeftMenuActive';

import { useCheckAuth } from '../../../hooks/useCheckAuth';
import {
	useGetUserFoldersQuery,
	useGetUserIdQuery,
} from '../../../services/other.service';

const Home = () => {
	useCheckAuth();

	// const { addData, addIndex } = useActions();
	const { active_menu } = useSelector(store => store.booleanValues);
	// const { values: dataUser } = useSelector(store => store.dataUsersSlice);
	// const { isAuth } = useAuth();

	const {
		data: data_getUserId,
		isError: isError_getUserId,
		error: error_getUserId,
		isLoading: isLoading_getUserId,
	} = useGetUserIdQuery();
	const { data, isError, error, isLoading, isSuccess } =
		useGetUserFoldersQuery(data_getUserId);

	// const [selectedFile, setSelectedFile] = useState(null);
	// const handleFileChange = event => {
	// 	setSelectedFile(event.target.files[0]);
	// };
	// const test = async () => {
	// 	if (!selectedFile) {
	// 		console.error('Файл не выбран');
	// 		return;
	// 	}
	// 	const formData = new FormData();
	// 	formData.append('uploaded_file', selectedFile);
	// 	console.log('formData entries:');
	// 	formData.forEach((value, key) => {
	// 		console.log(key, value);
	// 	});
	// 	try {
	// 		const response = await axios.post(
	// 			// 'http://194.146.113.123:5000/upload-file/?folder_name=adsad',
	// 			'https://194.146.113.123/api/upload-file/?folder_name=tessddsd',
	// 			// selectedFile,
	// 			formData,
	// 			{
	// 				headers: {
	// 					'Content-Type': 'multipart/form-data',
	// 					Accept: 'application/json',
	// 				},
	// 			},
	// 		);
	// 		console.log('Ответ сервера:', response.data);
	// 	} catch (error) {
	// 		console.error('Ошибка загрузки файла:', error);
	// 	}
	// };

	return (
		<Layout>
			{active_menu ? <LeftMenuActive /> : <LeftMenu />}
			<Content>
				{/* <input type='file' onChange={handleFileChange} />
				<button onClick={test}>test</button> */}
				{/* {isError && <p>Вы не авторизованы</p>} */}
				<SectionSelection />
			</Content>
		</Layout>
	);
};

export default Home;
