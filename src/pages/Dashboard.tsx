import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Table, Tag } from 'antd';
import { TeamOutlined, UserAddOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
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

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Tổng nhân sự"
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

      <Row gutter={16}>
        <Col span={8}>
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
        <Col span={8}>
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
        <Col span={8}>
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
      </Row>
    </div>
  );
};