import React, { useEffect, useState } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Tag, Alert } from 'antd';
import { CalculatorOutlined, DownloadOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { BangLuong } from '../types';
import dayjs from 'dayjs';

export const TinhLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());

  const monthStr = selectedMonth.format('MM/YYYY');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await bangLuongApi.getAll();
      setData(res.data);
    } catch {
      message.error('Không thể tải bảng lương.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      await bangLuongApi.tinhLuong({ thoiGian: monthStr });
      message.success('Tính lương tự động tháng ' + monthStr + ' hoàn tất!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Tính lương thất bại.');
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportApi.exportBangLuong(monthStr);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BangLuong_' + monthStr.replace('/', '_') + '.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Xuất file bảng lương thành công!');
    } catch {
      message.error('Không thể xuất file bảng lương.');
    }
  };

  const filteredData = data.filter((b) => b.thoiGian === monthStr);

  const columns = [
    { title: 'Nhân viên', dataIndex: 'hoTen', key: 'hoTen', render: (val: string) => <strong>{val}</strong> },
    { title: 'Kỳ lương', dataIndex: 'thoiGian', key: 'thoiGian' },
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
      render: (val: number, record: BangLuong) => (val || 0) + ' / ' + (record.ngayCongChuan || 22),
    },
    {
      title: 'Lương OT',
      dataIndex: 'luongOt',
      key: 'luongOt',
      render: (val: number, record: BangLuong) => (
        <span>
          {val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}{' '}
          <small style={{ color: '#888' }}>({record.tongGioOt || 0}h)</small>
        </span>
      ),
    },
    {
      title: 'BHXH (10.5%)',
      dataIndex: 'baoHiemXaHoi',
      key: 'baoHiemXaHoi',
      render: (val: number) => (
        <span style={{ color: '#fa8c16' }}>-{val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>
      ),
    },
    {
      title: 'Thuế TNCN',
      dataIndex: 'thueTncn',
      key: 'thueTncn',
      render: (val: number) => (
        <span style={{ color: '#f5222d' }}>-{val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>
      ),
    },
    {
      title: 'Thực lĩnh (Net)',
      dataIndex: 'thucLinh',
      key: 'thucLinh',
      render: (val: number) => (
        <strong style={{ color: '#52c41a', fontSize: 15 }}>
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
  ];

  return (
    <div>
      <Alert
        message="Hệ thống tính lương tự động chuẩn thực tế"
        description="Thuật toán tổng hợp ngày công từ bảng Chấm công, tính tiền OT x1.5, trích lập 10.5% Bảo hiểm (BHXH, BHYT, BHTN), trừ giảm trừ gia cảnh 11 triệu và áp dụng biểu thuế thu nhập cá nhân lũy tiến 7 bậc để ra lương Thực lĩnh (Net)."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <span>
            <DollarCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            TÍNH LƯƠNG & QUẢN LÝ BẢNG LƯƠNG NHÂN SỰ
          </span>
        }
        extra={
          <Space>
            <span>Kỳ lương:</span>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
            />
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              loading={calculating}
              onClick={handleCalculate}
            >
              Chạy tính lương tháng {monthStr}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Xuất Excel (.csv)
            </Button>
          </Space>
        }
      >
        <Table dataSource={filteredData} columns={columns} rowKey="maBangLuong" loading={loading} />
      </Card>
    </div>
  );
};
