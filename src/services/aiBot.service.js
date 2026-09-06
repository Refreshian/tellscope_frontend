import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL, TOKEN } from '../app.constants';

const aiBotApi = createApi({
  reducerPath: 'aiBotApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://194.146.113.124:5000', // Замените на ваш базовый URL
    prepareHeaders: (headers) => {
      // Добавьте необходимые заголовки если нужно
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['AIQuestion'],
  endpoints: (builder) => ({
    // Существующий эндпойнт
    sendAiQuestion: builder.mutation({
      query: (data) => ({
        url: '/ai-question', // старый эндпойнт
        method: 'POST',
        body: data,
      }),
    }),
    // Новый эндпойнт для анализа
    sendAiQuestionAnalysis: builder.mutation({
      query: (data) => ({
        url: '/ai-question-analysis',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { 
  useSendAiQuestionMutation, 
  useSendAiQuestionAnalysisMutation 
} = aiBotApi;
export default aiBotApi;