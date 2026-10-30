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
import { NhatKyPage } from './pages/NhatKy';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

const HomeRedirect: React.FC = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.vaiTro;

  if (role === 'Quản trị viên') return <Navigate to="/tai-khoan" replace />;
  if (role === 'Chủ doanh nghiệp' || role === 'Quản lý') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/profile" replace />;
};

export const App: React.FC = () => {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/profile" element={<Profile />} />

              <Route element={<ProtectedRoute allowedRoles={['Quản lý', 'Nhân viên']} />}>
                <Route path="/cham-cong" element={<ChamCongPage />} />
                <Route path="/don-tu" element={<DonTuPage />} />
                <Route path="/bang-luong" element={<BangLuongPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Chủ doanh nghiệp', 'Quản lý']} />}>
                <Route path="/nhan-vien" element={<NhanVienPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Chủ doanh nghiệp', 'Quản lý']} allowDepartments={['Kế toán']} />}>
                <Route path="/tinh-luong" element={<TinhLuongPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Chủ doanh nghiệp', 'Quản lý']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/don-tu/quan-ly" element={<DuyetDonTuPage />} />
                <Route path="/cham-cong-quan-ly" element={<ChamCongQuanLyPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Quản trị viên']} />}>
                <Route path="/tai-khoan" element={<TaiKhoanPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Quản trị viên', 'Chủ doanh nghiệp']} />}>
                <Route path="/nhat-ky" element={<NhatKyPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
