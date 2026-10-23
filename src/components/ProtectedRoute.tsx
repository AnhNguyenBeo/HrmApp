import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  allowDepartments?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, allowDepartments }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

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
            <h2>403 - Không có quyền truy cập</h2>
            <p>Bạn không có quyền xem trang này với vai trò hiện tại: {user.vaiTro}</p>
          </div>
        );
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};
