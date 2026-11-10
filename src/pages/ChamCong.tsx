import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, DatePicker, Tag, Space, message, Row, Col, Statistic, Input, Modal, Alert, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { chamCongApi } from '../api/chamCongApi';
import { donTuApi } from '../api/donTuApi';
import { ChamCong, DonTu } from '../types';
import dayjs from 'dayjs';

export const getCongQuyDoi = (record: ChamCong): number => {
  const st = record.trangThai || '';
  const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
  const noOut = !record.gioRa || record.gioRa === '00:00:00' || record.gioRa.startsWith('00:00:00') || record.gioRa === '-';
  const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
  const isMissedCheckOut = st === 'Chưa check-out' || (isPast && noOut && hasIn && st !== 'Vắng mặt');

  if (noOut || st.includes('Bỏ ca') || st === 'Vắng mặt' || st.includes('Thiếu giờ vào') || isMissedCheckOut) {
    return 0;
  }
  if (st.includes('Nửa công')) {
    return 0.5;
  }
  return 1.0;
};

export const ChamCongPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ChamCong[]>([]);
  const [myDonTus, setMyDonTus] = useState<DonTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs().format('HH:mm:ss')), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (m: dayjs.Dayjs) => {
    try {
      setLoading(true);
      const [ccRes, dtRes] = await Promise.allSettled([
        chamCongApi.getMyAttendance(m.month() + 1, m.year()),
        donTuApi.getMine(),
      ]);
      if (ccRes.status === 'fulfilled') {
        setData(ccRes.value.data);
      } else {
        message.error('Không thể tải lịch sử chấm công.');
      }
      if (dtRes.status === 'fulfilled') {
        setMyDonTus(dtRes.value.data || []);
      }
    } catch {
      message.error('Không thể tải lịch sử chấm công.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const executeCheckInOut = async (today: string) => {
    try {
      const res = await chamCongApi.checkInOut(today);
      if (res.data?.hasUnresolvedCheckOut) {
        Modal.warning({
          title: 'CHÚ Ý: BẠN CÓ NGÀY CHƯA CHECK-OUT (0 CÔNG)',
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          content: (
            <div>
              <p>{res.data.message}</p>
              <p style={{ color: '#ff4d4f', fontWeight: 600 }}>
                Các ngày chưa check-out đang bị tạm tính 0 công. Vui lòng nộp đơn giải trình cho cấp trên để được xử lý và khôi phục ngày công!
              </p>
            </div>
          ),
          okText: 'Nộp đơn ngay',
          cancelText: 'Đã hiểu',
          okCancel: true,
          onOk: () => navigate('/don-tu'),
        });
      } else if (res.data?.isEarly) {
        message.warning(res.data.message, 6);
      } else {
        message.success(res.data?.message || 'Chấm công thành công!');
      }
      fetchData(selectedMonth);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Chấm công thất bại.');
    }
  };

  const handleCheckIn = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayRecord = data.find((c) => c.ngay === today);
    const nowHour = dayjs().hour();
    const isCheckingOut = todayRecord && todayRecord.gioVao && (!todayRecord.gioRa || todayRecord.gioRa === '00:00:00' || todayRecord.gioRa.startsWith('00:00:00'));

    if (isCheckingOut) {
      const parts = (todayRecord.gioVao || '').split(':');
      let workedHours = 0;
      if (parts.length >= 2) {
        const inTime = dayjs().hour(Number(parts[0])).minute(Number(parts[1])).second(Number(parts[2] || 0));
        workedHours = dayjs().diff(inTime, 'hour', true);
      }

      if (workedHours < 2.0) {
        const workedMins = Math.max(1, Math.round(workedHours * 60));
        Modal.confirm({
          title: 'CẢNH BÁO: THỜI GIAN LÀM VIỆC DƯỚI 2 GIỜ (BỎ CA)!',
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          content: `Bạn mới làm việc được ${workedMins} phút (chưa đạt tối thiểu 2 giờ). Nếu Check-out bây giờ, hệ thống sẽ xác định là "BỎ CA" và tính 0 NGÀY CÔNG (không có lương ngày hôm nay). Bạn có chắc chắn muốn kết thúc ca không?`,
          okText: 'Xác nhận Bỏ ca (0 công)',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }

      if (workedHours < 5.0) {
        Modal.confirm({
          title: 'CẢNH BÁO: CHECK-OUT VỀ SỚM (NỬA CÔNG)!',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: `Thời gian làm việc hiện tại là ${workedHours.toFixed(1)} giờ (từ 2 đến dưới 5 giờ). Nếu Check-out lúc này, ca làm việc hôm nay chỉ được tính NỬA NGÀY CÔNG (0.5 công). Bạn có chắc chắn muốn Check-out không?`,
          okText: 'Xác nhận (0.5 công)',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }

      if (nowHour < 17) {
        Modal.confirm({
          title: 'CẢNH BÁO: CHECK-OUT TRƯỚC 17:00 (VỀ SỚM)!',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: `Giờ tan ca tiêu chuẩn là 17:00. Bạn đang thực hiện Check-out lúc ${dayjs().format('HH:mm:ss')} (sớm hơn quy định). Bạn có chắc chắn muốn Check-out về sớm không?`,
          okText: 'Xác nhận về sớm',
          okType: 'danger',
          cancelText: 'Tiếp tục làm việc',
          onOk: () => executeCheckInOut(today),
        });
        return;
      }
    }

    await executeCheckInOut(today);
  };

  const formatTime = (val?: string) => {
    if (!val || val === '00:00:00' || val.startsWith('00:00:00')) return '-';
    return val.split('.')[0];
  };

  const missedCheckOutDays = data.filter((item) => {
    const isPast = dayjs(item.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
    const noOutTime = !item.gioRa || item.gioRa === '00:00:00' || item.gioRa.startsWith('00:00:00') || item.gioRa === '-';
    const hasInTime = item.gioVao && item.gioVao !== '00:00:00' && !item.gioVao.startsWith('00:00:00') && item.gioVao !== '-';
    return (
      (item.trangThai === 'Chưa check-out' || (isPast && noOutTime && hasInTime)) &&
      item.trangThai !== 'Vắng mặt'
    );
  });

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayRecord = data.find((c) => c.ngay === todayStr);
  const hasInToday = Boolean(
    todayRecord?.gioVao &&
    todayRecord.gioVao !== '00:00:00' &&
    !todayRecord.gioVao.startsWith('00:00:00') &&
    todayRecord.gioVao !== '-'
  );
  const hasOutToday = Boolean(
    todayRecord?.gioRa &&
    todayRecord.gioRa !== '00:00:00' &&
    !todayRecord.gioRa.startsWith('00:00:00') &&
    todayRecord.gioRa !== '-'
  );

  const stats = useMemo(() => {
    let congDiLam = 0;
    let soCaDu = 0;
    let soCaNua = 0;
    let tongGioOt = 0;
    let soLanDiMuon = 0;
    let soLanVeSom = 0;
    let hasOngoingToday = false;

    data.forEach((item) => {
      const cong = getCongQuyDoi(item);
      congDiLam += cong;
      if (cong === 1.0) soCaDu++;
      else if (cong === 0.5) soCaNua++;

      if (item.trangThai?.includes('Đi muộn')) soLanDiMuon++;
      if (item.trangThai?.includes('Về sớm')) soLanVeSom++;
      if (item.soGioTangCa) tongGioOt += Number(item.soGioTangCa);

      const isPast = dayjs(item.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
      const noOut = !item.gioRa || item.gioRa === '00:00:00' || item.gioRa.startsWith('00:00:00') || item.gioRa === '-';
      const hasIn = item.gioVao && item.gioVao !== '00:00:00' && !item.gioVao.startsWith('00:00:00') && item.gioVao !== '-';
      if (!isPast && hasIn && noOut) {
        hasOngoingToday = true;
      }
    });

    const startOfMonth = selectedMonth.startOf('month');
    const endOfMonth = selectedMonth.endOf('month');

    const attendanceDates = new Set(
      data.filter((c) => getCongQuyDoi(c) > 0).map((c) => c.ngay)
    );

    let congNghiPhep = 0;
    myDonTus.forEach((dt) => {
      if (dt.trangThai !== 'Đã duyệt') return;
      if (
        dt.loaiDon === 'Giải trình chấm công' ||
        dt.loaiDon === 'Xác nhận chấm công' ||
        dt.loaiDon === 'Quên check-out' ||
        dt.loaiDon === 'Làm thêm giờ' ||
        dt.loaiDon === 'Đăng ký tăng ca' ||
        dt.loaiDon === 'Tăng ca' ||
        dt.loaiDon === 'Đơn tăng ca' ||
        dt.loaiDon === 'Nghỉ không lương' ||
        dt.loaiNghi === 'Nghỉ không lương'
      ) {
        return;
      }

      const start = dayjs(dt.ngayBatDau);
      const end = dayjs(dt.ngayKetThuc);
      if (end.isBefore(startOfMonth, 'day') || start.isAfter(endOfMonth, 'day')) {
        return;
      }

      const curStart = start.isBefore(startOfMonth, 'day') ? startOfMonth : start;
      const curEnd = end.isAfter(endOfMonth, 'day') ? endOfMonth : end;

      let cur = curStart;
      while (cur.isBefore(curEnd, 'day') || cur.isSame(curEnd, 'day')) {
        const dStr = cur.format('YYYY-MM-DD');
        const dayOfWeek = cur.day();
        if (dayOfWeek !== 0 && !attendanceDates.has(dStr)) {
          congNghiPhep += 1;
        }
        cur = cur.add(1, 'day');
      }
    });

    const tongCongThang = congDiLam + congNghiPhep;

    return {
      congDiLam,
      congNghiPhep,
      tongCongThang,
      soCaDu,
      soCaNua,
      tongGioOt,
      soLanDiMuon,
      soLanVeSom,
      hasOngoingToday,
    };
  }, [data, myDonTus, selectedMonth]);

  const columns = [
    { title: 'Ngày', dataIndex: 'ngay', key: 'ngay', width: 110 },
    { title: 'Giờ vào', dataIndex: 'gioVao', key: 'gioVao', width: 110, render: (val: string) => formatTime(val) },
    {
      title: 'Giờ ra',
      dataIndex: 'gioRa',
      key: 'gioRa',
      width: 130,
      render: (val: string, record: ChamCong) => {
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !val || val === '00:00:00' || val.startsWith('00:00:00') || val === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        if (record.trangThai === 'Chưa check-out' || (isPast && noOut && hasIn && record.trangThai !== 'Vắng mặt')) {
          return <Tag color="error">Chưa check-out</Tag>;
        }
        if (!isPast && noOut && hasIn) {
          return <Tag color="processing">Chờ check-out</Tag>;
        }
        return formatTime(val);
      },
    },
    {
      title: 'Tăng ca (OT)',
      dataIndex: 'soGioTangCa',
      key: 'soGioTangCa',
      width: 120,
      render: (val: number) => (val > 0 ? <Tag color="orange">{val} giờ</Tag> : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 170,
      render: (val: string, record: ChamCong) => {
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !record.gioRa || record.gioRa === '00:00:00' || record.gioRa.startsWith('00:00:00') || record.gioRa === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        if (val === 'Chưa check-out' || (isPast && noOut && hasIn && val !== 'Vắng mặt')) {
          return <Tag color="error">Chưa check-out</Tag>;
        }
        if (!isPast && noOut && hasIn) {
          if (val === 'Đi muộn') {
            return <Tag color="gold">Đi muộn (Đang làm việc)</Tag>;
          }
          return <Tag color="processing">Đang trong ca</Tag>;
        }
        let color = 'default';
        if (val.includes('Bỏ ca') || val.includes('Không đủ công')) color = 'error';
        else if (val.includes('Nửa công')) color = 'purple';
        else if (val.includes('Đi muộn') && val.includes('Về sớm')) color = 'red';
        else if (val.includes('Về sớm')) color = 'orange';
        else if (val.includes('Đi muộn')) color = 'gold';
        else if (val.includes('Thiếu')) color = 'volcano';
        else if (val.includes('Hoàn thành') || val === 'Đã check-in') color = 'green';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: 'Công ghi nhận',
      key: 'congQuyDoi',
      align: 'center' as const,
      width: 160,
      render: (_: any, record: ChamCong) => {
        const st = record.trangThai || '';
        const isPast = dayjs(record.ngay, 'YYYY-MM-DD').isBefore(dayjs(), 'day');
        const noOut = !record.gioRa || record.gioRa === '00:00:00' || record.gioRa.startsWith('00:00:00') || record.gioRa === '-';
        const hasIn = record.gioVao && record.gioVao !== '00:00:00' && !record.gioVao.startsWith('00:00:00') && record.gioVao !== '-';
        const isMissedCheckOut = st === 'Chưa check-out' || (isPast && noOut && hasIn && st !== 'Vắng mặt');
        const isOngoingShift = !isPast && hasIn && noOut;

        if (isOngoingShift) {
          return (
            <Tooltip title="Bạn đang trong ca làm việc hôm nay. Vui lòng Check-out khi tan ca để hệ thống chốt giờ và tính công chính thức.">
              <Tag color="processing">0 công (Đang trong ca)</Tag>
            </Tooltip>
          );
        }
        if (st.includes('Bỏ ca') || st === 'Vắng mặt' || st.includes('Thiếu giờ vào') || isMissedCheckOut || noOut) {
          return (
            <Tooltip title={isMissedCheckOut ? 'Chưa check-out (0 công). Cần nộp đơn cho cấp trên xử lý.' : undefined}>
              <Tag color="default">0 công</Tag>
            </Tooltip>
          );
        }
        if (st.includes('Nửa công')) {
          return <Tag color="purple">0.5 công</Tag>;
        }
        return <Tag color="blue">1.0 công</Tag>;
      },
    },
  ];

  const filteredData = data.filter((item) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.ngay || '').toLowerCase().includes(kw) ||
      (item.trangThai || '').toLowerCase().includes(kw) ||
      (item.gioVao || '').toLowerCase().includes(kw) ||
      (item.gioRa || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div>
      {missedCheckOutDays.length > 0 && (
        <Alert
          message={
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              CẢNH BÁO: BẠN CÓ {missedCheckOutDays.length} NGÀY CHƯA CHECK-OUT (TÍNH 0 CÔNG)
            </span>
          }
          description={
            <div style={{ marginTop: 4 }}>
              <div>
                Danh sách ngày chưa check-out:{' '}
                <strong style={{ color: '#cf1322' }}>
                  {missedCheckOutDays.map((d) => dayjs(d.ngay).format('DD/MM/YYYY')).join(', ')}
                </strong>.
              </div>
              <div style={{ marginTop: 4 }}>
                Hệ thống tạm ghi nhận <strong>0 công</strong> cho các ngày này do thiếu giờ ra. Vui lòng nộp đơn giải trình / xác nhận chấm công cho cấp trên xử lý để được khôi phục ngày công.
              </div>
            </div>
          }
          type="error"
          showIcon
          action={
            <Button
              type="primary"
              danger
              size="middle"
              icon={<FileDoneOutlined />}
              onClick={() => navigate('/don-tu')}
            >
              Nộp đơn cho cấp trên
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={10}>
          <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Statistic
              title="Đồng hồ hệ thống"
              value={currentTime}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 32, fontWeight: 700 }}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              Hôm nay: <strong>{dayjs().format('dddd, DD/MM/YYYY')}</strong>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {hasInToday && hasOutToday ? (
              <div>
                <Button
                  type="primary"
                  size="large"
                  disabled
                  icon={<CheckCircleOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a', height: 48, fontSize: 16, color: '#fff' }}
                >
                  ĐÃ HOÀN THÀNH CHẤM CÔNG HÔM NAY
                </Button>
                <div style={{ marginTop: 8, fontSize: 13, color: '#52c41a' }}>
                  Giờ vào: <strong>{formatTime(todayRecord?.gioVao)}</strong> • Giờ ra: <strong>{formatTime(todayRecord?.gioRa)}</strong> • Trạng thái: <strong>{todayRecord?.trangThai}</strong>
                </div>
              </div>
            ) : hasInToday ? (
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<LogoutOutlined />}
                  onClick={handleCheckIn}
                  style={{ background: '#fa8c16', borderColor: '#fa8c16', height: 48, fontSize: 16 }}
                >
                  CHECK-OUT KẾT THÚC CA
                </Button>
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                  Đã check-in lúc: <strong>{formatTime(todayRecord?.gioVao)}</strong> • Tan ca từ <strong>17:00</strong> (&lt;2h: Bỏ ca 0 công • 2h-5h: Nửa công)
                </div>
              </div>
            ) : (
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  onClick={handleCheckIn}
                  style={{ background: '#52c41a', borderColor: '#52c41a', height: 48, fontSize: 16 }}
                >
                  CHECK-IN VÀO CA LÀM VIỆC
                </Button>
                <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                  Giờ vào ca tiêu chuẩn: trước <strong>08:30</strong>. Vui lòng check-in khi bắt đầu làm việc.
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1f1f1f' }}>
            THỐNG KÊ CÔNG THÁNG {selectedMonth.format('MM/YYYY')}
          </span>
        }
        extra={
          <Space size={8}>
            <span style={{ fontSize: 13, color: '#8c8c8c' }}>Chọn tháng:</span>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
              allowClear={false}
              style={{ width: 120 }}
            />
          </Space>
        }
        style={{ marginBottom: 24, borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: '16px 20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>
                  TỔNG CÔNG TRONG THÁNG
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#1f1f1f', lineHeight: 1.2 }}>
                  {stats.tongCongThang.toFixed(1)}{' '}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>công</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid #f0f0f0',
                  fontSize: 12,
                  color: '#8c8c8c',
                }}
              >
                Đi làm: <strong style={{ color: '#262626' }}>{stats.congDiLam}</strong>
                {stats.congNghiPhep > 0 && (
                  <> • Nghỉ phép: <strong style={{ color: '#262626' }}>{stats.congNghiPhep}</strong></>
                )}
                {stats.hasOngoingToday && (
                  <div style={{ color: '#1890ff', marginTop: 3 }}>
                    (Hôm nay đang trong ca làm việc)
                  </div>
                )}
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: '16px 20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>
                  CA ĐỦ CÔNG (1.0 CÔNG)
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#1f1f1f', lineHeight: 1.2 }}>
                  {stats.soCaDu}{' '}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>ca</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid #f0f0f0',
                  fontSize: 12,
                  color: '#8c8c8c',
                }}
              >
                {stats.soCaNua > 0 ? (
                  <span>
                    Ca nửa công (0.5): <strong style={{ color: '#262626' }}>{stats.soCaNua}</strong>
                  </span>
                ) : (
                  <span>100% ca hoàn thành tiêu chuẩn</span>
                )}
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: '16px 20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500, marginBottom: 8 }}>
                  TĂNG CA (OT) ĐÃ DUYỆT
                </div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#1f1f1f', lineHeight: 1.2 }}>
                  {stats.tongGioOt.toFixed(1)}{' '}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>giờ</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid #f0f0f0',
                  fontSize: 12,
                  color: '#8c8c8c',
                }}
              >
                Đi muộn / Về sớm:{' '}
                <strong style={{ color: stats.soLanDiMuon + stats.soLanVeSom > 0 ? '#faad14' : '#262626' }}>
                  {stats.soLanDiMuon + stats.soLanVeSom}
                </strong>{' '}
                lần
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div
              style={{
                background: missedCheckOutDays.length > 0 ? '#fff2f0' : '#fafafa',
                border: missedCheckOutDays.length > 0 ? '1px solid #ffccc7' : '1px solid #f0f0f0',
                borderRadius: 8,
                padding: '16px 20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: missedCheckOutDays.length > 0 ? '#cf1322' : '#8c8c8c',
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  CHƯA CHECK-OUT (0 CÔNG)
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: missedCheckOutDays.length > 0 ? '#cf1322' : '#1f1f1f',
                    lineHeight: 1.2,
                  }}
                >
                  {missedCheckOutDays.length}{' '}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: missedCheckOutDays.length > 0 ? '#cf1322' : '#8c8c8c',
                    }}
                  >
                    ngày
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: missedCheckOutDays.length > 0 ? '1px solid #ffccc7' : '1px solid #f0f0f0',
                  fontSize: 12,
                  color: missedCheckOutDays.length > 0 ? '#cf1322' : '#8c8c8c',
                }}
              >
                {missedCheckOutDays.length > 0
                  ? 'Cần nộp đơn giải trình cho cấp trên'
                  : 'Không có ngày lỗi check-out'}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Card
        title="LỊCH SỬ CHẤM CÔNG CÁ NHÂN"
        extra={
          <Input
            placeholder="Tìm theo ngày, trạng thái..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
        }
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="maChamCong"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      </Card>
    </div>
  );
};
