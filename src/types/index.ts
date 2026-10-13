export interface LoginRequest {
  tenDangNhap: string;
  matKhau: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  tenDangNhap: string;
  maTaiKhoan: string;
  maNhanVien: string;
  hoTen: string;
  vaiTro: string;
}

export interface UserInfo {
  token: string;
  tenDangNhap: string;
  maTaiKhoan: string;
  maNhanVien: string;
  hoTen: string;
  vaiTro: string;
}

export interface NhanVien {
  maNhanVien: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  cccd: string;
  email: string;
  soDienThoai: string;
  diaChi: string;
  trinhDoHocVan: string;
  tenPhongBan?: string;
  tenChucVu?: string;
  ngayVaoLam: string;
  trangThaiLamViec: string;
  ngayNghiViec?: string;
  ghiChu?: string;
}

export interface ChamCong {
  maChamCong: string;
  maNhanVien: string;
  hoTen?: string;
  ngay: string;
  gioVao: string;
  gioRa: string;
  soGioTangCa?: number;
  trangThai: string;
}

export interface DonTu {
  maDon: string;
  maNhanVien: string;
  hoTen?: string;
  loaiDon: string;
  loaiNghi?: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soNgayNghi: number;
  lyDo: string;
  trangThai: string;
  tenNguoiDuyet?: string;
  ngayDuyet?: string;
  ghiChuDuyet?: string;
}

export interface BangLuong {
  maBangLuong: string;
  maNhanVien: string;
  hoTen?: string;
  thoiGian: string;
  luongCoBan: number;
  phuCap?: number;
  thucLinh: number;
  ngayCongChuan?: number;
  soNgayCong?: number;
  tongGioOt?: number;
  luongOt?: number;
  baoHiemXaHoi?: number;
  thueTncn?: number;
  trangThaiChiTra?: string;
}

export interface DashboardData {
  tongSoNhanVien: number;
  nhanVienMoiTrongThang: number;
  donTuChoDuyet: number;
  tongQuyLuongThang: number;
  nhanVienTheoPhongBan: { tenPhongBan: string; soLuongNhanVien: number }[];
  nhanVienTheoTrinhDo: { trinhDo: string; soLuong: number }[];
  nhanVienTheoThamNien: { nhomThamNien: string; soLuong: number }[];
}

export interface HopDong {
  maHopDong: string;
  maNhanVien: string;
  hoTenNhanVien?: string;
  loaiHopDong: string;
  ngayBatDau: string;
  ngayKetThuc?: string;
  luongCoBan: number;
  trangThai: string;
  luongThuong?: number;
}

export interface TaiKhoan {
  maTaiKhoan: string;
  maNhanVien: string;
  tenDangNhap: string;
  tenNhanVien?: string;
  tenVaiTro?: string;
  trangThai: string;
  ngayTao: string;
}