import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons';
import { donTuApi } from '../api/donTuApi';
import { DonTu } from '../types';

export const DuyetDonTuPage: React.FC = () => {
  const [data, setData] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDon, setSelectedDon] = useState<DonTu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await donTuApi.getAll();
      setData(res.data);
    } catch {
      message.error('Không thể tải danh sách đơn từ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    { title: 'Ghi chú duyệt', dataIndex: 'ghiChuDuyet', key: 'ghiChuDuyet', render: (val: string) => val || '-' },
    {
      title: 'Thao tác (Quản lý)',
      key: 'action',
      render: (_: any, record: DonTu) =>
        record.trangThai === 'Chờ duyệt' ? (
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
        ) : (
          <span style={{ color: '#8c8c8c' }}>Đã xử lý</span>
        ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            PHÊ DUYỆT ĐƠN TỪ NHÂN SỰ (NGHỈ PHÉP / NGHỈ VIỆC)
          </span>
        }
      >
        <Table dataSource={data} columns={columns} rowKey="maDon" loading={loading} />
      </Card>

      <Modal title={'Xử lý đơn của: ' + (selectedDon?.hoTen || '')} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
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
