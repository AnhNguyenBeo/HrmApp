import axiosClient from './axiosClient';

export const exportApi = {
  exportBangLuong: (thoiGianThang?: string, nam?: number, caNhan?: boolean) =>
    axiosClient.get('/export/bang-luong', {
      params: { thoiGianThang, nam, caNhan },
      responseType: 'blob',
    }),
};