import axiosClient from './axiosClient';

export interface PhongBan {
  maPhongBan: string;
  tenPhongBan: string;
}

export interface ChucVu {
  maChucVu: string;
  tenChucVu: string;
  phuCapChucVu: number;
}

export interface VaiTro {
  maVaiTro: string;
  tenVaiTro: string;
}

export const danhMucApi = {
  getPhongBans: () => axiosClient.get<PhongBan[]>('/danhmuc/phong-ban'),
  getChucVus: () => axiosClient.get<ChucVu[]>('/danhmuc/chuc-vu'),
  getVaiTros: () => axiosClient.get<VaiTro[]>('/danhmuc/vai-tro'),
};