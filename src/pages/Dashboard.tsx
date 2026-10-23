import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Table, Tag, Tabs, Badge } from 'antd';
import { TeamOutlined, UserAddOutlined, FileTextOutlined, DollarOutlined, SolutionOutlined, UserDeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { thongKeApi } from '../api/thongKeApi';
import { DashboardData } from '../types';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await thongKeApi.getDashboard();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

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
          dataSource={data?.tinhHinhNhanSu?.dangLamViec || []}
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
          dataSource={data?.tinhHinhNhanSu?.nghiPhep || []}
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
          dataSource={data?.tinhHinhNhanSu?.daNghiViec || []}
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
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng nhân sự đang làm"
              value={data?.tongSoNhanVien || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Nhân viên mới tháng này"
              value={data?.nhanVienMoiTrongThang || 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn từ chờ duyệt"
              value={data?.donTuChoDuyet || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng quỹ lương tháng"
              value={data?.tongQuyLuongThang || 0}
              prefix={<DollarOutlined />}
              suffix="đ"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card title="Nhân sự theo Phòng ban">
            <Table
              dataSource={data?.nhanVienTheoPhongBan || []}
              columns={[
                { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan' },
                { title: 'Số lượng', dataIndex: 'soLuongNhanVien', key: 'soLuongNhanVien', render: (val) => <Tag color="blue">{val}</Tag> },
              ]}
              rowKey="tenPhongBan"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Nhân sự theo Trình độ">
            <Table
              dataSource={data?.nhanVienTheoTrinhDo || []}
              columns={[
                { title: 'Trình độ', dataIndex: 'trinhDo', key: 'trinhDo' },
                { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', render: (val) => <Tag color="green">{val}</Tag> },
              ]}
              rowKey="trinhDo"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Nhân sự theo Thâm niên">
            <Table
              dataSource={data?.nhanVienTheoThamNien || []}
              columns={[
                { title: 'Nhóm thâm niên', dataIndex: 'nhomThamNien', key: 'nhomThamNien' },
                { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', render: (val) => <Tag color="purple">{val}</Tag> },
              ]}
              rowKey="nhomThamNien"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Nhân sự theo Mức lương">
            <Table
              dataSource={data?.nhanVienTheoMucLuong || []}
              columns={[
                { title: 'Dải mức lương', dataIndex: 'mucLuong', key: 'mucLuong' },
                { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', render: (val) => <Tag color="gold">{val}</Tag> },
              ]}
              rowKey="mucLuong"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card title="BÁO CÁO TÌNH HÌNH NHÂN SỰ THEO THÁNG (ĐANG LÀM, NGHỈ PHÉP, NGHỈ VIỆC)">
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};