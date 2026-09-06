// components/FolderView.jsx
import React, { useState, useEffect } from 'react';
import { Button, Table, Space, message, Modal } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFolderContents, deleteFile, downloadFile } from "../../../../store/slices/dataSlice";

const FolderView = ({ folder, onBack, userId }) => {
  const dispatch = useDispatch();
  const { folderContents, loading } = useSelector(state => state.data);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]); 

  useEffect(() => {
    if (folder && folder.id) {
      dispatch(fetchFolderContents({ folderId: folder.id, userId }));
    }
  }, [dispatch, folder, userId]);

  const handleDelete = (fileId) => {
    Modal.confirm({
      title: 'Удалить файл?',
      content: 'Вы уверены, что хотите удалить этот файл?',
      onOk: () => {
        dispatch(deleteFile(fileId))
          .then(() => {
            message.success('Файл успешно удален');
            dispatch(fetchFolderContents({ folderId: folder.id, userId }));
          })
          .catch(() => {
            message.error('Ошибка при удалении файла');
          });
      },
    });
  };

  const handleDownload = (file) => {
    dispatch(downloadFile(file.id))
      .then(() => {
        message.success('Файл загружен');
      })
      .catch(() => {
        message.error('Ошибка при загрузке файла');
      });
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>
          {record.type === 'folder' ? '📁' : '📄'} {text}
        </span>
      ),
    },
    {
      title: 'Размер',
      dataIndex: 'size',
      key: 'size',
      render: (size) => size ? `${(size / 1024).toFixed(2)} KB` : '-',
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(), 
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            disabled={record.type === 'folder'}
          >
            Скачать
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  return (
    <div className="folder-view">
      <div className="folder-header"> 
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ marginBottom: 16 }}
        >
          Назад к папкам
        </Button>
        <h2>{folder?.name || 'Папка'}</h2>
      </div>
      
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={folderContents}
        loading={loading}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} из ${total} элементов`,
        }}
      />
    </div>
  );
};

export default FolderView;