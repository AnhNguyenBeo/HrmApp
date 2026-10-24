import axiosClient from './axiosClient';
import { DashboardData } from '../types';

export const thongKeApi = {
  getDashboard: (thoiGian?: string) => axiosClient.get<DashboardData>('/thongke/dashboard', { params: { thoiGian } }),
};