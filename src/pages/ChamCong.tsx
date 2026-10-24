import React, { useEffect, useState } from 'react';
import { Card, Table, Button, DatePicker, Tag, Space, message, Row, Col, Statistic, Input } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { chamCongApi } from '../api/chamCongApi';
import { ChamCong } from '../types';
import dayjs from 'dayjs';

export const ChamCongPage: React.FC = () => {
  const [data, setData] = useState<ChamCong[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs().format('HH:mm:ss')), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (m: dayjs.Dayjs) => {
    try {
      setLoading(true);
      const res = await chamCongApi.getMyAttendance(m.month() + 1, m.year());
      setData(res.data);
    } catch {
      message.error('Không thể tải lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const handleCheckIn = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await chamCongApi.checkInOut(today);
      message.success(res.data?.message || 'Chấm công thành công!');
      fetchData(selectedMonth);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Chấm công thất bại.');
    }
  };

  const columns = [
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
        if (val.includes('Hoàn thành') || val === 'Đã check-in') color = 'green';
        if (val.includes('Thiếu')) color = 'volcano';
        return <Tag color={color}>{val}</Tag>;
      },
    },
  ];

  const filteredData = data.filter((item) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.ngay || '').toLowerCase().includes(kw) ||
      (item.trangThai || '').toLowerCase().includes(kw) ||
      (item.gioVao || '').toLowerCase().includes(kw) ||
      (item.gioRa || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Đồng hồ hệ thống"
              value={currentTime}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleCheckIn}
              style={{ background: '#52c41a', borderColor: '#52c41a', height: 48, fontSize: 16 }}
            >
              ĐIỂM DANH CHECK-IN / CHECK-OUT
            </Button>
          </Card>
        </Col>
      </Row>

      <Card
        title="LỊCH SỬ CHẤM CÔNG CÁ NHÂN"
        extra={
          <Space wrap>
            <Input
              placeholder="Tìm theo ngày, trạng thái..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />
            <span>Chọn tháng:</span>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
            />
          </Space>
        }
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="maChamCong"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
};