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
import { NhanVienPage } from './pages/NhanVien';
import { DuyetDonTuPage } from './pages/DuyetDonTu';
import { ChamCongQuanLyPage } from './pages/ChamCongQuanLy';
import { TinhLuongPage } from './pages/TinhLuong';
import { TaiKhoanPage } from './pages/TaiKhoan';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - yêu cầu đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/profile" replace />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cham-cong" element={<ChamCongPage />} />
              <Route path="/don-tu" element={<DonTuPage />} />
              <Route path="/bang-luong" element={<BangLuongPage />} />

              {/* Quản lý Only - toàn bộ quản lý nhân sự, lương, báo cáo */}
              <Route element={<ProtectedRoute allowedRoles={['Quản lý', 'Quản trị viên']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/nhan-vien" element={<NhanVienPage />} />
                <Route path="/don-tu/quan-ly" element={<DuyetDonTuPage />} />
                <Route path="/cham-cong-quan-ly" element={<ChamCongQuanLyPage />} />
                <Route path="/tinh-luong" element={<TinhLuongPage />} />
              </Route>

              {/* Quản trị viên (Admin) Only - chỉ quản lý tài khoản */}
              <Route element={<ProtectedRoute allowedRoles={['Quản trị viên']} />}>
                <Route path="/tai-khoan" element={<TaiKhoanPage />} />
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
