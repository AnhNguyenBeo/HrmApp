import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Row, Col } from 'antd';
import { UserAddOutlined, LockOutlined, UnlockOutlined, SafetyCertificateOutlined, SearchOutlined, KeyOutlined } from '@ant-design/icons';
import { taiKhoanApi } from '../api/taiKhoanApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, VaiTro, PhongBan } from '../api/danhMucApi';
import { TaiKhoan, NhanVien } from '../types';

export const TaiKhoanPage: React.FC = () => {
  const [data, setData] = useState<TaiKhoan[]>([]);
  const [nhanViens, setNhanViens] = useState<NhanVien[]>([]);
  const [vaiTros, setVaiTros] = useState<VaiTro[]>([]);
  const [phongBans, setPhongBans] = useState<PhongBan[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPhongBan, setFilterPhongBan] = useState('ALL');

  const [createModal, setCreateModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<TaiKhoan | null>(null);

  const [createForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tkRes, nvRes, vtRes, pbRes] = await Promise.allSettled([
        taiKhoanApi.getAll(),
        nhanVienApi.getAll({ pageSize: 100 }),
        danhMucApi.getVaiTros(),
        danhMucApi.getPhongBans(),
      ]);

      if (tkRes.status === 'fulfilled') {
        setData(tkRes.value.data);
      } else {
        message.error('Không thể tải danh sách tài khoản.');
      }

      if (nvRes.status === 'fulfilled') {
        setNhanViens(nvRes.value.data.items || []);
      }

      if (vtRes.status === 'fulfilled') {
        setVaiTros(vtRes.value.data);
      }

      if (pbRes.status === 'fulfilled') {
        setPhongBans(pbRes.value.data);
      }
    } catch {
      message.error('Không thể tải dữ liệu tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await taiKhoanApi.create({ ...values, trangThai: 'Hoạt động' });
      message.success('Cấp tài khoản mới thành công!');
      setCreateModal(false);
      createForm.resetFields();
      fetchData();
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;
      let errMsg = err.response?.data?.message;
      if (!errMsg && serverErrors && typeof serverErrors === 'object') {
        const firstKey = Object.keys(serverErrors)[0];
        if (firstKey && Array.isArray(serverErrors[firstKey])) {
          errMsg = serverErrors[firstKey][0];
        }
      }
      message.error(errMsg || (typeof err.response?.data === 'string' ? err.response?.data : 'Cấp tài khoản thất bại.'));
    }
  };

  const handleChangeRole = async (values: any) => {
    if (!selectedAcc) return;
    try {
      await taiKhoanApi.changeRole(selectedAcc.maTaiKhoan, values.maVaiTro);
      message.success('Cập nhật phân quyền vai trò thành công!');
      setRoleModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Cập nhật vai trò thất bại.');
    }
  };

  const handleToggleLock = async (record: TaiKhoan) => {
    try {
      if (record.trangThai === 'Bị khóa') {
        const res = await taiKhoanApi.unlock(record.maTaiKhoan);
        message.success(res.data?.message || 'Mở khóa tài khoản thành công!');
      } else {
        const res = await taiKhoanApi.lock(record.maTaiKhoan);
        message.success(res.data?.message || 'Khóa tài khoản thành công!');
      }
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const filteredData = data.filter((item) => {
    const matchSearch =
      !searchText ||
      item.tenDangNhap.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.tenNhanVien && item.tenNhanVien.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.tenPhongBan && item.tenPhongBan.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.tenChucVu && item.tenChucVu.toLowerCase().includes(searchText.toLowerCase()));
    const matchRole = filterRole === 'ALL' || item.tenVaiTro === filterRole;
    const matchStatus = filterStatus === 'ALL' || item.trangThai === filterStatus;
    const matchDept = filterPhongBan === 'ALL' || item.tenPhongBan === filterPhongBan;
    return matchSearch && matchRole && matchStatus && matchDept;
  });

  const columns = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'tenDangNhap',
      key: 'tenDangNhap',
      render: (val: string) => <strong>{val}</strong>,
    },
    {
      title: 'Chủ sở hữu (Nhân viên)',
      dataIndex: 'tenNhanVien',
      key: 'tenNhanVien',
      render: (val: string) => val || 'Chưa gán',
    },
    {
      title: 'Phòng ban',
      dataIndex: 'tenPhongBan',
      key: 'tenPhongBan',
      render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag>,
    },
    {
      title: 'Chức vụ',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Chủ doanh nghiệp') || val?.includes('Giám đốc')) color = 'gold';
        else if (val?.includes('Trưởng')) color = 'cyan';
        else if (val?.includes('Phó')) color = 'purple';
        return <Tag color={color}>{val || 'Chưa gán'}</Tag>;
      },
    },
    {
      title: 'Vai trò (Quyền)',
      dataIndex: 'tenVaiTro',
      key: 'tenVaiTro',
      render: (val: string) => {
        let color = 'default';
        if (val === 'Quản trị viên') color = 'magenta';
        else if (val === 'Chủ doanh nghiệp') color = 'gold';
        else if (val === 'Quản lý') color = 'blue';
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
    {
      title: 'Ngày tạo',
      dataIndex: 'ngayTao',
      key: 'ngayTao',
    },
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
            onConfirm={() => handleToggleLock(record)}
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
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={7}>
            <Input
              placeholder="Tìm theo tên đăng nhập, nhân viên, phòng ban, chức vụ..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%' }}
              value={filterPhongBan}
              onChange={(v) => setFilterPhongBan(v)}
            >
              <Select.Option value="ALL">Tất cả phòng ban</Select.Option>
              {phongBans.map((pb) => (
                <Select.Option key={pb.maPhongBan} value={pb.tenPhongBan}>
                  {pb.tenPhongBan}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filterRole}
              onChange={(v) => setFilterRole(v)}
            >
              <Select.Option value="ALL">Tất cả vai trò</Select.Option>
              <Select.Option value="Quản trị viên">Quản trị viên</Select.Option>
              <Select.Option value="Chủ doanh nghiệp">Chủ doanh nghiệp</Select.Option>
              <Select.Option value="Quản lý">Quản lý</Select.Option>
              <Select.Option value="Nhân viên">Nhân viên</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v)}
            >
              <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
              <Select.Option value="Hoạt động">Hoạt động</Select.Option>
              <Select.Option value="Bị khóa">Bị khóa</Select.Option>
            </Select>
          </Col>
        </Row>

        <Table dataSource={filteredData} columns={columns} rowKey="maTaiKhoan" loading={loading} />
      </Card>

      <Modal title="Cấp tài khoản đăng nhập mới" open={createModal} onCancel={() => setCreateModal(false)} footer={null}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="maNhanVien" label="Chọn nhân sự" rules={[{ required: true, message: 'Vui lòng chọn nhân sự!' }]}>
            <Select showSearch placeholder="Chọn nhân sự cần cấp tài khoản" optionFilterProp="label">
              {nhanViens.map((nv) => {
                const hasAccount = data.some((tk) => tk.maNhanVien === nv.maNhanVien);
                const isResigned = nv.trangThaiLamViec === 'Đã nghỉ việc';
                return (
                  <Select.Option
                    key={nv.maNhanVien}
                    value={nv.maNhanVien}
                    label={nv.hoTen}
                    disabled={hasAccount || isResigned}
                  >
                    {nv.hoTen} ({nv.tenPhongBan || 'Chưa gán'} - {nv.tenChucVu || 'Chưa gán'})
                    {hasAccount ? ' [Đã có tài khoản]' : isResigned ? ' [Đã nghỉ việc]' : ''}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item
            name="tenDangNhap"
            label="Tên đăng nhập"
            rules={[
              { required: true, message: 'Nhập tên đăng nhập!' },
              { pattern: /^\S+$/, message: 'Tên đăng nhập không được chứa khoảng trắng!' }
            ]}
          >
            <Input placeholder="ví dụ: nam.tran" />
          </Form.Item>
          <Form.Item
            name="matKhau"
            label="Mật khẩu khởi tạo"
            rules={[
              { required: true, message: 'Nhập mật khẩu!' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Mật khẩu mặc định (tối thiểu 8 ký tự)" />
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
