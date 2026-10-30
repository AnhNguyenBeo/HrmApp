import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  allowDepartments?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, allowDepartments }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const navigate = useNavigate();

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const user = JSON.parse(userStr);
      const hasRole = allowedRoles.includes(user.vaiTro);
      const hasDept = allowDepartments ? allowDepartments.some((d) => (user.tenPhongBan || '').includes(d)) : false;

      if (!hasRole && !hasDept) {
        return (
          <div style={{ padding: 50, textAlign: 'center' }}>
            <Result
              status="403"
              title="403 - Không có quyền truy cập"
              subTitle={`Bạn không có quyền xem trang này với vai trò hiện tại: ${user.vaiTro}`}
              extra={
                <Button type="primary" onClick={() => navigate('/')}>
                  Về trang chủ của bạn
                </Button>
              }
            />
          </div>
        );
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};
