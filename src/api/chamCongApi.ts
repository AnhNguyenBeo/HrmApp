import axiosClient from './axiosClient';
import { ChamCong } from '../types';

export const chamCongApi = {
  checkInOut: (ngay: string) => axiosClient.post('/chamcong/check-in-out', { ngay }),
  getMyAttendance: (month?: number, year?: number) =>
    axiosClient.get<ChamCong[]>('/chamcong/cua-toi', { params: { month, year } }),
  getAll: () => axiosClient.get<ChamCong[]>('/chamcong'),
};