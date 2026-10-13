import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, DatePicker, Row, Col } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, UpCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, PhongBan, ChucVu } from '../api/danhMucApi';
import { NhanVien } from '../types';
import axiosClient from '../api/axiosClient';

export const NhanVienPage: React.FC = () => {
  const [data, setData] = useState<NhanVien[]>([]);
  const [phongBans, setPhongBans] = useState<PhongBan[]>([]);
  const [chucVus, setChucVus] = useState<ChucVu[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [promoteModal, setPromoteModal] = useState(false);
  const [selectedNv, setSelectedNv] = useState<NhanVien | null>(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [promoteForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [nvRes, pbRes, cvRes] = await Promise.all([
        nhanVienApi.getAll({ pageSize: 100, keyword }),
        danhMucApi.getPhongBans(),
        danhMucApi.getChucVus(),
      ]);
      setData(nvRes.data.items || []);
      setPhongBans(pbRes.data);
      setChucVus(cvRes.data);
    } catch {
      message.error('Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keyword]);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        ngaySinh: values.ngaySinh.format('YYYY-MM-DD'),
        ngayVaoLam: values.ngayVaoLam.format('YYYY-MM-DD'),
        trangThaiLamViec: 'Đang làm việc',
      };
      await nhanVienApi.create(payload);
      message.success('Thêm nhân sự mới thành công!');
      setCreateModal(false);
      createForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thêm nhân sự thất bại.');
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedNv) return;
    try {
      await nhanVienApi.update(selectedNv.maNhanVien, values);
      message.success('Cập nhật nhân sự thành công!');
      setEditModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Cập nhật thất bại.');
    }
  };

  const handlePromote = async (values: any) => {
    if (!selectedNv) return;
    try {
      await axiosClient.put('/nhanvien/' + selectedNv.maNhanVien + '/chuc-vu', values.maChucVu, {
        headers: { 'Content-Type': 'application/json' },
      });
      message.success('Thăng chức / Cấp quyền chức vụ thành công!');
      setPromoteModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await nhanVienApi.softDelete(id);
      message.success('Đã cho nhân sự thôi việc (Chuyển trạng thái sang Đã nghỉ việc)!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Xóa nhân sự thất bại.');
    }
  };

  const columns = [
    { title: 'Họ và tên', dataIndex: 'hoTen', key: 'hoTen', render: (val: string) => <strong>{val}</strong> },
    { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag> },
    {
      title: 'Chức danh / Vị trí',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Trưởng') || val?.includes('Giám đốc')) color = 'gold';
        else if (val?.includes('Phó')) color = 'cyan';
        return <Tag color={color}>{val || 'Chưa gán'}</Tag>;
      },
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Số điện thoại', dataIndex: 'soDienThoai', key: 'soDienThoai' },
    { title: 'Trình độ', dataIndex: 'trinhDoHocVan', key: 'trinhDoHocVan' },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThaiLamViec',
      key: 'trangThaiLamViec',
      render: (val: string) => (
        <Tag color={val === 'Đang làm việc' ? 'green' : 'red'}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Thao tác (Quản lý)',
      key: 'action',
      render: (_: any, record: NhanVien) => (
        <Space>
          <Button
            size="small"
            icon={<UpCircleOutlined />}
            onClick={() => {
              setSelectedNv(record);
              promoteForm.setFieldsValue({ maChucVu: record.maChucVu });
              setPromoteModal(true);
            }}
          >
            Cấp chức
          </Button>

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedNv(record);
              editForm.setFieldsValue(record);
              setEditModal(true);
            }}
          >
            Sửa
          </Button>

          {record.trangThaiLamViec !== 'Đã nghỉ việc' && (
            <Popconfirm
              title="Xác nhận cho nhân sự này thôi việc?"
              onConfirm={() => handleDelete(record.maNhanVien)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                Thôi việc
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="QUẢN LÝ THÔNG TIN NHÂN SỰ (HR MANAGER)"
        extra={
          <Space>
            <Input
              placeholder="Tìm theo tên/CCCD..."
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 220 }}
            />
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateModal(true)}>
              Thêm nhân sự mới
            </Button>
          </Space>
        }
      >
        <Table dataSource={data} columns={columns} rowKey="maNhanVien" loading={loading} />
      </Card>

      <Modal title="Thêm một nhân sự mới" open={createModal} onCancel={() => setCreateModal(false)} footer={null} width={700}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên!' }]}>
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gioiTinh" label="Giới tính" rules={[{ required: true, message: 'Chọn giới tính!' }]}>
                <Select placeholder="Chọn">
                  <Select.Option value="Nam">Nam</Select.Option>
                  <Select.Option value="Nữ">Nữ</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ngaySinh" label="Ngày sinh" rules={[{ required: true, message: 'Chọn ngày sinh!' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cccd" label="Số CCCD" rules={[{ required: true, message: 'Nhập CCCD!' }]}>
                <Input placeholder="07920..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="soDienThoai" label="Số điện thoại" rules={[{ required: true, message: 'Nhập SĐT!' }]}>
                <Input placeholder="090..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập Email!' }]}>
                <Input type="email" placeholder="example@hrm.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trinhDoHocVan" label="Trình độ học vấn" rules={[{ required: true, message: 'Chọn trình độ!' }]}>
                <Select placeholder="Chọn trình độ">
                  <Select.Option value="Đại học">Đại học</Select.Option>
                  <Select.Option value="Thạc sĩ">Thạc sĩ</Select.Option>
                  <Select.Option value="Tiến sĩ">Tiến sĩ</Select.Option>
                  <Select.Option value="Cao đẳng">Cao đẳng</Select.Option>
                  <Select.Option value="Trung cấp">Trung cấp</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maPhongBan" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban!' }]}>
                <Select placeholder="Chọn phòng ban">
                  {phongBans.map((pb) => (
                    <Select.Option key={pb.maPhongBan} value={pb.maPhongBan}>
                      {pb.tenPhongBan}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maChucVu" label="Chức vụ" rules={[{ required: true, message: 'Chọn chức vụ!' }]}>
                <Select placeholder="Chọn chức vụ">
                  {chucVus.map((cv) => (
                    <Select.Option key={cv.maChucVu} value={cv.maChucVu}>
                      {cv.tenChucVu}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngayVaoLam" label="Ngày vào làm" rules={[{ required: true, message: 'Chọn ngày vào làm!' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="diaChi" label="Địa chỉ" rules={[{ required: true, message: 'Nhập địa chỉ!' }]}>
                <Input placeholder="TP.HCM..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setCreateModal(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu nhân sự
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={'Thăng chức / Cấp quyền cho: ' + (selectedNv?.hoTen || '')} open={promoteModal} onCancel={() => setPromoteModal(false)} footer={null}>
        <Form form={promoteForm} layout="vertical" onFinish={handlePromote}>
          <p>
            Hiện tại chức vụ là: <strong>{selectedNv?.tenChucVu}</strong> thuộc phòng <strong>{selectedNv?.tenPhongBan}</strong>.
          </p>
          <Form.Item name="maChucVu" label="Chức vụ mới (Thăng chức / Chuyển vị trí)" rules={[{ required: true, message: 'Chọn chức vụ mới!' }]}>
            <Select placeholder="Chọn chức vụ mới">
              {chucVus.map((cv) => (
                <Select.Option key={cv.maChucVu} value={cv.maChucVu}>
                  {cv.tenChucVu} (Phụ cấp: {cv.phuCapChucVu.toLocaleString('vi-VN')} đ)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setPromoteModal(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Xác nhận thăng chức
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
