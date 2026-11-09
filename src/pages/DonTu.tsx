import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Select, DatePicker, Input, Tag, message, Popconfirm, Alert, Space, Typography, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { donTuApi } from '../api/donTuApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { DonTu } from '../types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Text } = Typography;

export const DonTuPage: React.FC = () => {
  const [data, setData] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [form] = Form.useForm();

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const [userGender, setUserGender] = useState<string>(currentUser?.gioiTinh || '');

  const selectedDates = Form.useWatch('dates', form);
  const selectedLoaiDon = Form.useWatch('loaiDon', form);
  const selectedMaternityStart = Form.useWatch('maternityStartDate', form);
  const isResign = selectedLoaiDon === 'Nghỉ việc' || selectedLoaiDon === 'Thôi việc';
  const isMaternity = selectedLoaiDon === 'Thai sản' || selectedLoaiDon === 'Nghỉ thai sản';
  const isAttendanceAdjustment = selectedLoaiDon === 'Giải trình chấm công';

  const currentYear = dayjs().year();

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
    if (currentUser?.maNhanVien && !currentUser?.gioiTinh) {
      nhanVienApi.getById(currentUser.maNhanVien).then((res) => {
        if (res.data?.gioiTinh) {
          setUserGender(res.data.gioiTinh);
          const updated = { ...currentUser, gioiTinh: res.data.gioiTinh };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }).catch(() => {});
    }
  }, []);

  const usedAnnualLeave = data
    .filter(
      (d) =>
        (d.loaiDon === 'Nghỉ phép' || d.loaiDon === 'Nghỉ phép năm') &&
        d.trangThai === 'Đã duyệt' &&
        dayjs(d.ngayBatDau).year() === currentYear
    )
    .reduce((sum, d) => sum + (d.soNgayNghi || 0), 0);

  const remainingAnnualLeave = Math.max(0, 12 - usedAnnualLeave);

  const getEstimatedDays = (dates: [Dayjs, Dayjs] | undefined, type: string) => {
    if (!dates || !dates[0] || !dates[1]) return 0;
    const start = dates[0];
    const end = dates[1];

    if (type === 'Thai sản') {
      return end.diff(start, 'day') + 1;
    }

    let count = 0;
    let curr = start.clone();
    while (curr.isBefore(end) || curr.isSame(end, 'day')) {
      const day = curr.day();
      if (day !== 0 && day !== 6) {
        count++;
      }
      curr = curr.add(1, 'day');
    }
    return count;
  };

  const estimatedDays = getEstimatedDays(selectedDates, selectedLoaiDon);

  const handleCreate = async (values: any) => {
    try {
      const isResignation = values.loaiDon === 'Nghỉ việc' || values.loaiDon === 'Thôi việc';
      const isAttendanceAdjustment = values.loaiDon === 'Giải trình chấm công';
      const isMaternityLeave = values.loaiDon === 'Thai sản' || values.loaiDon === 'Nghỉ thai sản';
      let startDate: string;
      let endDate: string;

      if (isResignation || isAttendanceAdjustment) {
        if (!values.singleDate) {
          message.error(isAttendanceAdjustment ? 'Vui lòng chọn ngày cần xác nhận chấm công!' : 'Vui lòng chọn ngày nghỉ việc!');
          return;
        }
        startDate = values.singleDate.format('YYYY-MM-DD');
        endDate = startDate;
      } else if (isMaternityLeave) {
        if (!values.maternityStartDate) {
          message.error('Vui lòng chọn ngày bắt đầu nghỉ thai sản!');
          return;
        }
        startDate = values.maternityStartDate.format('YYYY-MM-DD');
        endDate = values.maternityStartDate.add(179, 'day').format('YYYY-MM-DD');
      } else {
        if (!values.dates || !values.dates[0] || !values.dates[1]) {
          message.error('Vui lòng chọn thời gian nghỉ!');
          return;
        }
        startDate = values.dates[0].format('YYYY-MM-DD');
        endDate = values.dates[1].format('YYYY-MM-DD');
      }

      const payload = {
        loaiDon: values.loaiDon,
        loaiNghi: values.loaiDon,
        ngayBatDau: startDate,
        ngayKetThuc: endDate,
        lyDo: values.lyDo,
      };
      await donTuApi.create(payload);
      message.success('Gửi đơn từ thành công!');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Gửi đơn thất bại.';
      message.error(msg);
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
    { title: 'Loại đơn', dataIndex: 'loaiDon', key: 'loaiDon', width: 140 },
    {
      title: 'Từ ngày',
      dataIndex: 'ngayBatDau',
      key: 'ngayBatDau',
      width: 120,
      render: (val: string) => <span style={{ whiteSpace: 'nowrap' }}>{val}</span>,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'ngayKetThuc',
      key: 'ngayKetThuc',
      width: 120,
      render: (val: string, record: DonTu) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc' || record.loaiDon === 'Giải trình chấm công' ? '-' : val}
        </span>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'soNgayNghi',
      key: 'soNgayNghi',
      width: 100,
      render: (val: number, record: DonTu) =>
        record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc' || record.loaiDon === 'Giải trình chấm công' ? (
          <span style={{ color: '#888' }}>-</span>
        ) : (
          <strong>{val} ngày</strong>
        ),
    },
    { title: 'Lý do', dataIndex: 'lyDo', key: 'lyDo', ellipsis: true },
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
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'center' as const,
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

  const filteredData = data.filter((item) => {
    if (statusFilter !== 'ALL' && item.trangThai !== statusFilter) return false;
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.loaiDon || '').toLowerCase().includes(kw) ||
      (item.lyDo || '').toLowerCase().includes(kw) ||
      (item.trangThai || '').toLowerCase().includes(kw) ||
      (item.ngayBatDau || '').toLowerCase().includes(kw) ||
      (item.ngayKetThuc || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Alert
        message={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap' }}>
            <span>
              <CalendarOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              <strong>Hạn mức nghỉ phép năm {currentYear}:</strong> Tổng tiêu chuẩn: <strong>12 ngày</strong> | Đã duyệt:{' '}
              <Tag color="orange"><strong>{usedAnnualLeave} ngày</strong></Tag> | Còn lại:{' '}
              <Tag color="green"><strong>{remainingAnnualLeave} ngày</strong></Tag>
            </span>
          </div>
        }
        type="info"
        showIcon
      />

      <Card
        title="DANH SÁCH ĐƠN TỪ CỦA TÔI"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Nộp đơn mới
          </Button>
        }
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
          <Col xs={24} sm={16}>
            <Space wrap>
              <Input
                placeholder="Tìm theo lý do, loại đơn, ngày..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: 260 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
              >
                <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
                <Select.Option value="Chờ duyệt">Chờ duyệt</Select.Option>
                <Select.Option value="Đã duyệt">Đã duyệt</Select.Option>
                <Select.Option value="Từ chối">Từ chối</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <span style={{ color: '#888', fontSize: 13 }}>
              Hiển thị: <strong>{filteredData.length}</strong> / {data.length} đơn
            </span>
          </Col>
        </Row>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="maDon"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Tổng cộng ${t} đơn từ` }}
        />
      </Card>

      <Modal
        title="Tạo đơn xin nghỉ"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        {selectedLoaiDon === 'Nghỉ phép' && (
          <Alert
            style={{ marginBottom: 16 }}
            message={`Quỹ phép năm: Đã duyệt ${usedAnnualLeave}/12 ngày. Bạn còn lại ${remainingAnnualLeave} ngày phép.`}
            type={remainingAnnualLeave > 0 ? 'info' : 'warning'}
            showIcon
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="loaiDon"
            label="Loại đơn"
            rules={[
              { required: true, message: 'Vui lòng chọn loại đơn!' },
              {
                validator: (_, value) => {
                  if ((value === 'Thai sản' || value === 'Nghỉ thai sản') && userGender === 'Nam') {
                    return Promise.reject(new Error('Nhân viên nam không được phép nộp đơn xin nghỉ thai sản!'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              placeholder="Chọn loại đơn"
              onChange={() => form.setFieldsValue({ dates: undefined, singleDate: undefined, maternityStartDate: undefined })}
            >
              <Select.Option value="Nghỉ phép">Nghỉ phép thường niên (Hạn mức 12 ngày/năm)</Select.Option>
              <Select.Option value="Nghỉ ốm">Nghỉ ốm đau / Khám bệnh</Select.Option>
              <Select.Option value="Giải trình chấm công">Giải trình / Xác nhận quên check-out</Select.Option>
              {userGender !== 'Nam' && (
                <Select.Option value="Thai sản">Nghỉ thai sản (180 ngày)</Select.Option>
              )}
              <Select.Option value="Nghỉ việc">Đơn xin nghỉ việc / Thôi việc</Select.Option>
            </Select>
          </Form.Item>

          {isResign ? (
            <Form.Item
              name="singleDate"
              label="Ngày nghỉ việc (Chính thức thôi việc)"
              rules={[{ required: true, message: 'Vui lòng chọn ngày nghỉ việc!' }]}
              extra={<Text type="secondary">Chỉ chọn đúng 1 ngày bắt đầu chính thức nghỉ việc.</Text>}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày nghỉ việc" />
            </Form.Item>
          ) : isAttendanceAdjustment ? (
            <Form.Item
              name="singleDate"
              label="Ngày quên check-out (Cần xác nhận lại công)"
              rules={[{ required: true, message: 'Vui lòng chọn ngày quên check-out!' }]}
              extra={<Text type="secondary">Sau khi cấp trên duyệt đơn, hệ thống sẽ tự động cập nhật giờ ra và tính đủ 1.0 công.</Text>}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày cần xác nhận chấm công" />
            </Form.Item>
          ) : isMaternity ? (
            <div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="maternityStartDate"
                    label="Ngày bắt đầu nghỉ thai sản"
                    rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu nghỉ thai sản!' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày bắt đầu" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Ngày kết thúc nghỉ (Mặc định 180 ngày)">
                    <Input
                      value={selectedMaternityStart ? selectedMaternityStart.add(179, 'day').format('DD/MM/YYYY') : '-'}
                      disabled
                      prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {selectedMaternityStart && (
                <Alert
                  type="success"
                  showIcon
                  message={`Thời gian nghỉ thai sản: 180 ngày (tính từ ${selectedMaternityStart.format('DD/MM/YYYY')} đến hết ngày ${selectedMaternityStart.add(179, 'day').format('DD/MM/YYYY')}).`}
                  style={{ marginBottom: 16 }}
                />
              )}
            </div>
          ) : (
            <Form.Item
              name="dates"
              label="Thời gian nghỉ (Từ ngày - Đến ngày)"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian nghỉ!' }]}
              extra={
                selectedDates && selectedDates[0] && selectedDates[1] ? (
                  <div style={{ marginTop: 8 }}>
                    {estimatedDays > 0 ? (
                      <Text type="success">
                        ✓ Đăng ký: <strong>{estimatedDays} ngày</strong> (chỉ tính ngày làm việc T2 - T6)
                      </Text>
                    ) : (
                      <Text type="danger">
                        ⚠️ Khoảng thời gian đã chọn rơi vào thứ 7 / chủ nhật (không có ngày làm việc hợp lệ)!
                      </Text>
                    )}
                    {selectedLoaiDon === 'Nghỉ phép' && usedAnnualLeave + estimatedDays > 12 && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="danger">
                          ⚠️ Cảnh báo: Tổng ngày nghỉ ({usedAnnualLeave + estimatedDays} ngày) sẽ vượt quá hạn mức 12 ngày/năm!
                        </Text>
                      </div>
                    )}
                  </div>
                ) : null
              }
            >
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          )}

          <Form.Item name="lyDo" label="Lý do chi tiết" rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
            <TextArea rows={4} placeholder="Nhập lý do xin nghỉ cụ thể..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
              }}
            >
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