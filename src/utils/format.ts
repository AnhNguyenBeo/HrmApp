export const formatVND = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0 đ';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 đ';
  return `${Math.round(num).toLocaleString('vi-VN')} đ`;
};

export const formatDeductionVND = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0 đ';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0 đ';
  const rounded = Math.round(num);
  if (rounded <= 0) return '0 đ';
  return `-${rounded.toLocaleString('vi-VN')} đ`;
};

export const formatNumberVND = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('vi-VN');
};
