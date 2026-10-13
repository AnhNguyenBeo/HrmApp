import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const user = JSON.parse(userStr);
      if (!allowedRoles.includes(user.vaiTro)) {
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