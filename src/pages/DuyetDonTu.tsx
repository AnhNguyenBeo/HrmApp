import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Row, Col, Segmented } from 'antd';
import { CheckOutlined, CloseOutlined, FileTextOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import { donTuApi } from '../api/donTuApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { danhMucApi, PhongBan } from '../api/danhMucApi';
import { DonTu } from '../types';

export const DuyetDonTuPage: React.FC = () => {
  const [data, setData] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDon, setSelectedDon] = useState<DonTu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
    { title: 'Nhân viên gửi', dataIndex: 'hoTen', key: 'hoTen', render: (val: string) => <strong>{val}</strong> },
    {
      title: 'Chức vụ',
      dataIndex: 'tenChucVu',
      key: 'tenChucVu',
      render: (val: string) => {
        let color = 'default';
        if (val?.includes('Chủ doanh nghiệp') || val?.includes('Giám đốc')) color = 'gold';
        else if (val?.includes('Trưởng')) color = 'blue';
        else if (val?.includes('Phó')) color = 'cyan';
        return <Tag color={color}>{val || 'Nhân viên'}</Tag>;
      },
    },
    { title: 'Phòng ban', dataIndex: 'tenPhongBan', key: 'tenPhongBan', render: (val: string) => <Tag color="blue">{val || 'Chưa gán'}</Tag> },
    {
      title: 'Loại đơn',
      dataIndex: 'loaiDon',
      key: 'loaiDon',
      render: (val: string) => {
        let color = 'blue';
        if (val === 'Nghỉ việc') color = 'red';
        if (val === 'Thai sản') color = 'purple';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    { title: 'Từ ngày', dataIndex: 'ngayBatDau', key: 'ngayBatDau' },
    { title: 'Đến ngày', dataIndex: 'ngayKetThuc', key: 'ngayKetThuc' },
    { title: 'Số ngày', dataIndex: 'soNgayNghi', key: 'soNgayNghi', render: (val: number) => <strong>{val} ngày</strong> },
    { title: 'Lý do', dataIndex: 'lyDo', key: 'lyDo' },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      render: (val: string) => {
        let color = 'gold';
        if (val === 'Đã duyệt') color = 'green';
        if (val === 'Từ chối') color = 'red';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    { title: 'Người duyệt', dataIndex: 'tenNguoiDuyet', key: 'tenNguoiDuyet', render: (val: string) => val || '-' },
    {
      title: 'Thao tác phê duyệt',
      key: 'action',
      render: (_: any, record: DonTu) => {
        if (record.trangThai !== 'Chờ duyệt') {
          return <Tag color={record.trangThai === 'Đã duyệt' ? 'green' : 'red'}>Đã hoàn tất ({record.trangThai})</Tag>;
        }

        if (record.maNhanVien === currentUser?.maNhanVien) {
          return <Tag color="orange">Đơn của bạn (Chờ cấp trên duyệt)</Tag>;
        }

        const isManagerRequest = (record.tenChucVu || '').includes('Trưởng') || (record.tenChucVu || '').includes('Phó');

        if (isManagerRequest && !isOwner) {
          return <Tag color="purple">Cần Chủ doanh nghiệp duyệt</Tag>;
        }

        if (!isOwner && !isSameDept(record)) {
          return <Tag color="default">Khác phòng ban</Tag>;
        }

        return (
          <Space>
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

        <Table dataSource={displayData} columns={columns} rowKey="maDon" loading={loading} />
      </Card>

      <Modal title={'Xử lý đơn của: ' + (selectedDon?.hoTen || '')} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <p>
            Nhân viên: <strong>{selectedDon?.hoTen}</strong> ({selectedDon?.tenChucVu || 'Nhân viên'} - {selectedDon?.tenPhongBan})
          </p>
          <p>
            Loại đơn: <strong>{selectedDon?.loaiDon}</strong> ({selectedDon?.soNgayNghi} ngày: từ {selectedDon?.ngayBatDau} đến {selectedDon?.ngayKetThuc}).
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
    </div>
  );
};
