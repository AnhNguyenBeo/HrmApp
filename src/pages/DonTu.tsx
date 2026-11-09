import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Select, DatePicker, Input, Tag, message, Popconfirm, Alert, Space, Typography, Row, Col, Descriptions, Divider, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, CalendarOutlined, SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined, FileTextOutlined } from '@ant-design/icons';
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailDon, setSelectedDetailDon] = useState<DonTu | null>(null);
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
  const isOt = selectedLoaiDon === 'Làm thêm giờ' || selectedLoaiDon === 'Đăng ký tăng ca' || selectedLoaiDon === 'Tăng ca' || selectedLoaiDon === 'Đơn tăng ca';

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
      const isOvertime = values.loaiDon === 'Làm thêm giờ' || values.loaiDon === 'Đăng ký tăng ca' || values.loaiDon === 'Tăng ca' || values.loaiDon === 'Đơn tăng ca';
      let startDate: string;
      let endDate: string;

      if (isResignation || isAttendanceAdjustment || isOvertime) {
        if (!values.singleDate) {
          message.error(isOvertime ? 'Vui lòng chọn ngày làm thêm giờ!' : isAttendanceAdjustment ? 'Vui lòng chọn ngày cần xác nhận chấm công!' : 'Vui lòng chọn ngày nghỉ việc!');
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
        soGio: isOvertime ? Number(values.soGio) || 1 : undefined,
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

  const handleViewDetail = (record: DonTu) => {
    setSelectedDetailDon(record);
    setDetailModalOpen(true);
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
          {record.loaiDon === 'Nghỉ việc' || record.loaiDon === 'Thôi việc' || record.loaiDon === 'Giải trình chấm công' || record.loaiDon === 'Làm thêm giờ' || record.loaiDon === 'Đăng ký tăng ca' ? '-' : val}
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
      width: 140,
      align: 'center' as const,
      render: (_: any, record: DonTu) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            style={{ padding: 0 }}
          >
            Chi tiết
          </Button>
          {record.trangThai === 'Chờ duyệt' && (
            <Popconfirm title="Bạn có chắc chắn muốn hủy đơn này?" onConfirm={() => handleCancel(record.maDon)}>
              <Button danger icon={<DeleteOutlined />} size="small" type="text" style={{ padding: 0 }}>
                Hủy
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
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
              onChange={() => form.setFieldsValue({ dates: undefined, singleDate: undefined, maternityStartDate: undefined, soGio: 2 })}
            >
              <Select.Option value="Nghỉ phép">Nghỉ phép thường niên (Hạn mức 12 ngày/năm)</Select.Option>
              <Select.Option value="Nghỉ ốm">Nghỉ ốm đau / Khám bệnh</Select.Option>
              <Select.Option value="Làm thêm giờ">Đăng ký làm thêm giờ (Tăng ca / OT)</Select.Option>
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
          ) : isOt ? (
            <div>
              <Form.Item
                name="singleDate"
                label="Ngày làm thêm giờ (OT)"
                rules={[{ required: true, message: 'Vui lòng chọn ngày làm thêm giờ!' }]}
                extra={<Text type="secondary">Đơn sau khi được phê duyệt sẽ cộng trực tiếp vào giờ OT trên bảng chấm công.</Text>}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày làm thêm giờ" />
              </Form.Item>
              <Form.Item
                name="soGio"
                label="Số giờ tăng ca đăng ký"
                rules={[
                  { required: true, message: 'Vui lòng nhập số giờ tăng ca!' },
                  { type: 'number', min: 0.5, max: 12, message: 'Số giờ tăng ca từ 0.5 đến 12 giờ!' }
                ]}
                initialValue={2}
                extra={<Text type="secondary">Nhập số giờ OT dự kiến làm thêm (tối thiểu 0.5 giờ, bước nhảy 0.5 giờ).</Text>}
              >
                <InputNumber style={{ width: '100%' }} min={0.5} max={12} step={0.5} addonAfter="giờ OT" placeholder="Ví dụ: 2, 2.5, 3" />
              </Form.Item>
            </div>
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
                description="Đơn từ đang được chuyển tới cấp trên quản lý trực tiếp để xem xét phê duyệt."
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
              <Descriptions.Item label="Người nộp">
                <strong>{selectedDetailDon.hoTen || currentUser?.hoTen || 'Cá nhân'}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Phòng ban / Chức vụ">
                {selectedDetailDon.tenPhongBan || currentUser?.tenPhongBan || 'Chưa gán'} • {selectedDetailDon.tenChucVu || currentUser?.tenChucVu || 'Nhân viên'}
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