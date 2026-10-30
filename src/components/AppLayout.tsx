import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Space, message, Dropdown, Tag } from 'antd';
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
  KeyOutlined,
  SolutionOutlined,
  CrownOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { chamCongApi } from '../api/chamCongApi';
import { nhanVienApi } from '../api/nhanVienApi';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [departmentName, setDepartmentName] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.vaiTro || '';

  useEffect(() => {
    if (user?.tenPhongBan) {
      setDepartmentName(user.tenPhongBan);
    } else if (user?.maNhanVien) {
      nhanVienApi.getById(user.maNhanVien).then((res) => {
        if (res.data?.tenPhongBan) {
          setDepartmentName(res.data.tenPhongBan);
          const updated = { ...user, tenPhongBan: res.data.tenPhongBan };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }).catch(() => {});
    }
  }, [userStr]);

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

  const isAccounting = departmentName.toLowerCase().includes('kế toán');
  const isHR = departmentName.toLowerCase().includes('nhân sự');

  let menuItems: any[] = [];

  if (role === 'Quản trị viên') {
    menuItems = [
      { key: '/tai-khoan', icon: <KeyOutlined />, label: 'Quản lý tài khoản & Phân quyền' },
      { key: '/nhat-ky', icon: <HistoryOutlined />, label: 'Nhật ký hoạt động' },
      { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ quản trị viên' },
    ];
  } else if (role === 'Chủ doanh nghiệp') {
    menuItems = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Báo cáo & Thống kê' },
      { key: '/nhan-vien', icon: <TeamOutlined />, label: 'Quản lý nhân sự' },
      { key: '/don-tu/quan-ly', icon: <SolutionOutlined />, label: 'Phê duyệt đơn từ toàn cty' },
      { key: '/cham-cong-quan-ly', icon: <ClockCircleOutlined />, label: 'Theo dõi chấm công' },
      { key: '/tinh-luong', icon: <DollarOutlined />, label: 'Tính & Quản lý lương' },
      { key: '/nhat-ky', icon: <HistoryOutlined />, label: 'Nhật ký hoạt động' },
      { type: 'divider' as const },
      { key: '/profile', icon: <CrownOutlined />, label: 'Hồ sơ Chủ doanh nghiệp' },
    ];
  } else if (role === 'Quản lý') {
    menuItems = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Báo cáo & Thống kê' },
      { key: '/nhan-vien', icon: <TeamOutlined />, label: isHR ? 'Quản lý nhân sự' : 'Nhân sự phòng ban' },
      { key: '/don-tu/quan-ly', icon: <SolutionOutlined />, label: 'Duyệt đơn từ nhân viên' },
      { key: '/cham-cong-quan-ly', icon: <ClockCircleOutlined />, label: 'Theo dõi chấm công' },
      ...(isAccounting ? [{ key: '/tinh-luong', icon: <DollarOutlined />, label: 'Tính & Quản lý lương' }] : []),
      { type: 'divider' as const },
      { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ của tôi' },
      { key: '/cham-cong', icon: <ClockCircleOutlined />, label: 'Chấm công cá nhân' },
      { key: '/don-tu', icon: <FileTextOutlined />, label: 'Đơn từ của tôi' },
      { key: '/bang-luong', icon: <DollarOutlined />, label: 'Bảng lương của tôi' },
    ];
  } else {
    menuItems = [
      ...(isHR ? [{ key: '/nhan-vien', icon: <TeamOutlined />, label: 'Quản lý nhân sự' }] : []),
      ...(isAccounting ? [{ key: '/tinh-luong', icon: <DollarOutlined />, label: 'Tính & Quản lý lương' }] : []),
      { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ của tôi' },
      { key: '/cham-cong', icon: <ClockCircleOutlined />, label: 'Chấm công cá nhân' },
      { key: '/don-tu', icon: <FileTextOutlined />, label: 'Đơn từ của tôi' },
      { key: '/bang-luong', icon: <DollarOutlined />, label: 'Bảng lương của tôi' },
    ];
  }

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

  const getRoleTagColor = (r: string) => {
    switch (r) {
      case 'Quản trị viên': return 'magenta';
      case 'Chủ doanh nghiệp': return 'gold';
      case 'Quản lý': return 'blue';
      default: return 'green';
    }
  };

  const showQuickCheckIn = role === 'Nhân viên' || role === 'Quản lý';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={260}>
        <div
          style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold', background: '#001529', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
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
          <Space size="middle">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              Xin chào, <strong>{user?.hoTen || 'Người dùng'}</strong>{' '}
              <Tag color={getRoleTagColor(role)}>
                {role}
              </Tag>
              {departmentName && (
                <Tag color="cyan">{departmentName}</Tag>
              )}
            </span>
          </Space>
          <Space size="middle">
            {showQuickCheckIn && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={checkInLoading}
                onClick={handleQuickCheckIn}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Chấm công nhanh
              </Button>
            )}
            <Dropdown menu={userDropdownItems} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: role === 'Chủ doanh nghiệp' ? '#faad14' : '#1890ff' }} />
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
