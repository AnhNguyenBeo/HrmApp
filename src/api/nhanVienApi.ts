import axiosClient from './axiosClient';
import { NhanVien } from '../types';

export const nhanVienApi = {
  getAll: (params?: any) => axiosClient.get<any>('/nhanvien', { params }),
  getById: (id: string) => axiosClient.get<NhanVien>('/nhanvien/' + id),
  create: (data: any) => axiosClient.post('/nhanvien', data),
  update: (id: string, data: any) => axiosClient.put('/nhanvien/' + id, data),
  softDelete: (id: string) => axiosClient.delete('/nhanvien/' + id),
  restore: (id: string) => axiosClient.post('/nhanvien/' + id + '/khoi-phuc'),
  checkPhone: (phone: string, excludeId?: string) =>
    axiosClient.get<{ exists: boolean }>('/nhanvien/check-phone', {
      params: { phone, excludeId },
    }),
  checkCccd: (cccd: string, excludeId?: string) =>
    axiosClient.get<{ exists: boolean }>('/nhanvien/check-cccd', {
      params: { cccd, excludeId },
    }),
  updateMyProfile: (data: { soDienThoai?: string; email?: string; diaChi?: string }) =>
    axiosClient.put('/nhanvien/ho-so-cua-toi', data),
};