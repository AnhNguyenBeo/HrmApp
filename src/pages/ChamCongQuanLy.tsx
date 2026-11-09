import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, message, DatePicker, Select, Input, Row, Col, Space, Tooltip } from 'antd';
import { ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { chamCongApi } from '../api/chamCongApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, PhongBan } from '../api/danhMucApi';
import { ChamCong } from '../types';

export const ChamCongQuanLyPage: React.FC = () => {
  const [data, setData] = useState<ChamCong[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';

  const [myDeptId, setMyDeptId] = useState<string | undefined>(currentUser?.maPhongBan);
  const [myDeptName, setMyDeptName] = useState<string | undefined>(currentUser?.tenPhongBan);

  const [phongBans, setPhongBans] = useState<PhongBan[]>([]);
  const [selectedPhongBan, setSelectedPhongBan] = useState<string>('ALL');

  useEffect(() => {
    if (currentUser?.maNhanVien && (!myDeptId || !myDeptName)) {
      nhanVienApi.getById(currentUser.maNhanVien).then((res) => {
        if (res.data) {
          if (res.data.maPhongBan) setMyDeptId(res.data.maPhongBan);
          if (res.data.tenPhongBan) setMyDeptName(res.data.tenPhongBan);
          const updated = {
            ...currentUser,
            maPhongBan: res.data.maPhongBan,
            tenPhongBan: res.data.tenPhongBan,
            tenChucVu: res.data.tenChucVu,
          };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }).catch(() => {});
    }
  }, [currentUser?.maNhanVien]);

  useEffect(() => {
    if (isOwner) {
      danhMucApi.getPhongBans().then((res) => setPhongBans(res.data)).catch(() => {});
    }
  }, [isOwner]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        month: selectedMonth.month() + 1,
        year: selectedMonth.year(),
      };
      if (isOwner && selectedPhongBan !== 'ALL') {
        params.maPhongBan = selectedPhongBan;
      }
      const res = await chamCongApi.getAll(params);
      setData(res.data || []);
    } catch {
      message.error('Không thể tải lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedPhongBan]);

  const displayData = data.filter((item) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.hoTen || '').toLowerCase().includes(kw) ||
      (item.tenPhongBan || '').toLowerCase().includes(kw) ||
      (item.tenChucVu || '').toLowerCase().includes(kw) ||
      (item.trangThai || '').toLowerCase().includes(kw) ||
      (item.ngay || '').toLowerCase().includes(kw)
    );
  });

  const formatTime = (val?: string) => {
    if (!val || val === '00:00:00' || val.startsWith('00:00:00')) return '-';
    return val.split('.')[0];
  };

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'hoTen',
      key: 'hoTen',
      width: 170,
      render: (val: string) => <strong style={{ whiteSpace: 'nowrap' }}>{val || 'Chưa rõ'}</strong>,
    },
    {
      title: 'Chức danh',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      width: 150,
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Chủ doanh nghiệp') || val?.includes('Giám đốc')) color = 'gold';
        else if (val?.includes('Trưởng')) color = 'blue';
        else if (val?.includes('Phó')) color = 'cyan';
        return <Tag color={color}>{val || 'Nhân viên'}</Tag>;
      },
    },
    {
      title: 'Phòng ban',
      dataIndex: 'tenPhongBan',
      key: 'tenPhongBan',
      width: 180,
      render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag>,
    },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay', width: 110, render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val}</span> },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao', width: 100, render: (val: string) => formatTime(val) },
    {
      title: 'Giờ ra',
      dataIndex: 'gioRa',
      key: 'gioRa',
      width: 110,
      render: (val: string, record: ChamCong) => {
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !val || val === '00:00:00' || val.startsWith('00:00:00') || val === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        if (record.trangThai === 'Chưa check-out' || (isPast && noOut && hasIn && record.trangThai !== 'Vắng mặt')) {
          return <Tag color="error">Chưa check-out</Tag>;
        }
        return formatTime(val);
      },
    },
    {
      title: 'Tăng ca (OT)',
      dataIndex: 'soGioTangCa',
      key: 'soGioTangCa',
      width: 120,
      render: (val: number) => (val > 0 ? <Tag color="orange">{val} giờ</Tag> : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 170,
      render: (val: string, record: ChamCong) => {
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !record.gioRa || record.gioRa === '00:00:00' || record.gioRa.startsWith('00:00:00') || record.gioRa === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        if (val === 'Chưa check-out' || (isPast && noOut && hasIn && val !== 'Vắng mặt')) {
          return <Tag color="error">Chưa check-out</Tag>;
        }
        let color = 'default';
        if (val?.includes('Bỏ ca') || val?.includes('Không đủ công')) color = 'error';
        else if (val?.includes('Nửa công')) color = 'purple';
        else if (val?.includes('Đi muộn') && val?.includes('Về sớm')) color = 'red';
        else if (val?.includes('Về sớm')) color = 'orange';
        else if (val?.includes('Đi muộn')) color = 'gold';
        else if (val?.includes('Thiếu')) color = 'volcano';
        else if (val?.includes('Hoàn thành') || val === 'Đã check-in') color = 'green';
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
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !record.gioRa || record.gioRa === '00:00:00' || record.gioRa.startsWith('00:00:00') || record.gioRa === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        const isMissedCheckOut = st === 'Chưa check-out' || (isPast && noOut && hasIn && st !== 'Vắng mặt');

        if (st.includes('Bỏ ca') || st === 'Vắng mặt' || st.includes('Thiếu giờ vào') || isMissedCheckOut) {
          return (
            <Tooltip title={isMissedCheckOut ? "Chưa check-out (0 công). Đang chờ nộp đơn giải trình." : undefined}>
              <Tag color="default">0 công</Tag>
            </Tooltip>
          );
        }
        if (st.includes('Nửa công')) {
          return <Tag color="purple">0.5 công</Tag>;
        }
        return <Tag color="blue">1.0 công</Tag>;
      },
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            {isOwner
              ? 'THEO DÕI CHẤM CÔNG TOÀN CÔNG TY (CHỦ DOANH NGHIỆP)'
              : `THEO DÕI CHẤM CÔNG - ${myDeptName ? myDeptName.toUpperCase() : 'PHÒNG BAN QUẢN LÝ'}`}
          </span>
        }
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space wrap size="middle">
              <span>Tháng:</span>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(val) => val && setSelectedMonth(val)}
                format="MM/YYYY"
                allowClear={false}
              />

              {isOwner ? (
                <Select
                  value={selectedPhongBan}
                  onChange={setSelectedPhongBan}
                  style={{ width: 220 }}
                >
                  <Select.Option value="ALL">Tất cả phòng ban</Select.Option>
                  {phongBans.map((pb) => (
                    <Select.Option key={pb.maPhongBan} value={pb.maPhongBan}>
                      {pb.tenPhongBan}
                    </Select.Option>
                  ))}
                </Select>
              ) : myDeptName ? (
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
                  🏢 Đang quản lý: <strong>{myDeptName}</strong>
                </Tag>
              ) : null}
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Input
              placeholder="Tìm theo tên, chức vụ, trạng thái, ngày..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
          </Col>
        </Row>

        <Table
          dataSource={displayData}
          columns={columns}
          rowKey="maChamCong"
          loading={loading}
          scroll={{ x: 1050 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `Tổng cộng ${t} lượt chấm công` }}
        />
      </Card>
    </div>
  );
};