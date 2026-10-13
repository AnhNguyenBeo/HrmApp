import axiosClient from './axiosClient';
import { DashboardData } from '../types';

export const thongKeApi = {
  getDashboard: () => axiosClient.get<DashboardData>('/thongke/dashboard'),
};