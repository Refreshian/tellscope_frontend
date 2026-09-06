import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
  import { dataSetService } from '../../services/dataSet.service';

// Получение содержимого папки
export const fetchFolderContents = createAsyncThunk(
  'data/fetchFolderContents',
  async ({ folderId, userId }) => {
    const response = await api.get(`/folders/${folderId}/contents`, {
      params: { userId }
    });
    return response.data;
  }
);

// Удаление файла
export const deleteFile = createAsyncThunk(
  'data/deleteFile',
  async (fileId) => {
    await api.delete(`/files/${fileId}`);
    return fileId;
  }
);

// Загрузка файла
export const downloadFile = createAsyncThunk(
  'data/downloadFile',
  async (fileId) => {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', response.headers['content-disposition']?.split('filename=')[1] || 'file');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    folders: [],
    folderContents: [],
    loading: false,
    error: null,
    currentFolder: null,
    viewMode: 'folders'
  },
  reducers: {
    setCurrentFolder: (state, action) => {
      state.currentFolder = action.payload;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    clearFolderContents: (state) => {
      state.folderContents = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFolderContents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFolderContents.fulfilled, (state, action) => {
        state.loading = false;
        state.folderContents = action.payload;
      })
      .addCase(fetchFolderContents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.folderContents = state.folderContents.filter(
          item => item.id !== action.payload
        );
      })
      .addCase(downloadFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(downloadFile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(downloadFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { setCurrentFolder, setViewMode, clearFolderContents } = dataSlice.actions;
export default dataSlice.reducer;