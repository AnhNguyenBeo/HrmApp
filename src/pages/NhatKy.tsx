import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Select, DatePicker, Button, Tag, Space, Row, Col, Tooltip, message } from 'antd';
import { HistoryOutlined, SearchOutlined, ReloadOutlined, ClearOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { nhatKyApi } from '../api/nhatKyApi';
import { NhatKyHoatDong } from '../types';

const { RangePicker } = DatePicker;

export const NhatKyPage: React.FC = () => {
  const [logs, setLogs] = useState<NhatKyHoatDong[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [keyword, setKeyword] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [actionsList, setActionsList] = useState<string[]>([]);

  const fetchActions = async () => {
    try {
      const res = await nhatKyApi.getActions();
      setActionsList(res.data || []);
    } catch {
      setActionsList([]);
    }
  };

  const fetchLogs = useCallback(async (
    targetPage = page,
    targetPageSize = pageSize,
    kw = keyword,
    action = selectedAction,
    status = selectedStatus,
    range = dateRange
  ) => {
    try {
      setLoading(true);
      const params: {
        page: number;
        pageSize: number;
        keyword?: string;
        hanhDong?: string;
        trangThai?: string;
        tuNgay?: string;
        denNgay?: string;
      } = {
        page: targetPage,
        pageSize: targetPageSize,
      };

      if (kw && kw.trim()) params.keyword = kw.trim();
      if (action && action !== 'ALL') params.hanhDong = action;
      if (status && status !== 'ALL') params.trangThai = status;
      if (range && range[0]) params.tuNgay = range[0].format('YYYY-MM-DD');
      if (range && range[1]) params.denNgay = range[1].format('YYYY-MM-DD');

      const res = await nhatKyApi.getLogs(params);
      setLogs(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
    } catch {
      message.error('Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, selectedAction, selectedStatus, dateRange]);

  useEffect(() => {
    fetchActions();
    fetchLogs(1, pageSize);
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1, pageSize, keyword, selectedAction, selectedStatus, dateRange);
  };

  const handleReset = () => {
    setKeyword('');
    setSelectedAction('ALL');
    setSelectedStatus('ALL');
    setDateRange(null);
    setPage(1);
    fetchLogs(1, pageSize, '', 'ALL', 'ALL', null);
  };

  const getActionColor = (action: string) => {
    if (action.includes('Đăng nhập thất bại')) return 'error';
    if (action.includes('Đăng nhập')) return 'blue';
    if (action.includes('Khóa')) return 'volcano';
    if (action.includes('Mở khóa')) return 'green';
    if (action.includes('Cấp tài khoản')) return 'purple';
    if (action.includes('Đổi mật khẩu')) return 'gold';
    if (action.includes('lương') || action.includes('chi trả')) return 'cyan';
    if (action.includes('Đơn từ') || action.includes('đơn')) return 'geekblue';
    if (action.includes('nhân sự') || action.includes('chức vụ')) return 'magenta';
    return 'default';
  };

  const getStatusTag = (status: string) => {
    if (status === 'Thành công') return <Tag icon={<CheckCircleOutlined />} color="success">Thành công</Tag>;
    if (status === 'Cảnh báo') return <Tag icon={<ExclamationCircleOutlined />} color="warning">Cảnh báo</Tag>;
    if (status === 'Thất bại') return <Tag icon={<CloseCircleOutlined />} color="error">Thất bại</Tag>;
    return <Tag>{status}</Tag>;
  };

  const formatIP = (ip: string | null | undefined) => {
    if (!ip || ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'thoiGian',
      key: 'thoiGian',
      width: 170,
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#333' }}>
          {val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '-'}
        </span>
      ),
    },
    {
      title: 'Người thực hiện',
      key: 'user',
      width: 190,
      render: (_: unknown, record: NhatKyHoatDong) => (
        <Space direction="vertical" size={1}>
          <span style={{ fontWeight: 600, color: '#1677ff' }}>{record.tenDangNhap}</span>
          {record.hoTen && (
            <span style={{ fontSize: 12, color: '#666' }}>{record.hoTen}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'hanhDong',
      key: 'hanhDong',
      width: 180,
      render: (action: string) => (
        <Tag color={getActionColor(action)} style={{ fontWeight: 500, padding: '2px 8px' }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Chi tiết thao tác',
      dataIndex: 'chiTiet',
      key: 'chiTiet',
      render: (chiTiet: string) => (
        <span style={{ color: '#444' }}>{chiTiet || '-'}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 130,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'diaChiIP',
      key: 'diaChiIP',
      width: 140,
      render: (ip: string) => (
        <Tag icon={<GlobalOutlined />} style={{ fontFamily: 'monospace' }}>
          {formatIP(ip)}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG (AUDIT LOGS)</span>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchLogs(page, pageSize)}
          loading={loading}
        >
          Tải lại
        </Button>
      }
      style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="Tìm theo tên đăng nhập, họ tên, chi tiết..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        <Col xs={12} md={4}>
          <Select
            style={{ width: '100%' }}
            value={selectedAction}
            onChange={(val) => setSelectedAction(val)}
            options={[
              { label: 'Tất cả hành động', value: 'ALL' },
              ...actionsList.map((a) => ({ label: a, value: a })),
            ]}
          />
        </Col>
        <Col xs={12} md={4}>
          <Select
            style={{ width: '100%' }}
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={[
              { label: 'Tất cả trạng thái', value: 'ALL' },
              { label: 'Thành công', value: 'Thành công' },
              { label: 'Cảnh báo', value: 'Cảnh báo' },
              { label: 'Thất bại', value: 'Thất bại' },
            ]}
          />
        </Col>
        <Col xs={24} md={5}>
          <RangePicker
            style={{ width: '100%' }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
          />
        </Col>
        <Col xs={24} md={3}>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Tìm
            </Button>
            <Tooltip title="Đặt lại bộ lọc">
              <Button icon={<ClearOutlined />} onClick={handleReset} />
            </Tooltip>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="maLog"
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '15', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} trong số ${total} nhật ký`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            fetchLogs(p, ps);
          },
        }}
        bordered
        size="middle"
      />
    </Card>
  );
};