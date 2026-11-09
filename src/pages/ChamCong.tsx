import React, { useEffect, useState } from 'react';
import { Card, Table, Button, DatePicker, Tag, Space, message, Row, Col, Statistic, Input, Modal } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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

  const executeCheckInOut = async (today: string) => {
    try {
      const res = await chamCongApi.checkInOut(today);
      if (res.data?.isEarly) {
        message.warning(res.data.message, 6);
      } else {
        message.success(res.data?.message || 'Chấm công thành công!');
      }
      fetchData(selectedMonth);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Chấm công thất bại.');
    }
  };

  const handleCheckIn = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayRecord = data.find((c) => c.ngay === today);
    const nowHour = dayjs().hour();
    const isCheckingOut = todayRecord && todayRecord.gioVao && (!todayRecord.gioRa || todayRecord.gioRa === '00:00:00' || todayRecord.gioRa.startsWith('00:00:00'));

    if (isCheckingOut) {
      const parts = (todayRecord.gioVao || '').split(':');
      let workedHours = 0;
      if (parts.length >= 2) {
        const inTime = dayjs().hour(Number(parts[0])).minute(Number(parts[1])).second(Number(parts[2] || 0));
        workedHours = dayjs().diff(inTime, 'hour', true);
      }

      if (workedHours < 2.0) {
        const workedMins = Math.max(1, Math.round(workedHours * 60));
        Modal.confirm({
          title: 'CẢNH BÁO: THỜI GIAN LÀM VIỆC DƯỚI 2 GIỜ (BỎ CA)!',
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          content: `Bạn mới làm việc được ${workedMins} phút (chưa đạt tối thiểu 2 giờ). Nếu Check-out bây giờ, hệ thống sẽ xác định là "BỎ CA" và tính 0 NGÀY CÔNG (không có lương ngày hôm nay). Bạn có chắc chắn muốn kết thúc ca không?`,
          okText: 'Xác nhận Bỏ ca (0 công)',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }

      if (workedHours < 5.0) {
        Modal.confirm({
          title: 'CẢNH BÁO: CHECK-OUT VỀ SỚM (NỬA CÔNG)!',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: `Thời gian làm việc hiện tại là ${workedHours.toFixed(1)} giờ (từ 2 đến dưới 5 giờ). Nếu Check-out lúc này, ca làm việc hôm nay chỉ được tính NỬA NGÀY CÔNG (0.5 công). Bạn có chắc chắn muốn Check-out không?`,
          okText: 'Xác nhận (0.5 công)',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }

      if (nowHour < 17) {
        Modal.confirm({
          title: 'CẢNH BÁO: CHECK-OUT TRƯỚC 17:00 (VỀ SỚM)!',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: `Giờ tan ca tiêu chuẩn là 17:00. Bạn đang thực hiện Check-out lúc ${dayjs().format('HH:mm:ss')} (sớm hơn quy định). Bạn có chắc chắn muốn Check-out về sớm không?`,
          okText: 'Xác nhận về sớm',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }
    }

    await executeCheckInOut(today);
  };

  const formatTime = (val?: string) => {
    if (!val || val === '00:00:00' || val.startsWith('00:00:00')) return '-';
    return val.split('.')[0];
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao', render: (val: string) => formatTime(val) },
    { title: 'Giờ ra', dataIndex: 'gioRa', key: 'gioRa', render: (val: string) => formatTime(val) },
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
        if (val.includes('Bỏ ca') || val.includes('Không đủ công')) color = 'error';
        else if (val.includes('Nửa công')) color = 'purple';
        else if (val.includes('Đi muộn') && val.includes('Về sớm')) color = 'red';
        else if (val.includes('Về sớm')) color = 'orange';
        else if (val.includes('Đi muộn')) color = 'gold';
        else if (val.includes('Thiếu')) color = 'volcano';
        else if (val.includes('Hoàn thành') || val === 'Đã check-in') color = 'green';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: 'Công ghi nhận',
      key: 'congQuyDoi',
      align: 'center' as const,
      width: 120,
      render: (_: any, record: ChamCong) => {
        const st = record.trangThai || '';
        if (st.includes('Bỏ ca') || st === 'Vắng mặt' || st.includes('Thiếu giờ vào')) {
          return <Tag color="default">0 công</Tag>;
        }
        if (st.includes('Nửa công')) {
          return <Tag color="purple">0.5 công</Tag>;
        }
        return <Tag color="blue">1.0 công</Tag>;
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
          <Card style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleCheckIn}
              style={{ background: '#52c41a', borderColor: '#52c41a', height: 48, fontSize: 16 }}
            >
              ĐIỂM DANH CHECK-IN / CHECK-OUT
            </Button>
            <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
              Quy định ca: Vào trước <strong>08:30</strong> • Tan ca từ <strong>17:00</strong> (Dưới 2h: Bỏ ca - 0 công • 2h-5h: Nửa công)
            </div>
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
          pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      </Card>
    </div>
  );
};