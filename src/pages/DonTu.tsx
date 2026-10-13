import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Select, DatePicker, Input, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { donTuApi } from '../api/donTuApi';
import { DonTu } from '../types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

export const DonTuPage: React.FC = () => {
  const [data, setData] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await donTuApi.getMine();
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

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        loaiDon: values.loaiDon,
        loaiNghi: values.loaiNghi,
        ngayBatDau: values.dates[0].format('YYYY-MM-DD'),
        ngayKetThuc: values.dates[1].format('YYYY-MM-DD'),
        lyDo: values.lyDo,
      };
      await donTuApi.create(payload);
      message.success('Gửi đơn từ thành công!');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Gửi đơn thất bại.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await donTuApi.cancel(id);
      message.success('Đã hủy đơn thành công!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Hủy đơn thất bại.');
    }
  };

  const columns = [
    { title: 'Loại đơn', dataIndex: 'loaiDon', key: 'loaiDon' },
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
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: DonTu) =>
        record.trangThai === 'Chờ duyệt' ? (
          <Popconfirm title="Bạn có chắc chắn muốn hủy đơn này?" onConfirm={() => handleCancel(record.maDon)}>
            <Button danger icon={<DeleteOutlined />} size="small">
              Hủy đơn
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <Card
        title="DANH SÁCH ĐƠN TỪ CỦA TÔI"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Nộp đơn mới
          </Button>
        }
      >
        <Table dataSource={data} columns={columns} rowKey="maDon" loading={loading} />
      </Card>

      <Modal title="Tạo đơn xin nghỉ" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="loaiDon" label="Loại đơn" rules={[{ required: true, message: 'Vui lòng chọn loại đơn!' }]}>
            <Select placeholder="Chọn loại đơn">
              <Select.Option value="Nghỉ phép">Nghỉ phép thường niên (Hạn mức 12 ngày/năm)</Select.Option>
              <Select.Option value="Nghỉ ốm">Nghỉ ốm đau / Khám bệnh</Select.Option>
              <Select.Option value="Thai sản">Nghỉ thai sản</Select.Option>
              <Select.Option value="Nghỉ việc">Đơn xin nghỉ việc / Thôi việc</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dates" label="Thời gian nghỉ" rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ!' }]}>
            <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="lyDo" label="Lý do chi tiết" rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
            <TextArea rows={4} placeholder="Nhập lý do xin nghỉ..." />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Gửi đơn
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};