import axiosClient from './axiosClient';
import { BangLuong } from '../types';

export const bangLuongApi = {
  tinhLuong: (data: { thoiGian: string; maNhanVien?: string }) =>
    axiosClient.post('/bangluong/tinh-luong', data),
  getMine: () => axiosClient.get<BangLuong[]>('/bangluong/cua-toi'),
  getAll: () => axiosClient.get<BangLuong[]>('/bangluong'),
};