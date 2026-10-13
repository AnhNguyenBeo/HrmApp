import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm } from 'antd';
import { UserAddOutlined, KeyOutlined, LockOutlined, UnlockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { taiKhoanApi } from '../api/taiKhoanApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, VaiTro } from '../api/danhMucApi';
import { TaiKhoan, NhanVien } from '../types';

export const TaiKhoanPage: React.FC = () => {
  const [data, setData] = useState<TaiKhoan[]>([]);
  const [nhanViens, setNhanViens] = useState<NhanVien[]>([]);
  const [vaiTros, setVaiTros] = useState<VaiTro[]>([]);
  const [loading, setLoading] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<TaiKhoan | null>(null);

  const [createForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, nvRes, vtRes] = await Promise.all([
        taiKhoanApi.getAll(),
        nhanVienApi.getAll({ pageSize: 100 }),
        danhMucApi.getVaiTros(),
      ]);
      setData(accRes.data);
      setNhanViens(nvRes.data.items || []);
      setVaiTros(vtRes.data);
    } catch {
      message.error('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await taiKhoanApi.create(values);
      message.success('Tạo tài khoản thành công!');
      setCreateModal(false);
      createForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Tạo tài khoản thất bại.');
    }
  };

  const handleChangeRole = async (values: any) => {
    if (!selectedAcc) return;
    try {
      await taiKhoanApi.changeRole(selectedAcc.maTaiKhoan, values.maVaiTro);
      message.success('Cập nhật phân quyền thành công!');
      setRoleModal(false);
      roleForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Phân quyền thất bại.');
    }
  };

  const handleToggleLock = async (id: string) => {
    try {
      await taiKhoanApi.lock(id);
      message.success('Thay đổi trạng thái tài khoản thành công!');
      fetchData();
    } catch {
      message.error('Thao tác thất bại.');
    }
  };

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'tenDangNhap', key: 'tenDangNhap', render: (val: string) => <strong>{val}</strong> },
    { title: 'Chủ sở hữu (Nhân viên)', dataIndex: 'tenNhanVien', key: 'tenNhanVien', render: (val: string) => val || 'Chưa gán' },
    {
      title: 'Vai trò (Quyền)',
      dataIndex: 'tenVaiTro',
      key: 'tenVaiTro',
      render: (val: string) => {
        let color = 'default';
        if (val === 'Quản trị viên') color = 'magenta';
        else if (val === 'Quản lý') color = 'blue';
        else if (val === 'Kế toán') color = 'gold';
        else color = 'green';
        return <Tag color={color}>{val || 'Chưa phân quyền'}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      render: (val: string) => (
        <Tag color={val === 'Hoạt động' ? 'green' : 'red'}>
          {val}
        </Tag>
      ),
    },
    { title: 'Ngày tạo', dataIndex: 'ngayTao', key: 'ngayTao' },
    {
      title: 'Thao tác (Admin)',
      key: 'action',
      render: (_: any, record: TaiKhoan) => (
        <Space>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => {
              setSelectedAcc(record);
              const vt = vaiTros.find((v) => v.tenVaiTro === record.tenVaiTro);
              roleForm.setFieldsValue({ maVaiTro: vt?.maVaiTro });
              setRoleModal(true);
            }}
          >
            Phân quyền
          </Button>

          <Popconfirm
            title={record.trangThai === 'Hoạt động' ? 'Bạn có muốn khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
            onConfirm={() => handleToggleLock(record.maTaiKhoan)}
          >
            <Button
              size="small"
              danger={record.trangThai === 'Hoạt động'}
              icon={record.trangThai === 'Hoạt động' ? <LockOutlined /> : <UnlockOutlined />}
            >
              {record.trangThai === 'Hoạt động' ? 'Khóa' : 'Mở khóa'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <KeyOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN HỆ THỐNG (ADMIN)
          </span>
        }
        extra={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateModal(true)}>
            Cấp tài khoản mới
          </Button>
        }
      >
        <Table dataSource={data} columns={columns} rowKey="maTaiKhoan" loading={loading} />
      </Card>

      <Modal title="Cấp tài khoản đăng nhập mới" open={createModal} onCancel={() => setCreateModal(false)} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="maNhanVien" label="Chọn nhân sự" rules={[{ required: true, message: 'Vui lòng chọn nhân sự!' }]}>
            <Select showSearch placeholder="Chọn nhân sự cần cấp tài khoản" optionFilterProp="label">
              {nhanViens.map((nv) => (
                <Select.Option key={nv.maNhanVien} value={nv.maNhanVien} label={nv.hoTen}>
                  {nv.hoTen} ({nv.email || nv.soDienThoai})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tenDangNhap" label="Tên đăng nhập" rules={[{ required: true, message: 'Nhập tên đăng nhập!' }]}>
            <Input placeholder="ví dụ: nam.tran" />
          </Form.Item>
          <Form.Item name="matKhau" label="Mật khẩu khởi tạo" rules={[{ required: true, message: 'Nhập mật khẩu!' }]}>
            <Input.Password placeholder="Mật khẩu mặc định" />
          </Form.Item>
          <Form.Item name="maVaiTro" label="Vai trò / Phân quyền" rules={[{ required: true, message: 'Chọn vai trò!' }]}>
            <Select placeholder="Chọn vai trò">
              {vaiTros.map((vt) => (
                <Select.Option key={vt.maVaiTro} value={vt.maVaiTro}>
                  {vt.tenVaiTro}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setCreateModal(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Tạo tài khoản
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={'Phân quyền cho: ' + (selectedAcc?.tenDangNhap || '')} open={roleModal} onCancel={() => setRoleModal(false)} footer={null}>
        <Form form={roleForm} layout="vertical" onFinish={handleChangeRole}>
          <Form.Item name="maVaiTro" label="Chọn vai trò mới" rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}>
            <Select placeholder="Chọn quyền hạn mới">
              {vaiTros.map((vt) => (
                <Select.Option key={vt.maVaiTro} value={vt.maVaiTro}>
                  {vt.tenVaiTro}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setRoleModal(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu phân quyền
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
