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
  maPhongBan?: string;
  tenPhongBan?: string;
  tenChucVu?: string;
}

export interface UserInfo {
  token: string;
  tenDangNhap: string;
  maTaiKhoan: string;
  maNhanVien: string;
  hoTen: string;
  vaiTro: string;
  maPhongBan?: string;
  tenPhongBan?: string;
  tenChucVu?: string;
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
  maPhongBan?: string;
  tenPhongBan?: string;
  maChucVu?: string;
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
  maPhongBan?: string;
  tenPhongBan?: string;
  tenChucVu?: string;
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
  maPhongBan?: string;
  tenChucVu?: string;
  tenPhongBan?: string;
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
  tenPhongBan?: string;
  tenChucVu?: string;
  vaiTro?: string;
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
  nhanVienTheoMucLuong: { mucLuong: string; soLuong: number }[];
  tinhHinhNhanSu: {
    dangLamViec: { maNhanVien: string; hoTen: string; tenPhongBan: string; tenChucVu: string; ngayVaoLam?: string }[];
    nghiPhep: { maNhanVien: string; hoTen: string; tenPhongBan: string; loaiDon: string; soNgayNghi: number; ngayBatDau: string; ngayKetThuc: string }[];
    daNghiViec: { maNhanVien: string; hoTen: string; tenPhongBan: string; tenChucVu: string; ngayNghiViec?: string }[];
  };
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
  tenPhongBan?: string;
  tenChucVu?: string;
  tenVaiTro?: string;
  trangThai: string;
  ngayTao: string;
}
