import axiosClient from './axiosClient';
import { DonTu } from '../types';

export const donTuApi = {
  create: (data: { loaiDon: string; loaiNghi?: string; ngayBatDau: string; ngayKetThuc: string; lyDo: string }) =>
    axiosClient.post('/dontu', data),
  getMine: () => axiosClient.get<DonTu[]>('/dontu/cua-toi'),
  getAll: () => axiosClient.get<DonTu[]>('/dontu'),
  approve: (id: string, data: { trangThai: string; ghiChuDuyet?: string }) =>
    axiosClient.put('/dontu/' + id + '/duyet', data),
  cancel: (id: string) => axiosClient.delete('/dontu/' + id),
};