import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  DatePicker,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  UpCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  EyeOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';
  const isManager = currentUser?.vaiTro === 'Quản lý';
  const isEmployee = currentUser?.vaiTro === 'Nhân viên';

  const [myDeptId, setMyDeptId] = useState<string | undefined>(currentUser?.maPhongBan);
  const [myDeptName, setMyDeptName] = useState<string | undefined>(currentUser?.tenPhongBan);

  const isHR = (myDeptName || currentUser?.tenPhongBan || '').includes('Nhân sự');
  const isHRManager = isManager && isHR;
  const canManageHR = isOwner || isHRManager;
  const canViewAllDepts = isOwner || isHRManager || (isEmployee && isHR);

  const [selectedPhongBan, setSelectedPhongBan] = useState<string>('ALL');

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [promoteModal, setPromoteModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedNv, setSelectedNv] = useState<NhanVien | null>(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [promoteForm] = Form.useForm();

  useEffect(() => {
    if (currentUser?.maNhanVien && (!myDeptId || !myDeptName)) {
      nhanVienApi.getById(currentUser.maNhanVien).then((res) => {
        if (res.data) {
          if (res.data.maPhongBan) setMyDeptId(res.data.maPhongBan);
          if (res.data.tenPhongBan) setMyDeptName(res.data.tenPhongBan);
          const updated = {
            ...currentUser,
            maPhongBan: res.data.maPhongBan,
            tenPhongBan: res.data.tenPhongBan,
            tenChucVu: res.data.tenChucVu,
          };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }).catch(() => {});
    }
  }, [currentUser?.maNhanVien]);

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

  const displayData = data.filter((item) => {
    if (!canViewAllDepts) return true;
    if (selectedPhongBan !== 'ALL') {
      if (item.maPhongBan?.toLowerCase() !== selectedPhongBan.toLowerCase()) return false;
    }
    return true;
  });

  const getErrorMessage = (err: any, fallback: string) => {
    const serverErrors = err.response?.data?.errors;
    let errMsg = err.response?.data?.message;
    if (!errMsg && serverErrors && typeof serverErrors === 'object') {
      const firstKey = Object.keys(serverErrors)[0];
      if (firstKey && Array.isArray(serverErrors[firstKey])) {
        errMsg = serverErrors[firstKey][0];
      }
    }
    return errMsg || (typeof err.response?.data === 'string' ? err.response?.data : fallback);
  };

  const openCreateModal = () => {
    createForm.resetFields();
    setCreateModal(true);
  };

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
      message.error(getErrorMessage(err, 'Thêm nhân sự thất bại.'));
    }
  };

  const handleEdit = async (values: any) => {
    if (!selectedNv) return;
    try {
      const payload = {
        ...values,
        maChucVu: selectedNv.maChucVu,
        trangThaiLamViec: selectedNv.trangThaiLamViec,
        ngaySinh: values.ngaySinh ? values.ngaySinh.format('YYYY-MM-DD') : selectedNv.ngaySinh,
        ngayVaoLam: values.ngayVaoLam ? values.ngayVaoLam.format('YYYY-MM-DD') : selectedNv.ngayVaoLam,
      };
      await nhanVienApi.update(selectedNv.maNhanVien, payload);
      message.success('Cập nhật nhân sự thành công!');
      setEditModal(false);
      fetchData();
    } catch (err: any) {
      message.error(getErrorMessage(err, 'Cập nhật thất bại.'));
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
      message.error(getErrorMessage(err, 'Thao tác thất bại.'));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await nhanVienApi.restore(id);
      message.success('Khôi phục trạng thái làm việc và mở khóa tài khoản thành công!');
      fetchData();
    } catch (err: any) {
      message.error(getErrorMessage(err, 'Khôi phục thất bại.'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await nhanVienApi.softDelete(id);
      message.success('Đã cho nhân sự thôi việc và khóa tài khoản liên kết!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Xóa nhân sự thất bại.');
    }
  };

  const columns = [
    {
      title: 'Họ và tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
      width: 170,
      render: (val: string) => <strong style={{ whiteSpace: 'nowrap' }}>{val}</strong>,
    },
    {
      title: 'Phòng ban',
      dataIndex: 'tenPhongBan',
      key: 'tenPhongBan',
      width: 200,
      render: (val: string) => <Tag color="blue" style={{ margin: 0 }}>{val || 'Chưa gán'}</Tag>,
    },
    {
      title: 'Chức danh / Vị trí',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      width: 160,
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Trưởng') || val?.includes('Giám đốc') || val?.includes('Chủ doanh nghiệp')) color = 'gold';
        else if (val?.includes('Phó')) color = 'cyan';
        return <Tag color={color} style={{ margin: 0 }}>{val || 'Chưa gán'}</Tag>;
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 210,
      ellipsis: true,
      render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val || '-'}</span>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'soDienThoai',
      key: 'soDienThoai',
      width: 130,
      render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val || '-'}</span>,
    },
    {
      title: 'Trình độ',
      dataIndex: 'trinhDoHocVan',
      key: 'trinhDoHocVan',
      width: 120,
      render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val || '-'}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThaiLamViec',
      key: 'trangThaiLamViec',
      width: 140,
      align: 'center' as const,
      render: (val: string) => (
        <Tag color={val === 'Đang làm việc' ? 'green' : 'red'} style={{ margin: 0 }}>
          {val}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: NhanVien) => {
        const isResigned =
          record.trangThaiLamViec === 'Đã nghỉ việc' ||
          record.trangThaiLamViec === 'Đã thôi việc' ||
          record.trangThaiLamViec === 'Đã thôi việc / Nghỉ việc' ||
          (record.trangThaiLamViec &&
            (record.trangThaiLamViec.includes('thôi việc') || record.trangThaiLamViec.includes('nghỉ việc')));

        if (!canManageHR) {
          return (
            <Space size="small">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedNv(record);
                  setViewModal(true);
                }}
              >
                Xem tổng quát
              </Button>
              {isResigned ? (
                <Tag color="red">Đã thôi việc</Tag>
              ) : (
                <Tag color="default">Chỉ xem</Tag>
              )}
            </Space>
          );
        }

        const isSelf = record.maNhanVien === currentUser?.maNhanVien;
        const isTargetDirector = (record.tenChucVu || '').includes('Giám đốc') 
          || (record.tenPhongBan || '').includes('Ban Giám đốc') 
          || (record.tenChucVu || '').includes('Chủ doanh nghiệp')
          || (record.tenChucVu || '').includes('Quản trị viên');

        if (!isOwner && isTargetDirector) {
          return <Tag color="error">Ban Giám Đốc</Tag>;
        }

        if (isSelf) {
          return <Tag color="blue">Bản thân</Tag>;
        }

        if (isResigned) {
          const canRestore = canManageHR && (isOwner || !isTargetDirector);
          return (
            <Space size="small">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  setSelectedNv(record);
                  setViewModal(true);
                }}
              >
                Xem tổng quát
              </Button>
              {canRestore && (
                <Popconfirm
                  title="Xác nhận khôi phục nhân sự"
                  description={`Khôi phục trạng thái làm việc và mở khóa tài khoản cho ${record.hoTen}?`}
                  okText="Khôi phục"
                  cancelText="Hủy"
                  onConfirm={() => handleRestore(record.maNhanVien)}
                >
                  <Button
                    size="small"
                    type="primary"
                    icon={<UndoOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Khôi phục
                  </Button>
                </Popconfirm>
              )}
              <Tag color="red">Đã thôi việc</Tag>
            </Space>
          );
        }

        const canPromote = isOwner || !isTargetDirector;
        const canEdit = isOwner || !isTargetDirector;
        const canTerminate = isOwner || !isTargetDirector;

        return (
          <Space size="small">
            {canPromote && (
              <Button
                size="small"
                icon={<UpCircleOutlined />}
                onClick={() => {
                  setSelectedNv(record);
                  promoteForm.resetFields();
                  setPromoteModal(true);
                }}
              >
                Cấp chức
              </Button>
            )}

            {canEdit && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedNv(record);
                  editForm.setFieldsValue({
                    ...record,
                    ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : undefined,
                    ngayVaoLam: record.ngayVaoLam ? dayjs(record.ngayVaoLam) : undefined,
                  });
                  setEditModal(true);
                }}
              >
                Sửa
              </Button>
            )}

            {canTerminate && (
              <Popconfirm
                title="Xác nhận thôi việc"
                description={`Cho ${record.hoTen} thôi việc? Hệ thống sẽ khóa tài khoản đăng nhập.`}
                okText="Đồng ý thôi việc"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(record.maNhanVien)}
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Thôi việc
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            {isOwner
              ? 'QUẢN LÝ THÔNG TIN NHÂN SỰ TOÀN CÔNG TY (CHỦ DOANH NGHIỆP)'
              : isHR
              ? 'QUẢN LÝ THÔNG TIN NHÂN SỰ TOÀN CÔNG TY (PHÒNG NHÂN SỰ)'
              : `THÔNG TIN NHÂN SỰ - ${myDeptName ? myDeptName.toUpperCase() : 'PHÒNG BAN QUẢN LÝ'}`}
          </span>
        }
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Space wrap size="middle">
            {canViewAllDepts ? (
              <Select
                value={selectedPhongBan}
                onChange={setSelectedPhongBan}
                style={{ width: 250 }}
              >
                <Select.Option value="ALL">Tất cả phòng ban ({data.length})</Select.Option>
                {phongBans.map((pb) => {
                  const count = data.filter((item) => item.maPhongBan?.toLowerCase() === pb.maPhongBan?.toLowerCase()).length;
                  return (
                    <Select.Option key={pb.maPhongBan} value={pb.maPhongBan}>
                      {pb.tenPhongBan} ({count})
                    </Select.Option>
                  );
                })}
              </Select>
            ) : myDeptName ? (
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
                🏢 Đang theo dõi: <strong>{myDeptName}</strong> ({displayData.length} nhân sự)
              </Tag>
            ) : null}
          </Space>

          <Space wrap size="middle">
            <Input
              placeholder="Tìm theo tên, email, CCCD, SĐT..."
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            {canManageHR && (
              <Button type="primary" icon={<UserAddOutlined />} onClick={openCreateModal}>
                Thêm nhân sự mới
              </Button>
            )}
          </Space>
        </div>

        <Table
          dataSource={displayData}
          columns={columns}
          rowKey="maNhanVien"
          loading={loading}
          scroll={{ x: 1250 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng cộng ${total} nhân sự`,
          }}
        />
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
              <Form.Item
                name="ngaySinh"
                label="Ngày sinh"
                rules={[
                  { required: true, message: 'Chọn ngày sinh!' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (value.isAfter(dayjs(), 'day')) {
                        return Promise.reject(new Error('Ngày sinh không được ở tương lai!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cccd"
                label="Số CCCD"
                rules={[
                  { required: true, message: 'Nhập CCCD!' },
                  { pattern: /^[0-9]{9,12}$/, message: 'Số CCCD phải gồm 9 đến 12 chữ số!' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (data.some((nv) => nv.cccd === value.trim())) {
                        return Promise.reject(new Error('Số CCCD này đã tồn tại trong danh sách nhân sự!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input placeholder="07920..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="soDienThoai"
                label="Số điện thoại"
                rules={[
                  { required: true, message: 'Nhập SĐT!' },
                  { pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0!' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (data.some((nv) => nv.soDienThoai === value.trim())) {
                        return Promise.reject(new Error('Số điện thoại này đã tồn tại trong danh sách nhân sự!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
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
                  {phongBans
                    .filter((pb) => isOwner || !pb.tenPhongBan.includes('Ban Giám đốc'))
                    .map((pb) => (
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
                  {chucVus
                    .filter((cv) => isOwner || (!cv.tenChucVu.includes('Giám đốc') && !cv.tenChucVu.includes('Chủ doanh nghiệp')))
                    .map((cv) => (
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
              <Form.Item
                name="ngayVaoLam"
                label="Ngày vào làm"
                dependencies={['ngaySinh']}
                rules={[
                  { required: true, message: 'Chọn ngày vào làm!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const ngaySinh = getFieldValue('ngaySinh');
                      if (!value || !ngaySinh) return Promise.resolve();
                      if (value.isBefore(ngaySinh, 'day')) {
                        return Promise.reject(new Error('Ngày vào làm không được trước ngày sinh!'));
                      }
                      if (value.isBefore(ngaySinh.add(18, 'year'), 'day')) {
                        return Promise.reject(new Error('Nhân sự phải từ đủ 18 tuổi tính đến ngày vào làm!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
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

      <Modal title={'Cập nhật nhân sự: ' + (selectedNv?.hoTen || '')} open={editModal} onCancel={() => setEditModal(false)} footer={null} width={700}>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
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
              <Form.Item
                name="ngaySinh"
                label="Ngày sinh"
                rules={[
                  { required: true, message: 'Chọn ngày sinh!' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (value.isAfter(dayjs(), 'day')) {
                        return Promise.reject(new Error('Ngày sinh không được ở tương lai!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cccd"
                label="Số CCCD"
                rules={[
                  { required: true, message: 'Nhập CCCD!' },
                  { pattern: /^[0-9]{9,12}$/, message: 'Số CCCD phải gồm 9 đến 12 chữ số!' },
                  {
                    validator: (_, value) => {
                      if (!value || !selectedNv) return Promise.resolve();
                      if (data.some((nv) => nv.cccd === value.trim() && nv.maNhanVien !== selectedNv.maNhanVien)) {
                        return Promise.reject(new Error('Số CCCD này đã tồn tại ở nhân sự khác!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input placeholder="07920..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="soDienThoai"
                label="Số điện thoại"
                rules={[
                  { required: true, message: 'Nhập SĐT!' },
                  { pattern: /^0\d{9}$/, message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0!' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      if (data.some((nv) => nv.soDienThoai === value.trim() && nv.maNhanVien !== selectedNv?.maNhanVien)) {
                        return Promise.reject(new Error('Số điện thoại này đã tồn tại ở nhân sự khác!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
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
                  {phongBans
                    .filter((pb) => isOwner || !pb.tenPhongBan.includes('Ban Giám đốc'))
                    .map((pb) => (
                      <Select.Option key={pb.maPhongBan} value={pb.maPhongBan}>
                        {pb.tenPhongBan}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ngayVaoLam"
                label="Ngày vào làm"
                dependencies={['ngaySinh']}
                rules={[
                  { required: true, message: 'Chọn ngày vào làm!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const ngaySinh = getFieldValue('ngaySinh');
                      if (!value || !ngaySinh) return Promise.resolve();
                      if (value.isBefore(ngaySinh, 'day')) {
                        return Promise.reject(new Error('Ngày vào làm không được trước ngày sinh!'));
                      }
                      if (value.isBefore(ngaySinh.add(18, 'year'), 'day')) {
                        return Promise.reject(new Error('Nhân sự phải từ đủ 18 tuổi tính đến ngày vào làm!'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="diaChi" label="Địa chỉ" rules={[{ required: true, message: 'Nhập địa chỉ!' }]}>
                <Input placeholder="TP.HCM..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setEditModal(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu thay đổi
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
              {chucVus
                .filter((cv) => {
                  if (cv.tenChucVu.includes('Thực tập')) return false;
                  if (cv.maChucVu === selectedNv?.maChucVu) return false;
                  if (isOwner) return true;
                  if (cv.tenChucVu.includes('Giám đốc') || cv.tenChucVu.includes('Chủ doanh nghiệp')) return false;
                  if (selectedNv?.tenPhongBan?.includes('Nhân sự') && cv.tenChucVu.includes('Trưởng')) return false;
                  return true;
                })
                .map((cv) => (
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

      <Modal
        title={'Thông tin tổng quát nhân sự: ' + (selectedNv?.hoTen || '')}
        open={viewModal}
        onCancel={() => setViewModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setViewModal(false)}>
            Đóng
          </Button>,
        ]}
        width={720}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Mã nhân viên">{selectedNv?.maNhanVien || '---'}</Descriptions.Item>
          <Descriptions.Item label="Họ và tên">{selectedNv?.hoTen || '---'}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">{selectedNv?.gioiTinh || '---'}</Descriptions.Item>
          <Descriptions.Item label="Ngày sinh">
            {selectedNv?.ngaySinh ? dayjs(selectedNv.ngaySinh).format('DD/MM/YYYY') : '---'}
          </Descriptions.Item>
          <Descriptions.Item label="Số CCCD">{selectedNv?.cccd || '---'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{selectedNv?.soDienThoai || '---'}</Descriptions.Item>
          <Descriptions.Item label="Email" span={2}>{selectedNv?.email || '---'}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ" span={2}>{selectedNv?.diaChi || '---'}</Descriptions.Item>
          <Descriptions.Item label="Phòng ban">{selectedNv?.tenPhongBan || '---'}</Descriptions.Item>
          <Descriptions.Item label="Chức vụ">{selectedNv?.tenChucVu || '---'}</Descriptions.Item>
          <Descriptions.Item label="Trình độ">{selectedNv?.trinhDoHocVan || '---'}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={selectedNv?.trangThaiLamViec?.includes('nghỉ') || selectedNv?.trangThaiLamViec?.includes('thôi') ? 'red' : 'green'}>
              {selectedNv?.trangThaiLamViec || 'Đang làm việc'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày vào làm">
            {selectedNv?.ngayVaoLam ? dayjs(selectedNv.ngayVaoLam).format('DD/MM/YYYY') : '---'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày thôi việc">
            {selectedNv?.ngayNghiViec ? dayjs(selectedNv.ngayNghiViec).format('DD/MM/YYYY') : '---'}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>{selectedNv?.ghiChu || 'Không có'}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};
