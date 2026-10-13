import React, { useEffect, useState } from 'react';
import { Card, Table, Button, message, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { BangLuong } from '../types';

export const BangLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await bangLuongApi.getMine();
      setData(res.data);
    } catch {
      message.error('Không thể tải bảng lương.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    try {
      const res = await exportApi.exportBangLuong();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BangLuong_CaNhan.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Xuất file thành công!');
    } catch {
      message.error('Không thể xuất file bảng lương.');
    }
  };

  const columns = [
    { title: 'Thời gian', dataIndex: 'thoiGian', key: 'thoiGian' },
    {
      title: 'Lương cơ bản',
      dataIndex: 'luongCoBan',
      key: 'luongCoBan',
      render: (val: number) => val?.toLocaleString('vi-VN') + ' đ',
    },
    {
      title: 'Phụ cấp',
      dataIndex: 'phuCap',
      key: 'phuCap',
      render: (val: number) => (val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'),
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'thucLinh',
      key: 'thucLinh',
      render: (val: number) => (
        <strong style={{ color: '#52c41a', fontSize: 16 }}>
          {val?.toLocaleString('vi-VN')} đ
        </strong>
      ),
    },
  ];

  return (
    <Card
      title="PHIẾU LƯƠNG CÁ NHÂN"
      extra={
        <Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            Tải bảng lương (Excel)
          </Button>
        </Space>
      }
    >
      <Table dataSource={data} columns={columns} rowKey="maBangLuong" loading={loading} />
    </Card>
  );
};