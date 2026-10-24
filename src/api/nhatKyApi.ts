import axiosClient from './axiosClient';
import { NhatKyListResponse } from '../types';

export interface NhatKyQueryParams {
  keyword?: string;
  hanhDong?: string;
  trangThai?: string;
  tuNgay?: string;
  denNgay?: string;
  page?: number;
  pageSize?: number;
}

export const nhatKyApi = {
  getLogs: (params?: NhatKyQueryParams) =>
    axiosClient.get<NhatKyListResponse>('/nhatky', { params }),
  getActions: () =>
    axiosClient.get<string[]>('/nhatky/actions'),
};
