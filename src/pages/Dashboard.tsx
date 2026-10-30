import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Table, Tag, Tabs, Badge, Progress, DatePicker, Space, Input } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  DollarOutlined,
  SolutionOutlined,
  UserDeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PieChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { thongKeApi } from '../api/thongKeApi';
import { DashboardData } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [tabSearch, setTabSearch] = useState('');

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

  if (loading && !data) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

  const totalActive = data?.tongSoNhanVien || 1;

  const percentPaid = (data?.tongQuyLuongThang || 0) > 0
    ? Math.round(((data?.luongDaChiTraThang || 0) / (data?.tongQuyLuongThang || 1)) * 100)
    : 0;

  const searchKw = tabSearch.trim().toLowerCase();

  const filteredDangLam = (data?.tinhHinhNhanSu?.dangLamViec || []).filter((nv) => {
    if (!searchKw) return true;
    return (
      (nv.hoTen || '').toLowerCase().includes(searchKw) ||
      (nv.tenPhongBan || '').toLowerCase().includes(searchKw) ||
      (nv.tenChucVu || '').toLowerCase().includes(searchKw)
    );
  });

  const filteredNghiPhep = (data?.tinhHinhNhanSu?.nghiPhep || []).filter((d) => {
    if (!searchKw) return true;
    return (
      (d.hoTen || '').toLowerCase().includes(searchKw) ||
      (d.tenPhongBan || '').toLowerCase().includes(searchKw) ||
      (d.loaiDon || '').toLowerCase().includes(searchKw)
    );
  });

  const filteredDaNghi = (data?.tinhHinhNhanSu?.daNghiViec || []).filter((nv) => {
    if (!searchKw) return true;
    return (
      (nv.hoTen || '').toLowerCase().includes(searchKw) ||
      (nv.tenPhongBan || '').toLowerCase().includes(searchKw) ||
      (nv.tenChucVu || '').toLowerCase().includes(searchKw)
    );
  });

  const tabItems = [
    {
      key: 'dangLamViec',
      label: (
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          Đang làm việc <Badge count={data?.tinhHinhNhanSu?.dangLamViec?.length || 0} style={{ backgroundColor: '#52c41a' }} />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredDangLam}
          columns={[
            { title: 'Họ và tên', dataIndex: 'hoTen', key: 'hoTen', render: (val) => <strong>{val}</strong> },
            { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', render: (val) => <Tag color="blue">{val}</Tag> },
            { title: 'Chức danh', dataIndex: 'tenChucVu', key: 'tenChucVu' },
            { title: 'Ngày vào làm', dataIndex: 'ngayVaoLam', key: 'ngayVaoLam' },
            { title: 'Trạng thái', key: 'status', render: () => <Tag color="green">Đang công tác</Tag> },
          ]}
          rowKey="maNhanVien"
          pagination={{ pageSize: 8 }}
          size="small"
        />
      ),
    },
    {
      key: 'nghiPhep',
      label: (
        <span>
          <SolutionOutlined style={{ color: '#faad14' }} />
          Nghỉ phép trong tháng <Badge count={data?.tinhHinhNhanSu?.nghiPhep?.length || 0} style={{ backgroundColor: '#faad14' }} />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredNghiPhep}
          columns={[
            { title: 'Họ và tên', dataIndex: 'hoTen', key: 'hoTen', render: (val) => <strong>{val}</strong> },
            { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', render: (val) => <Tag color="blue">{val}</Tag> },
            { title: 'Loại nghỉ', dataIndex: 'loaiDon', key: 'loaiDon', render: (val) => <Tag color="orange">{val}</Tag> },
            { title: 'Số ngày nghỉ', dataIndex: 'soNgayNghi', key: 'soNgayNghi', render: (val) => <strong>{val} ngày</strong> },
            { title: 'Từ ngày', dataIndex: 'ngayBatDau', key: 'ngayBatDau' },
            { title: 'Đến ngày', dataIndex: 'ngayKetThuc', key: 'ngayKetThuc' },
          ]}
          rowKey={(r) => r.maNhanVien + r.ngayBatDau}
          pagination={{ pageSize: 8 }}
          size="small"
        />
      ),
    },
    {
      key: 'daNghiViec',
      label: (
        <span>
          <UserDeleteOutlined style={{ color: '#f5222d' }} />
          Đã thôi việc <Badge count={data?.tinhHinhNhanSu?.daNghiViec?.length || 0} style={{ backgroundColor: '#f5222d' }} />
        </span>
      ),
      children: (
        <Table
          dataSource={filteredDaNghi}
          columns={[
            { title: 'Họ và tên', dataIndex: 'hoTen', key: 'hoTen', render: (val) => <strong>{val}</strong> },
            { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', render: (val) => <Tag color="default">{val}</Tag> },
            { title: 'Chức danh', dataIndex: 'tenChucVu', key: 'tenChucVu' },
            { title: 'Ngày thôi việc', dataIndex: 'ngayNghiViec', key: 'ngayNghiViec', render: (val) => val || 'Đã ghi nhận' },
            { title: 'Trạng thái', key: 'status', render: () => <Tag color="red">Đã thôi việc</Tag> },
          ]}
          rowKey="maNhanVien"
          pagination={{ pageSize: 8 }}
          size="small"
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#1f1f1f', fontSize: 22 }}>
            BÁO CÁO & THỐNG KÊ DOANH NGHIỆP
          </h2>
          <span style={{ color: '#8c8c8c', fontSize: 14 }}>
            Hệ thống quản trị nhân sự, biến động lao động và tài chính tiền lương tổng thể
          </span>
        </Col>
        <Col xs={24} md={8} style={{ textAlign: 'right' }}>
          <Space>
            <span style={{ fontWeight: 500 }}>Kỳ báo cáo:</span>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
              allowClear={false}
            />
          </Space>
        </Col>
      </Row>

      {canViewPayroll && (
      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <DollarOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            NGÂN SÁCH & CHI TRẢ LƯƠNG KỲ {selectedMonth.format('MM/YYYY')}
          </span>
        }
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ padding: '14px 16px', background: '#f0f5ff', borderRadius: 8, borderLeft: '4px solid #1890ff' }}>
              <div style={{ color: '#595959', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Tổng quỹ lương tháng</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }}>
                {(data?.tongQuyLuongThang || 0).toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                Tổng nghĩa vụ lương phải trả
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ padding: '14px 16px', background: '#f6ffed', borderRadius: 8, borderLeft: '4px solid #52c41a' }}>
              <div style={{ color: '#595959', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Đã giải ngân chi trả</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>
                {(data?.luongDaChiTraThang || 0).toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                Đã thanh toán cho <strong>{data?.soBangLuongDaChiTra || 0}</strong> nhân sự
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ padding: '14px 16px', background: '#fffbe6', borderRadius: 8, borderLeft: '4px solid #faad14' }}>
              <div style={{ color: '#595959', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Còn lại chờ duyệt chi</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#faad14' }}>
                {(data?.luongChoChiTraThang || 0).toLocaleString('vi-VN')} đ
              </div>
              <div style={{ fontSize: 12, color: '#faad14', marginTop: 4 }}>
                Chờ duyệt chi: <strong>{data?.soBangLuongChoChiTra || 0}</strong> nhân sự
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ padding: '14px 16px', background: '#f9f0ff', borderRadius: 8, borderLeft: '4px solid #722ed1' }}>
              <div style={{ color: '#595959', fontSize: 13, marginBottom: 4, fontWeight: 500 }}>Tiến độ giải ngân</div>
              <Progress
                percent={percentPaid}
                status={percentPaid === 100 ? 'success' : 'active'}
                strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
              />
              <div style={{ fontSize: 12, color: '#722ed1', marginTop: 4 }}>
                {percentPaid === 100 ? 'Đã hoàn tất chi trả 100%' : `Còn lại ${100 - percentPaid}% cần thanh toán`}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={12}>
          <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontSize: 14, fontWeight: 500, color: '#595959' }}>Nhân sự đang công tác</span>}
              value={data?.tongSoNhanVien || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: 26 }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              Nhân sự chính thức đang làm việc
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Card style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontSize: 14, fontWeight: 500, color: '#595959' }}>Tuyển mới trong tháng</span>}
              value={data?.nhanVienMoiTrongThang || 0}
              prefix={<UserAddOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700, fontSize: 26 }}
            />
            <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
              Nhân viên mới gia nhập
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={canViewPayroll ? 6 : 8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <PieChartOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                Theo Phòng ban
              </span>
            }
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            {(data?.nhanVienTheoPhongBan || []).map((item) => {
              const pct = Math.round((item.soLuongNhanVien / totalActive) * 100);
              return (
                <div key={item.tenPhongBan} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: '#262626' }}>{item.tenPhongBan}</span>
                    <span>
                      <strong>{item.soLuongNhanVien}</strong> <span style={{ color: '#8c8c8c', fontSize: 12 }}>({pct}%)</span>
                    </span>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor="#1890ff" size="small" />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={canViewPayroll ? 6 : 8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <PieChartOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                Theo Trình độ học vấn
              </span>
            }
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            {(data?.nhanVienTheoTrinhDo || []).map((item) => {
              const pct = Math.round((item.soLuong / totalActive) * 100);
              return (
                <div key={item.trinhDo} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: '#262626' }}>{item.trinhDo}</span>
                    <span>
                      <strong>{item.soLuong}</strong> <span style={{ color: '#8c8c8c', fontSize: 12 }}>({pct}%)</span>
                    </span>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor="#52c41a" size="small" />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={canViewPayroll ? 6 : 8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <PieChartOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                Theo Thâm niên công tác
              </span>
            }
            style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            {(data?.nhanVienTheoThamNien || []).map((item) => {
              const pct = Math.round((item.soLuong / totalActive) * 100);
              return (
                <div key={item.nhomThamNien} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: '#262626' }}>{item.nhomThamNien}</span>
                    <span>
                      <strong>{item.soLuong}</strong> <span style={{ color: '#8c8c8c', fontSize: 12 }}>({pct}%)</span>
                    </span>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor="#722ed1" size="small" />
                </div>
              );
            })}
          </Card>
        </Col>
        {canViewPayroll && (
          <Col xs={24} sm={12} md={6}>
            <Card
              title={
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  <PieChartOutlined style={{ marginRight: 6, color: '#fa8c16' }} />
                  Theo Dải mức lương
                </span>
              }
              style={{ borderRadius: 10, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            >
              {(data?.nhanVienTheoMucLuong || []).map((item) => {
                const pct = Math.round((item.soLuong / totalActive) * 100);
                return (
                  <div key={item.mucLuong} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: '#262626' }}>{item.mucLuong}</span>
                      <span>
                        <strong>{item.soLuong}</strong> <span style={{ color: '#8c8c8c', fontSize: 12 }}>({pct}%)</span>
                      </span>
                    </div>
                    <Progress percent={pct} showInfo={false} strokeColor="#fa8c16" size="small" />
                  </div>
                );
              })}
            </Card>
          </Col>
        )}
      </Row>

      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            TÌNH HÌNH BIẾN ĐỘNG LAO ĐỘNG TRONG THÁNG (ĐANG LÀM, NGHỈ PHÉP, NGHỈ VIỆC)
          </span>
        }
        extra={
          <Input
            placeholder="Tìm theo tên, phòng ban, chức vụ..."
            prefix={<SearchOutlined />}
            value={tabSearch}
            onChange={(e) => setTabSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
        }
        style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default DashboardPage;
