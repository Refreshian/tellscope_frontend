import { createSlice } from '@reduxjs/toolkit';

const voiceDataSlice = createSlice({
  name: 'voiceData',
  initialState: {
    data: null,
  },
  reducers: {
    setVoiceData: (state, action) => {
      state.data = action.payload;
    },
  },
});

export const { setVoiceData } = voiceDataSlice.actions;
export default voiceDataSlice.reducer;