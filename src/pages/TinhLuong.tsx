import React, { useEffect, useState } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Tag, Alert, Popconfirm, Input, Select, Row, Col, Progress, Statistic, Tooltip } from 'antd';
import { CalculatorOutlined, DownloadOutlined, DollarCircleOutlined, CheckCircleOutlined, CheckOutlined, SearchOutlined, ClockCircleOutlined, FileExcelOutlined, PrinterOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { BangLuong } from '../types';
import { formatVND, formatDeductionVND, formatNumberVND } from '../utils/format';
import { exportBangLuongToExcel, printPayrollTable, printSinglePaySlip } from '../utils/salaryPrintExport';
import dayjs from 'dayjs';

export const TinhLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [departmentName, setDepartmentName] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser?.vaiTro === 'Chủ doanh nghiệp';

  useEffect(() => {
    if (currentUser?.tenPhongBan) {
      setDepartmentName(currentUser.tenPhongBan);
    } else if (currentUser?.maNhanVien) {
      nhanVienApi.getById(currentUser.maNhanVien).then((res) => {
        if (res.data?.tenPhongBan) {
          setDepartmentName(res.data.tenPhongBan);
          const updated = {
            ...currentUser,
            tenPhongBan: res.data.tenPhongBan,
            tenChucVu: res.data.tenChucVu,
          };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      }).catch(() => {});
    }
  }, [userStr]);

  const isAccounting = departmentName.toLowerCase().includes('kế toán');
  const isAccountingManager =
    isAccounting &&
    (currentUser?.vaiTro === 'Quản lý' ||
      currentUser?.tenChucVu?.includes('Trưởng') ||
      currentUser?.tenChucVu?.includes('Phó'));
  const hasAccess = isOwner || isAccounting;

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
    if (hasAccess) {
      fetchData();
    }
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <Alert
        type="error"
        showIcon
        message="Từ chối truy cập (403 Forbidden)"
        description="Chức năng Tính lương & Chi trả lương chỉ dành riêng cho Quản lý phòng Kế toán và Chủ doanh nghiệp. Quản lý các phòng ban khác không có thẩm quyền truy cập."
        style={{ marginTop: 24 }}
      />
    );
  }

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      await bangLuongApi.tinhLuong({ thoiGian: monthStr });
      message.success('Tính lương tự động kỳ ' + monthStr + ' hoàn tất!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Tính lương thất bại.');
    } finally {
      setCalculating(false);
    }
  };

  const handleApproveAll = async () => {
    try {
      setApproving(true);
      const res = await bangLuongApi.pheDuyetKyLuong(monthStr, 'Đã chi trả');
      message.success(res.data?.message || 'Đã duyệt và xác nhận chi trả toàn bộ kỳ lương!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Phê duyệt kỳ lương thất bại.');
    } finally {
      setApproving(false);
    }
  };

  const handleApproveSingle = async (id: string) => {
    try {
      await bangLuongApi.updateTrangThai(id, 'Đã chi trả');
      message.success('Đã xác nhận chi trả lương thành công!');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Thao tác thất bại.');
    }
  };

  const handleExportExcel = () => {
    const list = filteredData.length > 0 ? filteredData : monthRecords;
    if (list.length === 0) {
      message.warning('Không có dữ liệu bảng lương tháng ' + monthStr);
      return;
    }
    exportBangLuongToExcel(list, 'Tháng ' + monthStr, 'BangLuong_Thang_' + monthStr.replace('/', '_'));
    message.success('Đã xuất bảng lương Excel (.xlsx) thành công!');
  };

  const handlePrintPayroll = () => {
    const list = filteredData.length > 0 ? filteredData : monthRecords;
    if (list.length === 0) {
      message.warning('Không có dữ liệu bảng lương tháng ' + monthStr);
      return;
    }
    printPayrollTable(list, 'Tháng ' + monthStr);
  };

  const monthRecords = data.filter((b) => b.thoiGian === monthStr);
  const pendingCount = monthRecords.filter((b) => b.trangThaiChiTra !== 'Đã chi trả' && b.trangThaiChiTra !== 'Đã thanh toán').length;
  const totalMonthNet = monthRecords.reduce((sum, b) => sum + (b.thucLinh || 0), 0);
  const paidRecords = monthRecords.filter((b) => b.trangThaiChiTra === 'Đã chi trả' || b.trangThaiChiTra === 'Đã thanh toán');
  const paidAmount = paidRecords.reduce((sum, b) => sum + (b.thucLinh || 0), 0);
  const pendingRecords = monthRecords.filter((b) => b.trangThaiChiTra !== 'Đã chi trả' && b.trangThaiChiTra !== 'Đã thanh toán');
  const pendingAmount = pendingRecords.reduce((sum, b) => sum + (b.thucLinh || 0), 0);
  const percentPaid = totalMonthNet > 0 ? Math.round((paidAmount / totalMonthNet) * 100) : 0;

  const filteredData = monthRecords.filter((b) => {
    if (statusFilter !== 'ALL' && (b.trangThaiChiTra || 'Chờ duyệt') !== statusFilter) {
      return false;
    }
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (b.hoTen || '').toLowerCase().includes(kw) ||
      (b.tenPhongBan || '').toLowerCase().includes(kw) ||
      (b.tenChucVu || '').toLowerCase().includes(kw) ||
      (b.trangThaiChiTra || '').toLowerCase().includes(kw)
    );
  });

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'hoTen',
      key: 'hoTen',
      width: 170,
      render: (val: string) => <strong style={{ whiteSpace: 'nowrap' }}>{val}</strong>,
    },
    {
      title: 'Phòng ban / Chức vụ',
      key: 'phongBanChucVu',
      width: 190,
      render: (_: any, record: BangLuong) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.tenPhongBan || 'Chưa xếp'}</Tag>
          {record.tenChucVu && <Tag color="cyan">{record.tenChucVu}</Tag>}
        </Space>
      ),
    },
    { title: 'Kỳ lương', dataIndex: 'thoiGian', key: 'thoiGian', width: 100 },
    {
      title: 'Lương cơ bản',
      dataIndex: 'luongCoBan',
      key: 'luongCoBan',
      width: 135,
      align: 'right' as const,
      render: (val: number) => <span style={{ whiteSpace: 'nowrap' }}>{formatVND(val)}</span>,
    },
    {
      title: 'Ngày công',
      dataIndex: 'soNgayCong',
      key: 'soNgayCong',
      width: 100,
      align: 'center' as const,
      render: (val: number, record: BangLuong) => `${val || 0} / ${record.ngayCongChuan || 22}`,
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
      title: 'BHXH (10.5%)',
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
      width: 145,
      align: 'right' as const,
      render: (val: number) => (
        <strong style={{ color: '#52c41a', fontSize: 14, whiteSpace: 'nowrap' }}>
          {formatVND(val)}
        </strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThaiChiTra',
      key: 'trangThaiChiTra',
      width: 110,
      align: 'center' as const,
      render: (val: string) => (
        <Tag color={val === 'Đã chi trả' ? 'green' : 'gold'}>
          {val || 'Chờ duyệt'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 190,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: BangLuong) => {
        const printBtn = (
          <Tooltip title="In phiếu lương cá nhân (PDF / A4)">
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => printSinglePaySlip(record)}
            >
              In phiếu
            </Button>
          </Tooltip>
        );

        if (record.trangThaiChiTra === 'Đã chi trả') {
          return (
            <Space size="small">
              <Tag color="green">Đã hoàn tất</Tag>
              {printBtn}
            </Space>
          );
        }

        const isSelf = Boolean(currentUser?.maNhanVien && record.maNhanVien === currentUser.maNhanVien);
        if (isSelf) {
          return (
            <Space size="small">
              <Tag color="default">Không thể tự duyệt</Tag>
              {printBtn}
            </Space>
          );
        }

        const targetDept = (record.tenPhongBan || '').toLowerCase();
        const isTargetAccounting = targetDept.includes('kế toán');
        const targetChucVu = record.tenChucVu || '';
        const targetRole = record.vaiTro || '';
        const isTargetAccountingManager = isTargetAccounting && (targetRole === 'Quản lý' || targetChucVu.includes('Trưởng') || targetChucVu.includes('Phó'));
        const isTargetAccountingStaff = isTargetAccounting && !isTargetAccountingManager;

        if (isTargetAccountingManager) {
          if (!isOwner) {
            return (
              <Space size="small">
                <Tag color="orange">Cần Chủ DN duyệt</Tag>
                {printBtn}
              </Space>
            );
          }
        } else if (isTargetAccountingStaff) {
          if (!isOwner && !isAccountingManager) {
            return (
              <Space size="small">
                <Tag color="orange">Cần Quản lý KT duyệt</Tag>
                {printBtn}
              </Space>
            );
          }
        }

        return (
          <Space size="small">
            <Popconfirm
              title={`Xác nhận chi trả lương cho ${record.hoTen}?`}
              onConfirm={() => handleApproveSingle(record.maBangLuong)}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Chi trả
              </Button>
            </Popconfirm>
            {printBtn}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1890ff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Tổng quỹ lương ({monthStr})</span>}
              value={Math.round(totalMonthNet)}
              formatter={(val) => formatNumberVND(Number(val))}
              prefix={<DollarCircleOutlined style={{ color: '#1890ff' }} />}
              suffix="đ"
              valueStyle={{ fontSize: 19, fontWeight: 700, color: '#1890ff' }}
            />
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Quy mô: <strong>{monthRecords.length}</strong> nhân sự
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #52c41a', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Đã giải ngân chi trả</span>}
              value={Math.round(paidAmount)}
              formatter={(val) => formatNumberVND(Number(val))}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="đ"
              valueStyle={{ fontSize: 19, fontWeight: 700, color: '#52c41a' }}
            />
            <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
              Đã trả: <strong>{paidRecords.length}</strong> / {monthRecords.length} nhân sự
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #faad14', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Còn lại chờ duyệt chi</span>}
              value={Math.round(pendingAmount)}
              formatter={(val) => formatNumberVND(Number(val))}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix="đ"
              valueStyle={{ fontSize: 19, fontWeight: 700, color: '#faad14' }}
            />
            <div style={{ fontSize: 12, color: '#faad14', marginTop: 4 }}>
              Chờ duyệt: <strong>{pendingRecords.length}</strong> nhân sự
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #722ed1', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4, fontWeight: 500 }}>Tiến độ giải ngân kỳ này</div>
            <Progress
              percent={percentPaid}
              status={percentPaid === 100 ? 'success' : 'active'}
              strokeColor={{ '0%': '#108ee9', '100%': '#52c41a' }}
            />
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {percentPaid === 100 ? 'Đã hoàn tất chi trả 100%' : `Còn lại ${100 - percentPaid}% cần giải ngân`}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <DollarCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            TÍNH LƯƠNG & QUẢN LÝ BẢNG LƯƠNG NHÂN SỰ {isOwner ? '(CHỦ DOANH NGHIỆP)' : '(PHÒNG KẾ TOÁN)'}
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
              Chạy tính lương
            </Button>
            {filteredData.length > 0 && pendingCount > 0 && (
              <Popconfirm
                title={`Xác nhận duyệt & chi trả toàn bộ bảng lương kỳ ${monthStr} (${pendingCount} nhân sự chờ duyệt)?`}
                onConfirm={handleApproveAll}
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={approving}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  {isOwner ? 'Chủ DN Duyệt & Chi trả' : isAccountingManager ? 'Trưởng phòng KT: Duyệt cả kỳ' : 'Kế toán: Duyệt các phòng khác'}
                </Button>
              </Popconfirm>
            )}
            <Button
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              onClick={handleExportExcel}
            >
              Xuất Excel (.xlsx)
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrintPayroll}
            >
              In bảng lương (PDF)
            </Button>
          </Space>
        }
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space wrap size="middle">
              <Input
                placeholder="Tìm theo tên nhân viên, phòng ban, chức vụ..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ width: 320 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 170 }}
              >
                <Select.Option value="ALL">Tất cả trạng thái</Select.Option>
                <Select.Option value="Chờ duyệt">Chờ duyệt</Select.Option>
                <Select.Option value="Đã chi trả">Đã chi trả</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <span style={{ color: '#888', fontSize: 13 }}>
              Hiển thị: <strong>{filteredData.length}</strong> / {monthRecords.length} nhân sự
            </span>
          </Col>
        </Row>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="maBangLuong"
          loading={loading}
          scroll={{ x: 1450 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Tổng cộng ${t} phiếu lương` }}
        />
      </Card>
    </div>
  );
};
