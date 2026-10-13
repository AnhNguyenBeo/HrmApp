import axiosClient from './axiosClient';

export const exportApi = {
  exportBangLuong: (thoiGianThang?: string, nam?: number) =>
    axiosClient.get('/export/bang-luong', {
      params: { thoiGianThang, nam },
      responseType: 'blob',
    }),
};