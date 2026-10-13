import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, message } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { chamCongApi } from '../api/chamCongApi';
import { ChamCong } from '../types';

export const ChamCongQuanLyPage: React.FC = () => {
  const [data, setData] = useState<ChamCong[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await chamCongApi.getAll();
      setData(res.data);
    } catch {
      message.error('Không thể tải lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { title: 'Nhân viên', dataIndex: 'hoTen', key: 'hoTen', render: (val: string) => <strong>{val}</strong> },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao' },
    { title: 'Giờ ra', dataIndex: 'gioRa', key: 'gioRa', render: (val: string) => val === '00:00:00' ? '-' : val },
    {
      title: 'Tăng ca (OT)',
      dataIndex: 'soGioTangCa',
      key: 'soGioTangCa',
      render: (val: number) => (val > 0 ? <Tag color="orange">{val} giờ</Tag> : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Hoàn thành') || val === 'Đã check-in') color = 'green';
        if (val?.includes('Thiếu')) color = 'volcano';
        return <Tag color={color}>{val}</Tag>;
      },
    },
  ];

  return (
    <Card
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          THEO DÕI CHẤM CÔNG NHÂN SỰ TOÀN CÔNG TY
        </span>
      }
    >
      <Table dataSource={data} columns={columns} rowKey="maChamCong" loading={loading} />
    </Card>
  );
};