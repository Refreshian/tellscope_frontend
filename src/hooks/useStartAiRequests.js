import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useGetUserIdQuery } from '../services/other.service';
import {
  useLazyGetStatusRequestQuery,
  useLazyStartDataAiQuery,
  useLazyStartTestingQuery,
} from '../services/tables.service';
import { findKeyById } from '../utils/searchInData';

import { useActions } from './useActions';

export const useStartAiRequests = () => {
  const nav = useNavigate();
  const { post } = useSelector(state => state.aiData);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { json_files_directory: dataUser } = useSelector(
    store => store.dataUsersSlice,
  );
  const {
    toggleBarStart,
    toggleIsViewPromptPopup,
    toggleFinalStatus,
    addFirstHtmlFileRequest,
  } = useActions();

  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [isSuccessTest, setIsSuccessTest] = useState(false);
  const [isSuccessAi, setIsSuccessAi] = useState(false);
  const intervalRef = useRef(null);

  const { data: data_getUserId } = useGetUserIdQuery();
  const [trigger, { data, isError, isLoading, isSuccess }] =
    useLazyStartTestingQuery();
  const [
    trigger_status,
    {
      data: data_status,
      isError: isError_status,
      isLoading: isLoading_status,
      isSuccess: isSuccess_status,
    },
  ] = useLazyGetStatusRequestQuery();
  const [triger_data, { data_ai }] = useLazyStartDataAiQuery();

  const getText = () => dataForRequest.texts.map(el => el.text);

  const dataForRequestTesting = {
    user_id: data_getUserId,
    texts: [
      ...getText(),
    ],
    system_prompt: post.system_prompt,
    prompt_question: post.text_prompt,
  };

  const dataForRequestAi = {
    user_id: data_getUserId,
    folder_name: findKeyById(dataForRequest.index, dataUser),
    index: dataForRequest.index,
    min_date: dataForRequest.min_range_date,
    max_date: dataForRequest.max_range_date,
    query_str: dataForRequest.query_str,
    system_prompt: post.system_prompt,
    promt_question: post.text_prompt,
  };

  // Функция для очистки интервала
  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Функция для завершения процесса и навигации
	const completeProcess = useCallback((responseData) => {
	clearCurrentInterval();
	setIsLoadingTest(false);
	setIsSuccessAi(true);
	toggleBarStart(true);     // оставить состояние "анализ идет"
	toggleFinalStatus(true);  // статус "готово"

	}, [addFirstHtmlFileRequest, toggleFinalStatus]);


  const onStartDataAi = useCallback(async () => {
    setIsSuccessAi(false);
    toggleIsViewPromptPopup(false);
    
    try {
      toggleBarStart(true);
      setIsLoadingTest(true);
      
      const startResponse = await triger_data(dataForRequestAi);
      console.log('Start response:', startResponse);

      if (!startResponse.data?.task_id) {
        setIsLoadingTest(false);
        toggleBarStart(false);
        return;
      }

      const taskId = startResponse.data.task_id;
      let currentStage = 'progress';

      const checkStatus = async () => {
        try {
          const statusResponse = await trigger_status(taskId);
          console.log('Status response', currentStage, statusResponse?.data);

          if (statusResponse.error) {
            console.error('Status check failed:', statusResponse.error);
            clearCurrentInterval();
            setIsLoadingTest(false);
            toggleBarStart(false);
            return;
          }

          const responseData = statusResponse.data;
          
          // Обновляем этап на основе прогресса
          if (currentStage === 'progress' && responseData?.progress === 100) {
            currentStage = 'embedding';
            console.log('Switching to embedding stage');
          }

          if (currentStage === 'embedding' && responseData?.embedding_progress === 100) {
            currentStage = 'final';
            console.log('Switching to final stage');
          }

        // Проверяем завершение всех этапов
		if (
		Number(responseData?.progress) === 100 &&
		(responseData?.status === 'done' || responseData?.final_status === 'done')
		) {
		completeProcess(responseData);
		}

        } catch (e) {
          console.error('Error during status check:', e);
          clearCurrentInterval();
          setIsLoadingTest(false);
          setIsSuccessAi(false);
          toggleBarStart(false);
        }
      };

      // Первая проверка
      await checkStatus();

      // Запускаем периодические проверки
      intervalRef.current = setInterval(checkStatus, 3000);

    } catch (error) {
      console.error('AI processing failed:', error);
      clearCurrentInterval();
      setIsLoadingTest(false);
      setIsSuccessAi(false);
      toggleBarStart(false);
    }
  }, [
    dataForRequestAi,
    triger_data,
    trigger_status,
    toggleIsViewPromptPopup,
    toggleBarStart,
    completeProcess,
    clearCurrentInterval
  ]);

  const onStartTesting = async () => {
    setIsSuccessTest(false);
    try {
      setIsLoadingTest(true);
      const startResponse = await trigger(dataForRequestTesting);
      console.log('startResponse', startResponse);
      if (!startResponse.data?.task_id) {
        setIsLoadingTest(false);
        return;
      }

      const taskId = startResponse.data.task_id;
      const MAX_CHECKS = 100;
      let checksCount = 0;
      let intervalId = null;

      const checkStatus = async () => {
        try {
          const statusResponse = await trigger_status(taskId);

          if (statusResponse.error) {
            console.error('Status check failed:', statusResponse.error);
            setIsLoadingTest(false);
            if (intervalId) clearInterval(intervalId);
            return false;
          }

          if (statusResponse.data?.status === 'done') {
            setIsLoadingTest(false);
            setIsSuccessTest(true);
            if (intervalId) clearInterval(intervalId);
            console.log(
              'Task completed!',
              statusResponse.data,
              statusResponse.data.result,
            );
            return true;
          }

          return false;
        } catch (e) {
          setIsLoadingTest(false);
          setIsSuccessTest(false);
          if (intervalId) clearInterval(intervalId);
          console.error('Error during status check:', e);
          return false;
        }
      };

      const isCompleted = await checkStatus();
      if (isCompleted) return;

      intervalId = setInterval(async () => {
        if (checksCount++ >= MAX_CHECKS) {
          clearInterval(intervalId);
          setIsLoadingTest(false);
          setIsSuccessTest(false);
          console.error('Status check timeout: Maximum checks reached');
          return;
        }

        const isCompleted = await checkStatus();
        if (isCompleted) {
          clearInterval(intervalId);
          setIsSuccessTest(true);
        }
      }, 3000);

    } catch (e) {
      console.error('Testing failed:', e);
      setIsLoadingTest(false);
      setIsSuccessTest(false);
    }
  };

  return {
    onStartTesting,
    isLoadingTest,
    isSuccessTest,
    data,
    onStartDataAi,
    isSuccessAi,
    setIsSuccessAi,
  };
};