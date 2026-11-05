import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Spin, Table, Tag, Tabs, Badge, Progress, DatePicker, Space, Input, Button, Avatar } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  DollarOutlined,
  SolutionOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ReadOutlined,
  TrophyOutlined,
  BankOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { thongKeApi } from '../api/thongKeApi';
import { formatVND } from '../utils/format';
import { DashboardData, ThongKeLuongTheoQuy } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [tabSearch, setTabSearch] = useState('');
  const [salarySearch, setSalarySearch] = useState('');

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';
  const isAccounting = (currentUser?.tenPhongBan || '').toLowerCase().includes('kế toán');
  const canViewPayroll = Boolean(data?.canViewPayroll ?? (isOwner || isAccounting));

  const fetchStats = async (monthStr: string) => {
    try {
      setLoading(true);
      const res = await thongKeApi.getDashboard(monthStr);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedMonth.format('MM/YYYY'));
  }, [selectedMonth]);

  const totalActive = data?.tongSoNhanVien || 1;

  const percentPaid = (data?.tongQuyLuongThang || 0) > 0
    ? Math.round(((data?.luongDaChiTraThang || 0) / (data?.tongQuyLuongThang || 1)) * 100)
    : 0;

  const searchKw = tabSearch.trim().toLowerCase();

  const filteredDangLam = useMemo(() => {
    return (data?.tinhHinhNhanSu?.dangLamViec || []).filter((nv) => {
      if (!searchKw) return true;
      return (
        (nv.hoTen || '').toLowerCase().includes(searchKw) ||
        (nv.tenPhongBan || '').toLowerCase().includes(searchKw) ||
        (nv.tenChucVu || '').toLowerCase().includes(searchKw)
      );
    });
  }, [data, searchKw]);

  const filteredNghiPhep = useMemo(() => {
    return (data?.tinhHinhNhanSu?.nghiPhep || []).filter((d) => {
      if (!searchKw) return true;
      return (
        (d.hoTen || '').toLowerCase().includes(searchKw) ||
        (d.tenPhongBan || '').toLowerCase().includes(searchKw) ||
        (d.loaiDon || '').toLowerCase().includes(searchKw)
      );
    });
  }, [data, searchKw]);

  const filteredDaNghi = useMemo(() => {
    return (data?.tinhHinhNhanSu?.daNghiViec || []).filter((nv) => {
      if (!searchKw) return true;
      return (
        (nv.hoTen || '').toLowerCase().includes(searchKw) ||
        (nv.tenPhongBan || '').toLowerCase().includes(searchKw) ||
        (nv.tenChucVu || '').toLowerCase().includes(searchKw)
      );
    });
  }, [data, searchKw]);

  const filteredLuongTheoQuy = useMemo(() => {
    const list = data?.luongTheoQuy || [];
    const kw = salarySearch.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (item) =>
        item.hoTen.toLowerCase().includes(kw) ||
        item.tenPhongBan.toLowerCase().includes(kw)
    );
  }, [data, salarySearch]);

  const salaryTotals = useMemo(() => {
    const list = filteredLuongTheoQuy;
    return {
      q1: list.reduce((acc, cur) => acc + cur.luongQuy1, 0),
      q2: list.reduce((acc, cur) => acc + cur.luongQuy2, 0),
      q3: list.reduce((acc, cur) => acc + cur.luongQuy3, 0),
      q4: list.reduce((acc, cur) => acc + cur.luongQuy4, 0),
      totalYear: list.reduce((acc, cur) => acc + cur.tongThuNhapNam, 0),
    };
  }, [filteredLuongTheoQuy]);

  const handleExportQuarterlySalary = () => {
    if (!filteredLuongTheoQuy || filteredLuongTheoQuy.length === 0) return;
    const headers = [
      'STT',
      'Họ và tên',
      'Phòng ban',
      'Lương Quý 1 (VNĐ)',
      'Lương Quý 2 (VNĐ)',
      'Lương Quý 3 (VNĐ)',
      'Lương Quý 4 (VNĐ)',
      'Tổng thu nhập năm (VNĐ)',
    ];
    const rows = filteredLuongTheoQuy.map((item, idx) => [
      idx + 1,
      `"${item.hoTen}"`,
      `"${item.tenPhongBan}"`,
      item.luongQuy1,
      item.luongQuy2,
      item.luongQuy3,
      item.luongQuy4,
      item.tongThuNhapNam,
    ]);
    const summaryRow = [
      '',
      '"TỔNG QUỸ LƯƠNG TOÀN DOANH NGHIỆP"',
      '',
      salaryTotals.q1,
      salaryTotals.q2,
      salaryTotals.q3,
      salaryTotals.q4,
      salaryTotals.totalYear,
    ];
    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_LuongTheoQuy_${selectedMonth.format('YYYY')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) => {
    if (!name) return 'NV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const eduColors = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2'];
  const tenureColors = ['#00b96b', '#1677ff', '#722ed1', '#faad14'];

  const tabItems = [
    {
      key: 'dangLamViec',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>Đang làm việc</span>
          <Badge
            count={data?.tinhHinhNhanSu?.dangLamViec?.length || 0}
            style={{ backgroundColor: '#52c41a', boxShadow: 'none' }}
          />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredDangLam}
          columns={[
            {
              title: 'Họ và tên',
              dataIndex: 'hoTen',
              key: 'hoTen',
              render: (val: string) => (
                <Space>
                  <Avatar style={{ backgroundColor: '#e6f4ff', color: '#1677ff', fontWeight: 600 }}>
                    {getInitials(val)}
                  </Avatar>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{val}</span>
                </Space>
              ),
            },
            {
              title: 'Phòng ban',
              dataIndex: 'tenPhongBan',
              key: 'tenPhongBan',
              render: (val: string) => <Tag color="blue">{val}</Tag>,
            },
            {
              title: 'Chức danh',
              dataIndex: 'tenChucVu',
              key: 'tenChucVu',
              render: (val: string) => <span style={{ color: '#4b5563' }}>{val}</span>,
            },
            {
              title: 'Ngày vào làm',
              dataIndex: 'ngayVaoLam',
              key: 'ngayVaoLam',
              render: (val: string) => (
                <span style={{ color: '#6b7280', fontSize: 13, fontFamily: 'monospace' }}>
                  {val ? dayjs(val).format('DD/MM/YYYY') : '-'}
                </span>
              ),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              align: 'center',
              render: () => (
                <Tag color="green" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
                  <CheckCircleOutlined style={{ marginRight: 4 }} />
                  Đang công tác
                </Tag>
              ),
            },
          ]}
          rowKey="maNhanVien"
          pagination={{ pageSize: 6, showSizeChanger: false, showTotal: (total) => `Tổng cộng ${total} nhân sự` }}
          size="middle"
        />
      ),
    },
    {
      key: 'nghiPhep',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <SolutionOutlined style={{ color: '#faad14' }} />
          <span>Nghỉ phép trong tháng</span>
          <Badge
            count={data?.tinhHinhNhanSu?.nghiPhep?.length || 0}
            style={{ backgroundColor: '#faad14', boxShadow: 'none' }}
          />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredNghiPhep}
          columns={[
            {
              title: 'Họ và tên',
              dataIndex: 'hoTen',
              key: 'hoTen',
              render: (val: string) => (
                <Space>
                  <Avatar style={{ backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 600 }}>
                    {getInitials(val)}
                  </Avatar>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{val}</span>
                </Space>
              ),
            },
            {
              title: 'Phòng ban',
              dataIndex: 'tenPhongBan',
              key: 'tenPhongBan',
              render: (val: string) => <Tag color="blue">{val}</Tag>,
            },
            {
              title: 'Loại nghỉ',
              dataIndex: 'loaiDon',
              key: 'loaiDon',
              render: (val: string) => <Tag color="orange">{val}</Tag>,
            },
            {
              title: 'Thời gian nghỉ',
              key: 'thoiGian',
              render: (_, r) => (
                <span style={{ color: '#4b5563', fontSize: 13 }}>
                  {r.ngayBatDau ? dayjs(r.ngayBatDau).format('DD/MM') : ''} - {r.ngayKetThuc ? dayjs(r.ngayKetThuc).format('DD/MM/YYYY') : ''} ({r.soNgayNghi} ngày)
                </span>
              ),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              align: 'center',
              render: () => (
                <Tag color="warning" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
                  Nghỉ phép
                </Tag>
              ),
            },
          ]}
          rowKey={(r) => r.maNhanVien + r.ngayBatDau}
          pagination={{ pageSize: 6, showSizeChanger: false, showTotal: (total) => `Tổng cộng ${total} lượt nghỉ phép` }}
          size="middle"
        />
      ),
    },
    {
      key: 'daNghiViec',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <UserDeleteOutlined style={{ color: '#f5222d' }} />
          <span>Đã thôi việc</span>
          <Badge
            count={data?.tinhHinhNhanSu?.daNghiViec?.length || 0}
            style={{ backgroundColor: '#f5222d', boxShadow: 'none' }}
          />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredDaNghi}
          columns={[
            {
              title: 'Họ và tên',
              dataIndex: 'hoTen',
              key: 'hoTen',
              render: (val: string) => (
                <Space>
                  <Avatar style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
                    {getInitials(val)}
                  </Avatar>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{val}</span>
                </Space>
              ),
            },
            {
              title: 'Phòng ban',
              dataIndex: 'tenPhongBan',
              key: 'tenPhongBan',
              render: (val: string) => <Tag color="default">{val}</Tag>,
            },
            {
              title: 'Chức danh',
              dataIndex: 'tenChucVu',
              key: 'tenChucVu',
              render: (val: string) => <span style={{ color: '#4b5563' }}>{val}</span>,
            },
            {
              title: 'Ngày thôi việc',
              dataIndex: 'ngayNghiViec',
              key: 'ngayNghiViec',
              render: (val: string) => (
                <span style={{ color: '#ef4444', fontSize: 13, fontFamily: 'monospace' }}>
                  {val ? dayjs(val).format('DD/MM/YYYY') : 'Đã ghi nhận'}
                </span>
              ),
            },
            {
              title: 'Trạng thái',
              key: 'status',
              align: 'center',
              render: () => (
                <Tag color="red" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
                  Đã thôi việc
                </Tag>
              ),
            },
          ]}
          rowKey="maNhanVien"
          pagination={{ pageSize: 6, showSizeChanger: false, showTotal: (total) => `Tổng cộng ${total} nhân sự` }}
          size="middle"
        />
      ),
    },
  ];

  const quarterlySalaryColumns: ColumnsType<ThongKeLuongTheoQuy> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: 13 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
      render: (val: string) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
            {getInitials(val)}
          </Avatar>
          <span style={{ fontWeight: 600, color: '#111827' }}>{val}</span>
        </Space>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'tenPhongBan',
      key: 'tenPhongBan',
      render: (val: string) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: 'Lương Quý 1',
      dataIndex: 'luongQuy1',
      key: 'luongQuy1',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 500, color: val > 0 ? '#1f2937' : '#9ca3af' }}>
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Lương Quý 2',
      dataIndex: 'luongQuy2',
      key: 'luongQuy2',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 500, color: val > 0 ? '#1f2937' : '#9ca3af' }}>
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Lương Quý 3',
      dataIndex: 'luongQuy3',
      key: 'luongQuy3',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 500, color: val > 0 ? '#1f2937' : '#9ca3af' }}>
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Lương Quý 4',
      dataIndex: 'luongQuy4',
      key: 'luongQuy4',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 500, color: val > 0 ? '#1f2937' : '#9ca3af' }}>
          {formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Tổng thu nhập năm',
      dataIndex: 'tongThuNhapNam',
      key: 'tongThuNhapNam',
      align: 'right',
      render: (val: number) => (
        <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>
          {formatVND(val)}
        </span>
      ),
    },
  ];

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 2px 6px rgba(37,99,235,0.15)',
              }}
            >
              <BankOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: 22, lineHeight: 1.2 }}>
                BÁO CÁO & THỐNG KÊ DOANH NGHIỆP
              </h2>
              <span style={{ color: '#64748b', fontSize: 13 }}>
                Hệ thống quản trị nhân sự, biến động lao động và tài chính tiền lương tổng thể
              </span>
            </div>
          </div>
        </Col>
        <Col xs={24} md={8} style={{ textAlign: 'right' }}>
          <Space>
            <CalendarOutlined style={{ color: '#2563eb', fontSize: 16 }} />
            <span style={{ fontWeight: 600, color: '#475569' }}>Kỳ báo cáo:</span>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
              allowClear={false}
              style={{ borderRadius: 8 }}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={canViewPayroll ? 8 : 12}>
          <Card
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Nhân sự đang công tác</span>}
              value={data?.tongSoNhanVien || 0}
              prefix={<TeamOutlined style={{ color: '#2563eb', marginRight: 6 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 800, fontSize: 28 }}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              Nhân sự chính thức đang làm việc tại các phòng ban
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={canViewPayroll ? 8 : 12}>
          <Card
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
            bodyStyle={{ padding: 20 }}
          >
            <Statistic
              title={<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Tuyển mới trong tháng</span>}
              value={data?.nhanVienMoiTrongThang || 0}
              prefix={<UserAddOutlined style={{ color: '#10b981', marginRight: 6 }} />}
              valueStyle={{ color: '#10b981', fontWeight: 800, fontSize: 28 }}
            />
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 500 }}>
              Gia nhập mới trong kỳ {selectedMonth.format('MM/YYYY')}
            </div>
          </Card>
        </Col>
        {canViewPayroll && (
          <Col xs={24} sm={24} md={8}>
            <Card
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Tổng quỹ lương tháng này</span>}
                value={formatVND(data?.tongQuyLuongThang)}
                prefix={<DollarOutlined style={{ color: '#7c3aed', marginRight: 6 }} />}
                valueStyle={{ color: '#7c3aed', fontWeight: 800, fontSize: 24 }}
              />
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                Đã chi trả: <strong style={{ color: '#059669' }}>{formatVND(data?.luongDaChiTraThang)}</strong> ({percentPaid}%)
              </div>
            </Card>
          </Col>
        )}
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ReadOutlined style={{ fontSize: 17 }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      Thống kê theo Trình độ học vấn
                    </span>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                      Phân bổ bằng cấp chuyên môn nhân sự
                    </div>
                  </div>
                </div>
                <Tag color="blue" style={{ borderRadius: 12, fontWeight: 600 }}>
                  {totalActive} nhân sự
                </Tag>
              </div>
            }
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              height: '100%',
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(data?.nhanVienTheoTrinhDo || []).map((item, index) => {
                const pct = Math.round((item.soLuong / totalActive) * 100);
                const color = eduColors[index % eduColors.length];
                return (
                  <div key={item.trinhDo}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                        {item.trinhDo}
                      </span>
                      <span style={{ color: '#475569' }}>
                        <strong style={{ color: '#0f172a' }}>{item.soLuong}</strong> người{' '}
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>({pct}%)</span>
                      </span>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={color}
                      size={['100%', 8]}
                      style={{ margin: 0 }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 24,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              <span>Trình độ chiếm tỷ trọng lớn nhất:</span>
              <strong style={{ color: '#0f172a' }}>
                {data?.nhanVienTheoTrinhDo?.[0]?.trinhDo || 'Đang cập nhật'}
              </strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: '#fffbeb',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrophyOutlined style={{ fontSize: 17 }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                      Thống kê theo Thâm niên công tác
                    </span>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                      Thời gian gắn bó và cống hiến tại công ty
                    </div>
                  </div>
                </div>
                <Tag color="gold" style={{ borderRadius: 12, fontWeight: 600 }}>
                  Gắn bó dài hạn
                </Tag>
              </div>
            }
            style={{
              borderRadius: 14,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              height: '100%',
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(data?.nhanVienTheoThamNien || []).map((item, index) => {
                const pct = Math.round((item.soLuong / totalActive) * 100);
                const color = tenureColors[index % tenureColors.length];
                return (
                  <div key={item.nhomThamNien}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                        {item.nhomThamNien}
                      </span>
                      <span style={{ color: '#475569' }}>
                        <strong style={{ color: '#0f172a' }}>{item.soLuong}</strong> người{' '}
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>({pct}%)</span>
                      </span>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={color}
                      size={['100%', 8]}
                      style={{ margin: 0 }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 24,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              <span>Tỷ lệ nhân sự làm việc trên 1 năm:</span>
              <strong style={{ color: '#059669' }}>
                {Math.round(
                  (((data?.nhanVienTheoThamNien || [])
                    .filter((t) => t.nhomThamNien !== 'Dưới 1 năm')
                    .reduce((acc, cur) => acc + cur.soLuong, 0)) /
                    totalActive) *
                    100
                )}
                %
              </strong>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              TÌNH HÌNH BIẾN ĐỘNG LAO ĐỘNG TRONG THÁNG
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              Danh sách chi tiết nhân sự theo 3 trạng thái: Đang làm việc, Nghỉ phép trong tháng, Đã thôi việc
            </div>
          </div>
        }
        extra={
          <Input
            placeholder="Tìm theo tên, phòng ban, chức vụ..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            style={{ width: 300, borderRadius: 8 }}
            allowClear
          />
        }
        style={{
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Tabs items={tabItems} defaultActiveKey="dangLamViec" />
      </Card>

      {canViewPayroll && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <DollarOutlined />
              </div>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  THỐNG KÊ MỨC LƯƠNG THEO QUÝ CỦA TỪNG NGƯỜI (NĂM {selectedMonth.format('YYYY')})
                </span>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                  Chi tiết thu nhập thực tế qua các quý và dự kiến tổng thu nhập cả năm
                </div>
              </div>
            </div>
          }
          extra={
            <Space>
              <Input
                placeholder="Tìm nhân sự, phòng ban..."
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                value={salarySearch}
                onChange={(e) => setSalarySearch(e.target.value)}
                style={{ width: 240, borderRadius: 8 }}
                allowClear
              />
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={handleExportQuarterlySalary}
                style={{ borderRadius: 8, backgroundColor: '#059669', borderColor: '#059669' }}
              >
                Xuất Excel
              </Button>
            </Space>
          }
          style={{
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Table<ThongKeLuongTheoQuy>
            dataSource={filteredLuongTheoQuy}
            columns={quarterlySalaryColumns}
            rowKey="maNhanVien"
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total) => `Tổng số ${total} nhân sự`,
            }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <span style={{ textTransform: 'uppercase', fontSize: 12, color: '#0f172a', letterSpacing: 0.5 }}>
                      TỔNG QUỸ LƯƠNG TOÀN DOANH NGHIỆP:
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <span style={{ color: '#0f172a' }}>{formatVND(salaryTotals.q1)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <span style={{ color: '#0f172a' }}>{formatVND(salaryTotals.q2)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <span style={{ color: '#0f172a' }}>{formatVND(salaryTotals.q3)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <span style={{ color: '#0f172a' }}>{formatVND(salaryTotals.q4)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <span style={{ color: '#059669', fontSize: 15, fontWeight: 800 }}>
                      {formatVND(salaryTotals.totalYear)}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            scroll={{ x: 1000 }}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
