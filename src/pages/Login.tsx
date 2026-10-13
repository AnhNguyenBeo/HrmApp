import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { LoginRequest } from '../types';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: LoginRequest) => {
    try {
      setLoading(true);
      const res = await authApi.login(values);
      const data = res.data;

      localStorage.setItem('token', data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          token: data.token,
          tenDangNhap: data.tenDangNhap,
          maTaiKhoan: data.maTaiKhoan,
          maNhanVien: data.maNhanVien,
          hoTen: data.hoTen,
          vaiTro: data.vaiTro,
        })
      );

      message.success('Đăng nhập thành công! Xin chào ' + data.hoTen);

      if (data.vaiTro === 'Quản trị viên' || data.vaiTro === 'Quản lý') {
        navigate('/dashboard');
      } else {
        navigate('/profile');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4, color: '#1890ff' }}>
            HRM SYSTEM
          </Title>
          <Text type="secondary">Hệ Thống Quản Trị Nhân Sự Doanh Nghiệp</Text>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Tên đăng nhập"
            name="tenDangNhap"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Ví dụ: an.nguyen" size="large" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="matKhau"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              ĐĂNG NHẬP
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};