import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Space, message, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { chamCongApi } from '../api/chamCongApi';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.vaiTro || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất thành công');
    navigate('/login');
  };

  const handleQuickCheckIn = async () => {
    try {
      setCheckInLoading(true);
      const today = dayjs().format('YYYY-MM-DD');
      const res = await chamCongApi.checkInOut(today);
      message.success(res.data?.message || 'Ghi nhận chấm công thành công!');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Chấm công thất bại');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Build menu based on role
  const menuItems = [
    // All roles
    { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
    { key: '/cham-cong', icon: <ClockCircleOutlined />, label: 'Chấm công cá nhân' },
    { key: '/don-tu', icon: <FileTextOutlined />, label: 'Đơn từ của tôi' },
    { key: '/bang-luong', icon: <DollarOutlined />, label: 'Bảng lương của tôi' },

    // Quản lý / Quản trị viên
    ...(role === 'Quản trị viên' || role === 'Quản lý'
      ? [
          { type: 'divider' as const },
          { key: '/dashboard', icon: <DashboardOutlined />, label: 'Báo cáo & Thống kê' },
          { key: '/nhan-vien', icon: <TeamOutlined />, label: 'Quản lý nhân sự' },
          { key: '/don-tu/quan-ly', icon: <FileTextOutlined />, label: 'Duyệt đơn từ' },
        ]
      : []),

    // Kế toán
    ...(role === 'Kế toán'
      ? [
          { type: 'divider' as const },
          { key: '/tinh-luong', icon: <DollarOutlined />, label: 'Tính & Chốt lương' },
        ]
      : []),
  ];

  const userDropdownItems = {
    items: [
      {
        key: 'profile',
        label: 'Thông tin cá nhân',
        icon: <UserOutlined />,
        onClick: () => navigate('/profile'),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        label: 'Đăng xuất',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={240}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold', background: '#001529' }}>
          {collapsed ? 'HRM' : 'QUẢN TRỊ NHÂN SỰ'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Space orientation="horizontal" size="middle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              Chào mừng, <strong>{user?.hoTen || 'Người dùng'}</strong> ({role})
            </span>
          </Space>
          <Space orientation="horizontal" size="middle">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={checkInLoading}
              onClick={handleQuickCheckIn}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Chấm công nhanh
            </Button>
            <Dropdown menu={userDropdownItems} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span>{user?.hoTen}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};