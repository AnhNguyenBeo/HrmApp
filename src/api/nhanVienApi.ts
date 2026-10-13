import axiosClient from './axiosClient';
import { NhanVien } from '../types';

export const nhanVienApi = {
  getAll: (params?: any) => axiosClient.get<any>('/nhanvien', { params }),
  getById: (id: string) => axiosClient.get<NhanVien>('/nhanvien/' + id),
  create: (data: any) => axiosClient.post('/nhanvien', data),
  update: (id: string, data: any) => axiosClient.put('/nhanvien/' + id, data),
  softDelete: (id: string) => axiosClient.delete('/nhanvien/' + id),
  updateMyProfile: (data: { soDienThoai?: string; email?: string; diaChi?: string }) =>
    axiosClient.put('/nhanvien/ho-so-cua-toi', data),
};