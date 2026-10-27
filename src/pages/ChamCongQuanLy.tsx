import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, message, DatePicker, Select, Input, Row, Col, Space, Alert } from 'antd';
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
      render: (val: string) => <strong>{val || 'Chưa rõ'}</strong>,
    },
    {
      title: 'Chức danh',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
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
      render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag>,
    },
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay' },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao', render: (val: string) => formatTime(val) },
    {
      title: 'Giờ ra',
      dataIndex: 'gioRa',
      key: 'gioRa',
      render: (val: string) => formatTime(val),
    },
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
    <div>
      <Alert
        message="Phân quyền theo dõi chấm công theo phòng ban"
        description={
          <div>
            <div>• <strong>Chủ doanh nghiệp:</strong> Theo dõi toàn bộ lịch sử chấm công của nhân sự các phòng ban trong toàn công ty.</div>
            <div>• <strong>Trưởng phòng / Quản lý:</strong> Chỉ theo dõi bảng chấm công của nhân sự trực thuộc phòng ban mình quản lý.</div>
          </div>
        }
        type="info"
        showIcon
        icon={<ClockCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

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

        <Table dataSource={displayData} columns={columns} rowKey="maChamCong" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
};