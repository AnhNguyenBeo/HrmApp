import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Input, message, Spin, Tag } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import { nhanVienApi } from '../api/nhanVienApi';
import { NhanVien } from '../types';

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<NhanVien | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      setSubmitting(true);
      await nhanVienApi.updateMyProfile(values);
      message.success('Cập nhật thông tin cá nhân thành công!');
      setIsModalOpen(false);
      fetchProfile();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Cập nhật thất bại.';
      if (errMsg.toLowerCase().includes('số điện thoại') || errMsg.toLowerCase().includes('sđt')) {
        form.setFields([{ name: 'soDienThoai', errors: [errMsg] }]);
      }
      message.error(errMsg);
    } finally {
      setSubmitting(false);
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
          <Descriptions.Item label="Họ và tên" span={2}>{profile?.hoTen}</Descriptions.Item>
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
          <Descriptions.Item label="Trạng thái làm việc" span={2}>
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
          <Form.Item
            name="soDienThoai"
            label="Số điện thoại"
            validateTrigger={['onChange', 'onBlur']}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0!' },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  const trimmed = value.trim();
                  if (profile?.soDienThoai && trimmed === profile.soDienThoai.trim()) {
                    return Promise.resolve();
                  }
                  if (/^0\d{9}$/.test(trimmed)) {
                    try {
                      const res = await nhanVienApi.checkPhone(trimmed, profile?.maNhanVien);
                      if (res.data?.exists) {
                        return Promise.reject(new Error('Số điện thoại này đã tồn tại ở nhân sự khác, không được trùng lặp!'));
                      }
                    } catch {
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input placeholder="090..." maxLength={10} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Email không đúng định dạng!' }
            ]}
          >
            <Input type="email" placeholder="example@company.com" />
          </Form.Item>
          <Form.Item name="diaChi" label="Địa chỉ">
            <Input.TextArea rows={3} placeholder="Địa chỉ thường trú / tạm trú" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};