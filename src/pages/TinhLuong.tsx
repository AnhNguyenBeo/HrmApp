import React, { useEffect, useState } from 'react';
import { Card, Table, Button, DatePicker, Space, message, Tag, Alert, Popconfirm } from 'antd';
import { CalculatorOutlined, DownloadOutlined, DollarCircleOutlined, CheckCircleOutlined, CheckOutlined } from '@ant-design/icons';
import { bangLuongApi } from '../api/bangLuongApi';
import { exportApi } from '../api/exportApi';
import { nhanVienApi } from '../api/nhanVienApi';
import { BangLuong } from '../types';
import dayjs from 'dayjs';

export const TinhLuongPage: React.FC = () => {
  const [data, setData] = useState<BangLuong[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [departmentName, setDepartmentName] = useState<string>('');

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
  const pendingCount = filteredData.filter((b) => b.trangThaiChiTra !== 'Đã chi trả').length;

  const columns = [
    { title: 'Nhân viên', dataIndex: 'hoTen', key: 'hoTen', render: (val: string) => <strong>{val}</strong> },
    {
      title: 'Phòng ban / Chức vụ',
      key: 'phongBanChucVu',
      render: (_: any, record: BangLuong) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">{record.tenPhongBan || 'Chưa xếp'}</Tag>
          {record.tenChucVu && <Tag color="cyan">{record.tenChucVu}</Tag>}
        </Space>
      ),
    },
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
      render: (val: string) => (
        <Tag color={val === 'Đã chi trả' ? 'green' : 'gold'}>
          {val || 'Chờ duyệt'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác chi trả',
      key: 'action',
      render: (_: any, record: BangLuong) => {
        if (record.trangThaiChiTra === 'Đã chi trả') {
          return <Tag color="green">Đã hoàn tất</Tag>;
        }

        const isSelf = Boolean(currentUser?.maNhanVien && record.maNhanVien === currentUser.maNhanVien);
        if (isSelf) {
          return <Tag color="default">Không thể tự duyệt</Tag>;
        }

        const targetDept = (record.tenPhongBan || '').toLowerCase();
        const isTargetAccounting = targetDept.includes('kế toán');
        const targetChucVu = record.tenChucVu || '';
        const targetRole = record.vaiTro || '';
        const isTargetAccountingManager = isTargetAccounting && (targetRole === 'Quản lý' || targetChucVu.includes('Trưởng') || targetChucVu.includes('Phó'));
        const isTargetAccountingStaff = isTargetAccounting && !isTargetAccountingManager;

        if (isTargetAccountingManager) {
          if (!isOwner) {
            return <Tag color="orange">Cần Chủ DN duyệt</Tag>;
          }
        } else if (isTargetAccountingStaff) {
          if (!isOwner && !isAccountingManager) {
            return <Tag color="orange">Cần Quản lý KT duyệt</Tag>;
          }
        }

        return (
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
        );
      },
    },
  ];

  return (
    <div>
      <Alert
        message="Phân quyền phê duyệt & chi trả lương theo cấp bậc"
        description={
          <div>
            <div>• <strong>Nhân viên phòng Kế toán:</strong> Lập bảng lương tự động từ dữ liệu chấm công; phê duyệt chi trả lương cho nhân sự các phòng ban khác. Nhân viên kế toán không được tự duyệt lương của mình hay nhân viên kế toán khác.</div>
            <div>• <strong>Quản lý phòng Kế toán:</strong> Phê duyệt chi trả lương cho toàn bộ nhân viên phòng Kế toán và nhân sự các phòng ban khác. Bảng lương của Quản lý kế toán phải do Chủ doanh nghiệp phê duyệt.</div>
            <div>• <strong>Chủ doanh nghiệp:</strong> Phê duyệt chi trả lương cho Quản lý phòng Kế toán và toàn thể nhân sự công ty.</div>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

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
