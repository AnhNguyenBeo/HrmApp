import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, message, Spin, Tag } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { nhanVienApi } from '../api/nhanVienApi';
import { NhanVien } from '../types';

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<NhanVien | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchProfile = async () => {
    if (!user?.maNhanVien) return;
    try {
      setLoading(true);
      const res = await nhanVienApi.getById(user.maNhanVien);
      setProfile(res.data);
    } catch {
      message.error('Không thể tải thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (values: any) => {
    try {
      await nhanVienApi.updateMyProfile(values);
      message.success('Cập nhật thông tin cá nhân thành công!');
      setIsModalOpen(false);
      fetchProfile();
    } catch {
      message.error('Cập nhật thất bại.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

  return (
    <div>
      <Card
        title={
          <span>
            <UserOutlined style={{ marginRight: 8 }} />
            HỒ SƠ CÁ NHÂN
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                soDienThoai: profile?.soDienThoai,
                email: profile?.email,
                diaChi: profile?.diaChi,
              });
              setIsModalOpen(true);
            }}
          >
            Chỉnh sửa thông tin
          </Button>
        }
      >
        <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Họ và tên">{profile?.hoTen}</Descriptions.Item>
          <Descriptions.Item label="Mã nhân viên">{profile?.maNhanVien}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">{profile?.ngaySinh}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">{profile?.gioiTinh}</Descriptions.Item>
          <Descriptions.Item label="Số CCCD">{profile?.cccd}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile?.email}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{profile?.soDienThoai}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{profile?.diaChi}</Descriptions.Item>
          <Descriptions.Item label="Phòng ban">{profile?.tenPhongBan || 'Chưa cập nhật'}</Descriptions.Item>
          <Descriptions.Item label="Chức vụ">{profile?.tenChucVu || 'Chưa cập nhật'}</Descriptions.Item>
          <Descriptions.Item label="Trình độ học vấn">{profile?.trinhDoHocVan}</Descriptions.Item>
          <Descriptions.Item label="Ngày vào làm">{profile?.ngayVaoLam}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái làm việc">
            <Tag color={profile?.trangThaiLamViec === 'Đang làm việc' ? 'green' : 'red'}>
              {profile?.trangThaiLamViec}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="Chỉnh sửa thông tin liên hệ"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="soDienThoai" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="diaChi" label="Địa chỉ">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};