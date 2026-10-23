import axiosClient from './axiosClient';
import { BangLuong } from '../types';

export const bangLuongApi = {
  tinhLuong: (data: { thoiGian: string; maNhanVien?: string }) =>
    axiosClient.post('/bangluong/tinh-luong', data),
  getMine: () => axiosClient.get<BangLuong[]>('/bangluong/cua-toi'),
  getAll: (thoiGian?: string) => axiosClient.get<BangLuong[]>('/bangluong', { params: { thoiGian } }),
  updateTrangThai: (id: string, trangThai: string) =>
    axiosClient.put('/bangluong/' + id + '/trang-thai', { trangThai }),
  pheDuyetKyLuong: (thoiGian: string, trangThai: string = 'Đã chi trả') =>
    axiosClient.post('/bangluong/phe-duyet-ky-luong', { thoiGian, trangThai }),
};