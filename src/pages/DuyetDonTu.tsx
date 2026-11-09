import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Row, Col, Segmented, Descriptions, Divider, Typography, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, FileTextOutlined, SafetyCertificateOutlined, SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { donTuApi } from '../api/donTuApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, PhongBan } from '../api/danhMucApi';
import { DonTu } from '../types';

const { Text } = Typography;

export const DuyetDonTuPage: React.FC = () => {
  const [data, setData] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDon, setSelectedDon] = useState<DonTu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailDon, setSelectedDetailDon] = useState<DonTu | null>(null);
  const [form] = Form.useForm();

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';

  const [myDeptId, setMyDeptId] = useState<string | undefined>(currentUser?.maPhongBan);
  const [myDeptName, setMyDeptName] = useState<string | undefined>(currentUser?.tenPhongBan);

  const [phongBans, setPhongBans] = useState<PhongBan[]>([]);
  const [selectedPhongBan, setSelectedPhongBan] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('Chờ duyệt');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

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

  useEffect(() => {
    if (isOwner) {
      danhMucApi.getPhongBans().then((res) => setPhongBans(res.data)).catch(() => {});
    }
  }, [isOwner]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await donTuApi.getAll();
      setData(res.data || []);
    } catch {
      message.error('Không thể tải danh sách đơn từ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSameDept = (record: DonTu) => {
    if (myDeptId && record.maPhongBan && myDeptId.toLowerCase() === record.maPhongBan.toLowerCase()) {
      return true;
    }
    if (myDeptName && record.tenPhongBan && myDeptName.trim().toLowerCase() === record.tenPhongBan.trim().toLowerCase()) {
      return true;
    }
    return false;
  };

  const handleViewDetail = (record: DonTu) => {
    setSelectedDetailDon(record);
    setDetailModalOpen(true);
  };

  const pendingCount = data.filter((d) => d.trangThai === 'Chờ duyệt').length;
  const approvedCount = data.filter((d) => d.trangThai === 'Đã duyệt').length;
  const rejectedCount = data.filter((d) => d.trangThai === 'Từ chối').length;

  const displayData = data.filter((item) => {
    if (statusFilter !== 'ALL' && item.trangThai !== statusFilter) {
      return false;
    }
    if (isOwner && selectedPhongBan !== 'ALL') {
      if (item.maPhongBan?.toLowerCase() !== selectedPhongBan.toLowerCase()) {
        return false;
      }
    }
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.hoTen || '').toLowerCase().includes(kw) ||
      (item.tenPhongBan || '').toLowerCase().includes(kw) ||
      (item.tenChucVu || '').toLowerCase().includes(kw) ||
      (item.loaiDon || '').toLowerCase().includes(kw) ||
      (item.lyDo || '').toLowerCase().includes(kw) ||
      (item.ngayBatDau || '').toLowerCase().includes(kw) ||
      (item.ngayKetThuc || '').toLowerCase().includes(kw)
    );
  });

  const handleAction = (record: DonTu, status: 'Đã duyệt' | 'Từ chối') => {
    setSelectedDon(record);
    form.setFieldsValue({ trangThai: status, ghiChuDuyet: '' });
    setModalOpen(true);
  };

  const handleFinish = async (values: any) => {
    if (!selectedDon) return;
    try {
      await donTuApi.approve(selectedDon.maDon, values);
      message.success('Đã xử lý đơn: ' + values.trangThai);
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Xử lý đơn thất bại.');
    }
  };

  const columns = [
    { title: 'Nhân viên gửi', dataIndex: 'hoTen', key: 'hoTen', width: 170, render: (val: string) => <strong style={{ whiteSpace: 'nowrap' }}>{val}</strong> },
    {
      title: 'Chức vụ',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      width: 150,
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Chủ doanh nghiệp') || val?.includes('Giám đốc')) color = 'gold';
        else if (val?.includes('Trưởng')) color = 'blue';
        else if (val?.includes('Phó')) color = 'cyan';
        return <Tag color={color}>{val || 'Nhân viên'}</Tag>;
      },
    },
    { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', width: 180, render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag> },
    {
      title: 'Loại đơn',
      dataIndex: 'loaiDon',
      key: 'loaiDon',
      width: 130,
      render: (val: string) => {
        let color = 'blue';
        if (val === 'Nghỉ việc') color = 'red';
        if (val === 'Thai sản') color = 'purple';
        if (val === 'Làm thêm giờ' || val === 'Đăng ký tăng ca' || val === 'Tăng ca' || val === 'Đơn tăng ca') color = 'orange';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: 'Từ ngày',
      dataIndex: 'ngayBatDau',
      key: 'ngayBatDau',
      width: 110,
      render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val}</span>,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'ngayKetThuc',
      key: 'ngayKetThuc',
      width: 110,
      render: (val: string, record: DonTu) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc' || record.loaiDon === 'Giải trình chấm công' || record.loaiDon === 'Làm thêm giờ' || record.loaiDon === 'Đăng ký tăng ca' || record.loaiDon === 'Tăng ca' || record.loaiDon === 'Đơn tăng ca' ? '-' : val}
        </span>
      ),
    },
    {
      title: 'Số ngày / Giờ',
      dataIndex: 'soNgayNghi',
      key: 'soNgayNghi',
      width: 120,
      render: (val: number, record: DonTu) => {
        if (record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc' || record.loaiDon === 'Giải trình chấm công') {
          return <span style={{ color: '#888' }}>-</span>;
        }
        if (record.loaiDon === 'Làm thêm giờ' || record.loaiDon === 'Đăng ký tăng ca' || record.loaiDon === 'Tăng ca' || record.loaiDon === 'Đơn tăng ca') {
          return <Tag color="orange"><strong>{record.soGio ?? record.soNgayNghi} giờ OT</strong></Tag>;
        }
        return <strong>{val} ngày</strong>;
      },
    },
    { title: 'Lý do', dataIndex: 'lyDo', key: 'lyDo', width: 180, ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 130,
      render: (val: string) => {
        let color = 'gold';
        if (val === 'Đã duyệt') color = 'green';
        if (val === 'Từ chối') color = 'red';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    { title: 'Người duyệt', dataIndex: 'tenNguoiDuyet', key: 'tenNguoiDuyet', width: 150, render: (val: string) => val || '-' },
    {
      title: 'Thao tác phê duyệt',
      key: 'action',
      width: 230,
      fixed: 'right' as const,
      render: (_: any, record: DonTu) => {
        if (record.trangThai !== 'Chờ duyệt') {
          return (
            <Space size="small">
              <Tag color={record.trangThai === 'Đã duyệt' ? 'green' : 'red'}>
                {record.trangThai}
              </Tag>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
                style={{ padding: 0 }}
              >
                Chi tiết
              </Button>
            </Space>
          );
        }

        if (record.maNhanVien === currentUser?.maNhanVien) {
          return (
            <Space size="small">
              <Tag color="orange">Đơn của bạn</Tag>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
                style={{ padding: 0 }}
              >
                Chi tiết
              </Button>
            </Space>
          );
        }

        const isManagerRequest = (record.tenChucVu || '').includes('Trưởng') || (record.tenChucVu || '').includes('Phó');

        if (isManagerRequest && !isOwner) {
          return (
            <Space size="small">
              <Tag color="purple">Cần Chủ DN duyệt</Tag>
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
                style={{ padding: 0 }}
              >
                Chi tiết
              </Button>
            </Space>
          );
        }

        const isResignation = record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc';
        const isHrManager = (myDeptName || '').includes('Nhân sự');

        if (isResignation) {
          if (!isOwner && !isHrManager) {
            return (
              <Space size="small">
                <Tag color="red">Chỉ phòng NS duyệt</Tag>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record)}
                  style={{ padding: 0 }}
                >
                  Chi tiết
                </Button>
              </Space>
            );
          }
        } else {
          if (!isOwner && !isSameDept(record)) {
            return (
              <Space size="small">
                <Tag color="default">Khác phòng ban</Tag>
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record)}
                  style={{ padding: 0 }}
                >
                  Chi tiết
                </Button>
              </Space>
            );
          }
        }

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAction(record, 'Đã duyệt')}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleAction(record, 'Từ chối')}
            >
              Từ chối
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
              style={{ padding: 0 }}
            >
              Chi tiết
            </Button>
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
            <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            {isOwner
              ? 'PHÊ DUYỆT ĐƠN TỪ TOÀN CÔNG TY (CHỦ DOANH NGHIỆP)'
              : `QUẢN LÝ & PHÊ DUYỆT ĐƠN TỪ - ${myDeptName ? myDeptName.toUpperCase() : 'PHÒNG BAN QUẢN LÝ'}`}
          </span>
        }
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
          <Col xs={24} lg={15}>
            <Space wrap size="middle">
              <Segmented
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as string)}
                options={[
                  {
                    label: (
                      <span style={{ fontWeight: 500, padding: '0 4px' }}>
                        ⏳ Chờ duyệt ({pendingCount})
                      </span>
                    ),
                    value: 'Chờ duyệt',
                  },
                  {
                    label: (
                      <span style={{ fontWeight: 500, padding: '0 4px' }}>
                        📋 Tất cả ({data.length})
                      </span>
                    ),
                    value: 'ALL',
                  },
                  {
                    label: (
                      <span style={{ fontWeight: 500, padding: '0 4px' }}>
                        ✅ Đã duyệt ({approvedCount})
                      </span>
                    ),
                    value: 'Đã duyệt',
                  },
                  {
                    label: (
                      <span style={{ fontWeight: 500, padding: '0 4px' }}>
                        ❌ Từ chối ({rejectedCount})
                      </span>
                    ),
                    value: 'Từ chối',
                  },
                ]}
              />

              {isOwner && (
                <Select
                  value={selectedPhongBan}
                  onChange={setSelectedPhongBan}
                  style={{ width: 220 }}
                >
                  <Select.Option value="ALL">Tất cả phòng ban</Select.Option>
                  {phongBans.map((pb) => (
                    <Select.Option key={pb.maPhongBan} value={pb.maPhongBan}>
                      {pb.tenPhongBan}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Space>
          </Col>
          <Col xs={24} lg={9} style={{ textAlign: 'right' }}>
            <Space wrap>
              {!isOwner && myDeptName && (
                <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
                  🏢 Đang quản lý: <strong>{myDeptName}</strong>
                </Tag>
              )}
              <Input
                placeholder="Tìm nhân viên, loại đơn, lý do..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={displayData}
          columns={columns}
          rowKey="maDon"
          loading={loading}
          scroll={{ x: 1350 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Tổng cộng ${t} đơn từ` }}
        />
      </Card>

      <Modal title={'Xử lý đơn của: ' + (selectedDon?.hoTen || '')} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <p>
            Nhân viên: <strong>{selectedDon?.hoTen}</strong> ({selectedDon?.tenChucVu || 'Nhân viên'} - {selectedDon?.tenPhongBan})
          </p>
          <p>
            Loại đơn: <strong>{selectedDon?.loaiDon}</strong>
            {selectedDon?.loaiDon === 'Nghỉ việc' || selectedDon?.loaiDon === 'Thôi việc' ? (
              <span> - Ngày thôi việc: <strong>{selectedDon?.ngayBatDau}</strong></span>
            ) : selectedDon?.loaiDon === 'Giải trình chấm công' ? (
              <span> - Ngày xác nhận công: <strong>{selectedDon?.ngayBatDau}</strong></span>
            ) : selectedDon?.loaiDon === 'Làm thêm giờ' || selectedDon?.loaiDon === 'Đăng ký tăng ca' || selectedDon?.loaiDon === 'Tăng ca' || selectedDon?.loaiDon === 'Đơn tăng ca' ? (
              <span> (Ngày: <strong>{selectedDon?.ngayBatDau}</strong> - Đăng ký: <Tag color="orange"><strong>{selectedDon?.soGio ?? selectedDon?.soNgayNghi} giờ OT</strong></Tag>)</span>
            ) : (
              <span> ({selectedDon?.soNgayNghi} ngày: từ {selectedDon?.ngayBatDau} đến {selectedDon?.ngayKetThuc})</span>
            )}.
          </p>
          <p>Lý do: <em>"{selectedDon?.lyDo}"</em></p>

          <Form.Item name="trangThai" label="Quyết định phê duyệt" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Đã duyệt">Chấp thuận (Đã duyệt)</Select.Option>
              <Select.Option value="Từ chối">Từ chối đơn</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="ghiChuDuyet" label="Ghi chú / Lý do phản hồi">
            <Input.TextArea rows={3} placeholder="Nhập lý do hoặc lời dặn..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Xác nhận
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <span style={{ fontSize: 17, fontWeight: 600 }}>
            <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            CHI TIẾT ĐƠN TỪ
          </span>
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedDetailDon(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={680}
        destroyOnClose
      >
        {selectedDetailDon && (
          <div>
            {selectedDetailDon.trangThai === 'Đã duyệt' ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined style={{ fontSize: 20 }} />}
                message={<span style={{ fontWeight: 600 }}>ĐƠN ĐÃ ĐƯỢC PHÊ DUYỆT</span>}
                description={
                  selectedDetailDon.loaiDon === 'Làm thêm giờ' || selectedDetailDon.loaiDon === 'Đăng ký tăng ca' || selectedDetailDon.loaiDon === 'Tăng ca' || selectedDetailDon.loaiDon === 'Đơn tăng ca'
                    ? `Đơn tăng ca đã được cấp trên phê duyệt. Hệ thống đã cộng trực tiếp ${selectedDetailDon.soGio ?? selectedDetailDon.soNgayNghi} giờ OT vào dữ liệu chấm công ngày ${dayjs(selectedDetailDon.ngayBatDau).format('DD/MM/YYYY')}.`
                    : selectedDetailDon.loaiDon === 'Giải trình chấm công'
                    ? 'Đơn giải trình đã được cấp trên chấp thuận. Giờ ra đã cập nhật thành 17:00 và khôi phục 1.0 ngày công.'
                    : selectedDetailDon.loaiDon === 'Nghỉ việc' || selectedDetailDon.loaiDon === 'Thôi việc'
                    ? 'Đơn thôi việc đã được phê duyệt. Hợp đồng lao động đã thanh lý theo quy định.'
                    : 'Đơn xin nghỉ đã được cấp trên phê duyệt và ghi nhận vào hồ sơ chấm công / tính lương.'
                }
                style={{ marginBottom: 18 }}
              />
            ) : selectedDetailDon.trangThai === 'Từ chối' ? (
              <Alert
                type="error"
                showIcon
                icon={<CloseCircleOutlined style={{ fontSize: 20 }} />}
                message={<span style={{ fontWeight: 600 }}>ĐƠN ĐÃ BỊ TỪ CHỐI</span>}
                description="Cấp trên đã từ chối yêu cầu này. Vui lòng xem ý kiến/ghi chú phản hồi bên dưới."
                style={{ marginBottom: 18 }}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                icon={<ClockCircleOutlined style={{ fontSize: 20 }} />}
                message={<span style={{ fontWeight: 600 }}>ĐƠN ĐANG CHỜ PHÊ DUYỆT</span>}
                description="Đơn từ đang chờ được cấp trên có thẩm quyền xem xét quyết định."
                style={{ marginBottom: 18 }}
              />
            )}

            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 2 }}>
              <Descriptions.Item label="Mã đơn" span={2}>
                <Text code copyable>{selectedDetailDon.maDon}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại đơn">
                <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>{selectedDetailDon.loaiDon}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag
                  color={selectedDetailDon.trangThai === 'Đã duyệt' ? 'green' : selectedDetailDon.trangThai === 'Từ chối' ? 'red' : 'gold'}
                  style={{ fontSize: 13, padding: '2px 8px' }}
                >
                  {selectedDetailDon.trangThai}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nhân viên làm đơn">
                <strong>{selectedDetailDon.hoTen}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Phòng ban / Chức vụ">
                {selectedDetailDon.tenPhongBan || 'Chưa gán'} • {selectedDetailDon.tenChucVu || 'Nhân viên'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian áp dụng" span={2}>
                {selectedDetailDon.loaiDon === 'Nghỉ việc' || selectedDetailDon.loaiDon === 'Thôi việc' ? (
                  <span>Ngày chính thức thôi việc: <strong>{dayjs(selectedDetailDon.ngayBatDau).format('DD/MM/YYYY')}</strong></span>
                ) : selectedDetailDon.loaiDon === 'Giải trình chấm công' ? (
                  <span>Ngày xác nhận chấm công: <strong>{dayjs(selectedDetailDon.ngayBatDau).format('DD/MM/YYYY')}</strong></span>
                ) : selectedDetailDon.loaiDon === 'Làm thêm giờ' || selectedDetailDon.loaiDon === 'Đăng ký tăng ca' || selectedDetailDon.loaiDon === 'Tăng ca' || selectedDetailDon.loaiDon === 'Đơn tăng ca' ? (
                  <span>
                    Ngày làm thêm giờ: <strong>{dayjs(selectedDetailDon.ngayBatDau).format('DD/MM/YYYY')}</strong> • Số giờ đăng ký OT:{' '}
                    <Tag color="orange"><strong>{selectedDetailDon.soGio ?? selectedDetailDon.soNgayNghi} giờ OT</strong></Tag>
                  </span>
                ) : (
                  <span>
                    Từ <strong>{dayjs(selectedDetailDon.ngayBatDau).format('DD/MM/YYYY')}</strong> đến{' '}
                    <strong>{dayjs(selectedDetailDon.ngayKetThuc).format('DD/MM/YYYY')}</strong> (
                    <strong>{selectedDetailDon.soNgayNghi} ngày</strong>)
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Lý do chi tiết" span={2}>
                <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  {selectedDetailDon.lyDo}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {(selectedDetailDon.trangThai === 'Đã duyệt' || selectedDetailDon.trangThai === 'Từ chối') && (
              <div style={{ marginTop: 18 }}>
                <Divider titlePlacement="start" style={{ margin: '14px 0 12px 0', fontSize: 14 }}>
                  <SafetyCertificateOutlined style={{ color: selectedDetailDon.trangThai === 'Đã duyệt' ? '#52c41a' : '#ff4d4f', marginRight: 6 }} />
                  THÔNG TIN XÉT DUYỆT CỦA CẤP TRÊN
                </Divider>
                <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 2 }}>
                  <Descriptions.Item label="Cấp trên xét duyệt">
                    <strong style={{ color: '#1677ff' }}>{selectedDetailDon.tenNguoiDuyet || 'Hệ thống / Quản lý'}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày xét duyệt">
                    {selectedDetailDon.ngayDuyet ? dayjs(selectedDetailDon.ngayDuyet).format('DD/MM/YYYY') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ý kiến / Ghi chú phản hồi" span={2}>
                    <div
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontStyle: selectedDetailDon.ghiChuDuyet ? 'normal' : 'italic',
                        color: selectedDetailDon.ghiChuDuyet ? '#262626' : '#8c8c8c',
                        background: selectedDetailDon.trangThai === 'Đã duyệt' ? '#f6ffed' : '#fff1f0',
                        border: selectedDetailDon.trangThai === 'Đã duyệt' ? '1px solid #b7eb8f' : '1px solid #ffa39e',
                        padding: '10px 14px',
                        borderRadius: 6,
                      }}
                    >
                      {selectedDetailDon.ghiChuDuyet || 'Không có ghi chú thêm từ cấp trên.'}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
