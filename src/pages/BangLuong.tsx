import React, { useEffect, useState } from 'react';
import { Card, Table, Button, message, Space, Modal, Descriptions, Tag, DatePicker, Row, Col, Divider, Input } from 'antd';
import { DownloadOutlined, EyeOutlined, PrinterOutlined, SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { BangLuong } from '../types';
import { formatVND, formatDeductionVND } from '../utils/format';
import { exportBangLuongToExcel, printPayrollTable, printSinglePaySlip } from '../utils/salaryPrintExport';
import dayjs from 'dayjs';

export const BangLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<BangLuong | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  const [exportMonth, setExportMonth] = useState<dayjs.Dayjs>(dayjs());
  const [exportYear, setExportYear] = useState<dayjs.Dayjs>(dayjs());
  const [searchKeyword, setSearchKeyword] = useState<string>('');

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

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';
  const isAccounting = (currentUser?.vaiTro === 'Quản lý' && (currentUser?.tenPhongBan || '').toLowerCase().includes('kế toán')) || isOwner;

  const getRecords = async (monthStr?: string, yearVal?: number) => {
    let list: BangLuong[] = [];
    if (isAccounting) {
      try {
        const res = await bangLuongApi.getAll(monthStr);
        list = res.data || [];
        if (yearVal) {
          list = list.filter((b) => b.thoiGian && b.thoiGian.endsWith('/' + yearVal));
        }
      } catch {
        list = [];
      }
    }
    if (list.length === 0) {
      list = data.filter((item) => {
        if (monthStr) return item.thoiGian === monthStr;
        if (yearVal) return item.thoiGian && item.thoiGian.endsWith('/' + yearVal);
        return true;
      });
    }
    return list;
  };

  const handleExportMonthExcel = async () => {
    const monthStr = exportMonth.format('MM/YYYY');
    try {
      const records = await getRecords(monthStr, undefined);
      if (records.length === 0) {
        message.warning('Không có dữ liệu bảng lương tháng ' + monthStr);
        return;
      }
      exportBangLuongToExcel(records, 'Tháng ' + monthStr, 'BangLuong_Thang_' + monthStr.replace('/', '_'));
      message.success('Đã tải bảng lương Excel tháng ' + monthStr);
    } catch {
      message.error('Không thể xuất bảng lương tháng.');
    }
  };

  const handlePrintMonth = async () => {
    const monthStr = exportMonth.format('MM/YYYY');
    try {
      const records = await getRecords(monthStr, undefined);
      if (records.length === 0) {
        message.warning('Không có dữ liệu bảng lương tháng ' + monthStr);
        return;
      }
      printPayrollTable(records, 'Tháng ' + monthStr);
    } catch {
      message.error('Không thể in bảng lương tháng.');
    }
  };

  const handleExportYearExcel = async () => {
    const yearVal = exportYear.year();
    try {
      const records = await getRecords(undefined, yearVal);
      if (records.length === 0) {
        message.warning('Không có dữ liệu bảng lương năm ' + yearVal);
        return;
      }
      exportBangLuongToExcel(records, 'Cả năm ' + yearVal, 'BangLuong_Nam_' + yearVal);
      message.success('Đã tải bảng lương Excel cả năm ' + yearVal);
    } catch {
      message.error('Không thể xuất bảng lương năm.');
    }
  };

  const handlePrintYear = async () => {
    const yearVal = exportYear.year();
    try {
      const records = await getRecords(undefined, yearVal);
      if (records.length === 0) {
        message.warning('Không có dữ liệu bảng lương năm ' + yearVal);
        return;
      }
      printPayrollTable(records, 'Cả năm ' + yearVal);
    } catch {
      message.error('Không thể in bảng lương năm.');
    }
  };

  const columns = [
    { title: 'Kỳ lương', dataIndex: 'thoiGian', key: 'thoiGian', width: 110, render: (val: string) => <strong>{val}</strong> },
    {
      title: 'Lương cơ bản',
      dataIndex: 'luongCoBan',
      key: 'luongCoBan',
      width: 140,
      align: 'right' as const,
      render: (val: number) => <span style={{ whiteSpace: 'nowrap' }}>{formatVND(val)}</span>,
    },
    {
      title: 'Ngày công',
      dataIndex: 'soNgayCong',
      key: 'soNgayCong',
      width: 120,
      align: 'center' as const,
      render: (val: number, record: BangLuong) => `${val || 0} / ${record.ngayCongChuan || 22} ngày`,
    },
    {
      title: 'Lương OT',
      dataIndex: 'luongOt',
      key: 'luongOt',
      width: 140,
      align: 'right' as const,
      render: (val: number, record: BangLuong) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {formatVND(val)}{' '}
          <small style={{ color: '#888' }}>({record.tongGioOt || 0}h)</small>
        </span>
      ),
    },
    {
      title: 'Khấu trừ BHXH',
      dataIndex: 'baoHiemXaHoi',
      key: 'baoHiemXaHoi',
      width: 130,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#fa8c16' : '#888', whiteSpace: 'nowrap' }}>
          {formatDeductionVND(val)}
        </span>
      ),
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'thueTncn',
      key: 'thueTncn',
      width: 120,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#f5222d' : '#888', whiteSpace: 'nowrap' }}>
          {formatDeductionVND(val)}
        </span>
      ),
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'thucLinh',
      key: 'thucLinh',
      width: 150,
      align: 'right' as const,
      render: (val: number) => (
        <strong style={{ color: '#52c41a', fontSize: 15, whiteSpace: 'nowrap' }}>
          {formatVND(val)}
        </strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThaiChiTra',
      key: 'trangThaiChiTra',
      width: 120,
      render: (val: string) => <Tag color={val === 'Đã chi trả' ? 'green' : 'blue'}>{val || 'Chờ duyệt'}</Tag>,
    },
    {
      title: 'Chi tiết',
      key: 'action',
      width: 110,
      fixed: 'right' as const,
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

  const filteredData = data.filter((item) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.thoiGian || '').toLowerCase().includes(kw) ||
      (item.trangThaiChiTra || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="In / Xuất bảng lương THEO THÁNG">
            <Space wrap>
              <DatePicker picker="month" value={exportMonth} onChange={(v) => v && setExportMonth(v)} format="MM/YYYY" />
              <Button
                icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
                onClick={handleExportMonthExcel}
              >
                Xuất Excel (.xlsx)
              </Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrintMonth}
              >
                In bảng lương (PDF)
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="In / Xuất bảng lương THEO NĂM">
            <Space wrap>
              <DatePicker picker="year" value={exportYear} onChange={(v) => v && setExportYear(v)} format="YYYY" />
              <Button
                icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
                onClick={handleExportYearExcel}
              >
                Xuất Excel (.xlsx)
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrintYear}
              >
                In bảng lương (PDF)
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="LỊCH SỬ BẢNG LƯƠNG CỦA TÔI"
        extra={
          <Input
            placeholder="Tìm theo kỳ lương (MM/YYYY), trạng thái..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
        }
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="maBangLuong"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Tổng cộng ${t} phiếu lương` }}
        />
      </Card>
      <Modal
        title={'CHI TIẾT CÁCH TÍNH LƯƠNG KỲ: ' + (selectedSlip?.thoiGian || '')}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button
            key="excel"
            icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
            onClick={() => selectedSlip && exportBangLuongToExcel([selectedSlip], selectedSlip.thoiGian, `PhieuLuong_${selectedSlip.hoTen}_${selectedSlip.thoiGian.replace('/', '_')}`)}
          >
            Tải Excel
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => selectedSlip && printSinglePaySlip(selectedSlip)}
          >
            In phiếu lương (PDF / A4)
          </Button>,
          <Button key="close" onClick={() => setDetailModal(false)}>
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
                <strong>{formatVND(selectedSlip.luongCoBan)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="2. Ngày công chuẩn quy định">
                {(selectedSlip.ngayCongChuan || 22)} ngày
              </Descriptions.Item>
              <Descriptions.Item label="3. Số ngày công thực tế làm việc">
                <strong>{(selectedSlip.soNgayCong || 0)} ngày</strong>
              </Descriptions.Item>
              <Descriptions.Item label="4. Tiền lương theo ngày công">
                {selectedSlip.ngayCongChuan
                  ? formatVND(((selectedSlip.luongCoBan || 0) / selectedSlip.ngayCongChuan) * (selectedSlip.soNgayCong || 0))
                  : '0 đ'}{' '}
                <em>(Công thức: Lương cơ bản ÷ 22 × Số ngày công)</em>
              </Descriptions.Item>
              <Descriptions.Item label="5. Tăng ca (OT)">
                {(selectedSlip.tongGioOt || 0)} giờ ➔ <strong>+{formatVND(selectedSlip.luongOt)}</strong>{' '}
                <em>(Công thức: Tiền lương giờ × Giờ OT × 1.5)</em>
              </Descriptions.Item>
              <Descriptions.Item label="6. Khấu trừ Bảo hiểm xã hội (10.5%)">
                <span style={{ color: selectedSlip.baoHiemXaHoi ? '#fa8c16' : '#888' }}>
                  {formatDeductionVND(selectedSlip.baoHiemXaHoi)}
                </span>{' '}
                <em>(Gồm 8% BHXH + 1.5% BHYT + 1% BHTN)</em>
              </Descriptions.Item>
              <Descriptions.Item label="7. Thuế Thu nhập cá nhân (TNCN)">
                <span style={{ color: selectedSlip.thueTncn ? '#f5222d' : '#888' }}>
                  {formatDeductionVND(selectedSlip.thueTncn)}
                </span>{' '}
                <em>(Áp dụng biểu thuế lũy tiến từng phần sau giảm trừ gia cảnh 11 triệu)</em>
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <div style={{ textAlign: 'right', fontSize: 18 }}>
              <span>LƯƠNG THỰC LĨNH (NET): </span>
              <strong style={{ color: '#52c41a', fontSize: 24 }}>
                {formatVND(selectedSlip.thucLinh)}
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
