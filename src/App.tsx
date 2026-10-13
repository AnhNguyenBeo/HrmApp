import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { ChamCongPage } from './pages/ChamCong';
import { DonTuPage } from './pages/DonTu';
import { BangLuongPage } from './pages/BangLuong';
import { DashboardPage } from './pages/Dashboard';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/profile" replace />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cham-cong" element={<ChamCongPage />} />
              <Route path="/don-tu" element={<DonTuPage />} />
              <Route path="/bang-luong" element={<BangLuongPage />} />

              {/* Manager & Admin Only */}
              <Route element={<ProtectedRoute allowedRoles={['Quản trị viên', 'Quản lý']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/nhan-vien" element={<div style={{ padding: 20 }}><h3>Trang Quản lý Nhân sự (Đang phát triển)</h3></div>} />
                <Route path="/don-tu/quan-ly" element={<div style={{ padding: 20 }}><h3>Trang Duyệt đơn từ (Đang phát triển)</h3></div>} />
              </Route>

              {/* Accountant Only */}
              <Route element={<ProtectedRoute allowedRoles={['Kế toán']} />}>
                <Route path="/tinh-luong" element={<div style={{ padding: 20 }}><h3>Trang Tính & Chốt lương (Đang phát triển)</h3></div>} />
              </Route>
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;