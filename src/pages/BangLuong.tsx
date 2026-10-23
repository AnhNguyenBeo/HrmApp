import React, { useEffect, useState } from 'react';
import { Card, Table, Button, message, Space, Modal, Descriptions, Tag, DatePicker, Row, Col, Divider } from 'antd';
import { DownloadOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { BangLuong } from '../types';
import dayjs from 'dayjs';

export const BangLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<BangLuong | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  const [exportMonth, setExportMonth] = useState<dayjs.Dayjs>(dayjs());
  const [exportYear, setExportYear] = useState<dayjs.Dayjs>(dayjs());

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await bangLuongApi.getMine();
      setData(res.data);
    } catch {
      message.error('Không thể tải bảng lương cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportMonth = async () => {
    const monthStr = exportMonth.format('MM/YYYY');
    try {
      const res = await exportApi.exportBangLuong(monthStr);
      downloadFile(res.data, 'BangLuong_Thang_' + monthStr.replace('/', '_') + '.csv');
      message.success('Đã tải bảng lương tháng ' + monthStr);
    } catch {
      message.error('Không thể xuất bảng lương tháng.');
    }
  };

  const handleExportYear = async () => {
    const yearVal = exportYear.year();
    try {
      const res = await exportApi.exportBangLuong(undefined, yearVal);
      downloadFile(res.data, 'BangLuong_Nam_' + yearVal + '.csv');
      message.success('Đã tải bảng lương cả năm ' + yearVal);
    } catch {
      message.error('Không thể xuất bảng lương năm.');
    }
  };

  const downloadFile = (blobData: any, filename: string) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    { title: 'Kỳ lương', dataIndex: 'thoiGian', key: 'thoiGian', render: (val: string) => <strong>{val}</strong> },
    {
      title: 'Lương cơ bản',
      dataIndex: 'luongCoBan',
      key: 'luongCoBan',
      render: (val: number) => (val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'),
    },
    {
      title: 'Ngày công',
      dataIndex: 'soNgayCong',
      key: 'soNgayCong',
      render: (val: number, record: BangLuong) => (val || 0) + ' / ' + (record.ngayCongChuan || 22) + ' ngày',
    },
    {
      title: 'Lương OT',
      dataIndex: 'luongOt',
      key: 'luongOt',
      render: (val: number, record: BangLuong) =>
        val ? (
          <span>
            {val.toLocaleString('vi-VN')} đ <small style={{ color: '#888' }}>({record.tongGioOt || 0}h)</small>
          </span>
        ) : (
          '0 đ'
        ),
    },
    {
      title: 'Khấu trừ BHXH',
      dataIndex: 'baoHiemXaHoi',
      key: 'baoHiemXaHoi',
      render: (val: number) => <span style={{ color: '#fa8c16' }}>-{val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>,
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'thueTncn',
      key: 'thueTncn',
      render: (val: number) => <span style={{ color: '#f5222d' }}>-{val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>,
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'thucLinh',
      key: 'thucLinh',
      render: (val: number) => (
        <strong style={{ color: '#52c41a', fontSize: 16 }}>
          {val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}
        </strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThaiChiTra',
      key: 'trangThaiChiTra',
      render: (val: string) => <Tag color={val === 'Đã chi trả' ? 'green' : 'blue'}>{val || 'Chờ duyệt'}</Tag>,
    },
    {
      title: 'Chi tiết',
      key: 'action',
      render: (_: any, record: BangLuong) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedSlip(record);
            setDetailModal(true);
          }}
        >
          Cách tính
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="In / Tải bảng lương THEO THÁNG">
            <Space>
              <DatePicker picker="month" value={exportMonth} onChange={(v) => v && setExportMonth(v)} format="MM/YYYY" />
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportMonth}>
                Tải bảng lương tháng
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="In / Tải bảng lương THEO NĂM">
            <Space>
              <DatePicker picker="year" value={exportYear} onChange={(v) => v && setExportYear(v)} format="YYYY" />
              <Button icon={<DownloadOutlined />} onClick={handleExportYear}>
                Tải bảng lương năm
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="LỊCH SỬ BẢNG LƯƠNG CỦA TÔI">
        <Table dataSource={data} columns={columns} rowKey="maBangLuong" loading={loading} />
      </Card>
      <Modal
        title={'CHI TIẾT CÁCH TÍNH LƯƠNG KỲ: ' + (selectedSlip?.thoiGian || '')}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            In phiếu lương này
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailModal(false)}>
            Đóng
          </Button>,
        ]}
        width={650}
      >
        {selectedSlip && (
          <div>
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Nhân viên">{selectedSlip.hoTen}</Descriptions.Item>
              <Descriptions.Item label="Kỳ lương">{selectedSlip.thoiGian}</Descriptions.Item>
              <Descriptions.Item label="1. Lương cơ bản theo hợp đồng">
                <strong>{selectedSlip.luongCoBan?.toLocaleString('vi-VN')} đ</strong>
              </Descriptions.Item>
              <Descriptions.Item label="2. Ngày công chuẩn quy định">
                {(selectedSlip.ngayCongChuan || 22)} ngày
              </Descriptions.Item>
              <Descriptions.Item label="3. Số ngày công thực tế làm việc">
                <strong>{(selectedSlip.soNgayCong || 0)} ngày</strong>
              </Descriptions.Item>
              <Descriptions.Item label="4. Tiền lương theo ngày công">
                {selectedSlip.ngayCongChuan
                  ? Math.round(((selectedSlip.luongCoBan || 0) / selectedSlip.ngayCongChuan) * (selectedSlip.soNgayCong || 0)).toLocaleString('vi-VN')
                  : 0}{' '}
                đ <em>(Công thức: Lương cơ bản ÷ 22 × Số ngày công)</em>
              </Descriptions.Item>
              <Descriptions.Item label="5. Tăng ca (OT)">
                {(selectedSlip.tongGioOt || 0)} giờ ➔ <strong>+{selectedSlip.luongOt?.toLocaleString('vi-VN')} đ</strong>{' '}
                <em>(Công thức: Tiền lương giờ × Giờ OT × 1.5)</em>
              </Descriptions.Item>
              <Descriptions.Item label="6. Khấu trừ Bảo hiểm xã hội (10.5%)">
                <span style={{ color: '#fa8c16' }}>
                  -{selectedSlip.baoHiemXaHoi?.toLocaleString('vi-VN')} đ
                </span>{' '}
                <em>(Gồm 8% BHXH + 1.5% BHYT + 1% BHTN)</em>
              </Descriptions.Item>
              <Descriptions.Item label="7. Thuế Thu nhập cá nhân (TNCN)">
                <span style={{ color: '#f5222d' }}>
                  -{selectedSlip.thueTncn ? selectedSlip.thueTncn.toLocaleString('vi-VN') : 0} đ
                </span>{' '}
                <em>(Áp dụng biểu thuế lũy tiến từng phần sau giảm trừ gia cảnh 11 triệu)</em>
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <div style={{ textAlign: 'right', fontSize: 18 }}>
              <span>LƯƠNG THỰC LĨNH (NET): </span>
              <strong style={{ color: '#52c41a', fontSize: 24 }}>
                {selectedSlip.thucLinh?.toLocaleString('vi-VN')} VNĐ
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
