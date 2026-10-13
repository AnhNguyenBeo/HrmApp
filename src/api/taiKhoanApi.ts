import axiosClient from './axiosClient';
import { TaiKhoan } from '../types';

export const taiKhoanApi = {
  getAll: () => axiosClient.get<TaiKhoan[]>('/taikhoan'),
  getById: (id: string) => axiosClient.get<TaiKhoan>('/taikhoan/' + id),
  create: (data: { maNhanVien: string; tenDangNhap: string; matKhau: string; maVaiTro: string }) =>
    axiosClient.post('/taikhoan', data),
  changeRole: (id: string, maVaiTro: string) =>
    axiosClient.put('/taikhoan/' + id + '/vai-tro', maVaiTro, {
      headers: { 'Content-Type': 'application/json' }
    }),
  changePassword: (id: string, data: { matKhauCu: string; matKhauMoi: string }) =>
    axiosClient.put('/taikhoan/' + id + '/doi-mat-khau', data),
  lock: (id: string) => axiosClient.delete('/taikhoan/' + id),
};