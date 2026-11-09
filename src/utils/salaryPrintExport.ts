import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { BangLuong } from '../types';
import { formatVND } from './format';
import { numberToVietnameseWords } from './numberToWords';

export function exportBangLuongToExcel(records: BangLuong[], periodTitle: string, filename: string) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['CÔNG TY CỔ PHẦN THỰC PHẨM XIMIFOOD'],
    ['Địa chỉ: Số 123 Đường Số 1, KCN Tân Bình, TP. Hồ Chí Minh - MST: 0312345678'],
    [],
    [`BẢNG THANH TOÁN TIỀN LƯƠNG VÀ CÁC KHOẢN TRÍCH THEO LƯƠNG`],
    [`Kỳ tính lương: ${periodTitle} | Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`],
    [],
  ];

  const headers = [
    'STT',
    'Họ và tên',
    'Phòng ban',
    'Chức vụ',
    'Kỳ lương',
    'Số ngày công',
    'Giờ OT',
    'Lương cơ bản (VNĐ)',
    'Lương OT (VNĐ)',
    'Phụ cấp (VNĐ)',
    'BHXH 10.5% (VNĐ)',
    'Thuế TNCN (VNĐ)',
    'Thực lĩnh (VNĐ)',
    'Trạng thái chi trả',
  ];

  let sumCong = 0;
  let sumOt = 0;
  let sumLuongCb = 0;
  let sumLuongOt = 0;
  let sumPhuCap = 0;
  let sumBhxh = 0;
  let sumThue = 0;
  let sumThucLinh = 0;

  const dataRows = records.map((item, index) => {
    const cong = item.soNgayCong || 0;
    const ot = item.tongGioOt || 0;
    const lcb = item.luongCoBan || 0;
    const lot = item.luongOt || 0;
    const pc = item.phuCap || 0;
    const bh = item.baoHiemXaHoi || 0;
    const tncn = item.thueTncn || 0;
    const tl = item.thucLinh || 0;

    sumCong += cong;
    sumOt += ot;
    sumLuongCb += lcb;
    sumLuongOt += lot;
    sumPhuCap += pc;
    sumBhxh += bh;
    sumThue += tncn;
    sumThucLinh += tl;

    return [
      index + 1,
      item.hoTen || '',
      item.tenPhongBan || '',
      item.tenChucVu || '',
      item.thoiGian || '',
      cong,
      ot,
      lcb,
      lot,
      pc,
      bh,
      tncn,
      tl,
      item.trangThaiChiTra || 'Chờ duyệt',
    ];
  });

  const totalRow = [
    '',
    'TỔNG CỘNG',
    '',
    '',
    '',
    sumCong,
    sumOt,
    sumLuongCb,
    sumLuongOt,
    sumPhuCap,
    sumBhxh,
    sumThue,
    sumThucLinh,
    '',
  ];

  const wordsRow = [
    `Số tiền bằng chữ: ${numberToVietnameseWords(sumThucLinh)}`,
  ];

  const signatureRows = [
    [],
    [],
    ['', 'NGƯỜI LẬP BIỂU', '', '', '', '', 'KẾ TOÁN TRƯỞNG', '', '', '', 'GIÁM ĐỐC / CHỦ DOANH NGHIỆP', '', '', ''],
    ['', '(Ký, ghi rõ họ tên)', '', '', '', '', '(Ký, ghi rõ họ tên)', '', '', '', '(Ký, đóng dấu)', '', '', ''],
  ];

  const allRows = [
    ...titleRows,
    headers,
    ...dataRows,
    totalRow,
    [],
    wordsRow,
    ...signatureRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Bảng Lương');
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

export function printPayrollTable(records: BangLuong[], periodTitle: string) {
  let sumCong = 0;
  let sumOt = 0;
  let sumLuongCb = 0;
  let sumLuongOt = 0;
  let sumPhuCap = 0;
  let sumBhxh = 0;
  let sumThue = 0;
  let sumThucLinh = 0;

  records.forEach((r) => {
    sumCong += r.soNgayCong || 0;
    sumOt += r.tongGioOt || 0;
    sumLuongCb += r.luongCoBan || 0;
    sumLuongOt += r.luongOt || 0;
    sumPhuCap += r.phuCap || 0;
    sumBhxh += r.baoHiemXaHoi || 0;
    sumThue += r.thueTncn || 0;
    sumThucLinh += r.thucLinh || 0;
  });

  const rowsHtml = records
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-weight: 600; text-align: left;">${r.hoTen || ''}</td>
      <td>${r.tenPhongBan || ''}</td>
      <td>${r.tenChucVu || ''}</td>
      <td style="text-align: center;">${r.soNgayCong || 0}</td>
      <td style="text-align: center;">${r.tongGioOt || 0}</td>
      <td style="text-align: right;">${formatVND(r.luongCoBan)}</td>
      <td style="text-align: right;">${formatVND(r.luongOt)}</td>
      <td style="text-align: right;">${formatVND(r.phuCap)}</td>
      <td style="text-align: right; color: #dc2626;">-${formatVND(r.baoHiemXaHoi)}</td>
      <td style="text-align: right; color: #dc2626;">-${formatVND(r.thueTncn)}</td>
      <td style="text-align: right; font-weight: 700; color: #1677ff;">${formatVND(r.thucLinh)}</td>
      <td style="text-align: center;"></td>
    </tr>
  `
    )
    .join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bảng Thanh Toán Lương - ${periodTitle}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      color: #000;
      margin: 0;
      padding: 10px;
      line-height: 1.3;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .company-info {
      text-align: left;
    }
    .company-name {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .template-code {
      text-align: center;
      font-size: 10pt;
    }
    .title-box {
      text-align: center;
      margin: 10px 0 16px 0;
    }
    .title-box h2 {
      margin: 0 0 4px 0;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .title-box p {
      margin: 0;
      font-style: italic;
      font-size: 11pt;
    }
    table.payroll-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    table.payroll-table th, table.payroll-table td {
      border: 1px solid #333;
      padding: 5px 6px;
    }
    table.payroll-table th {
      background-color: #f2f2f2;
      text-align: center;
      font-weight: bold;
    }
    .total-row td {
      font-weight: bold;
      background-color: #fafafa;
    }
    .words-box {
      margin-top: 10px;
      font-size: 11pt;
      font-style: italic;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      page-break-inside: avoid;
      text-align: center;
    }
    .signature-item {
      width: 30%;
    }
    .signature-title {
      font-weight: bold;
      text-transform: uppercase;
    }
    .signature-sub {
      font-size: 10pt;
      font-style: italic;
      margin-bottom: 60px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .toolbar {
      padding: 8px 16px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn {
      padding: 6px 14px;
      font-size: 13px;
      font-family: sans-serif;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #0284c7;
      background: #0284c7;
      color: #fff;
      font-weight: bold;
    }
    .btn:hover { background: #0369a1; }
    .btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
    .btn-secondary:hover { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="btn" onclick="window.print()">In bảng lương / Lưu PDF</button>
    <button class="btn btn-secondary" onclick="window.close()">Đóng cửa sổ</button>
    <span style="font-family: sans-serif; font-size: 12px; color: #64748b; margin-left: 12px;">Mẹo: Chọn 'Lưu dưới dạng PDF' tại ô Máy in để xuất file PDF khổ A4 nằm ngang.</span>
  </div>

  <div class="header-box">
    <div class="company-info">
      <div class="company-name">CÔNG TY CỔ PHẦN THỰC PHẨM XIMIFOOD</div>
      <div>Số 123 Đường Số 1, KCN Tân Bình, TP. Hồ Chí Minh</div>
      <div>MST: 0312345678</div>
    </div>
    <div class="template-code">
      <strong>Mẫu số: 02 - LĐTL</strong><br>
      <em>(Ban hành theo Thông tư 200/2014/TT-BTC)</em>
    </div>
  </div>

  <div class="title-box">
    <h2>BẢNG THANH TOÁN TIỀN LƯƠNG VÀ CÁC KHOẢN TRÍCH THEO LƯƠNG</h2>
    <p>Kỳ tính lương: <strong>${periodTitle}</strong> (Ngày lập: ${dayjs().format('DD/MM/YYYY')})</p>
  </div>

  <table class="payroll-table">
    <thead>
      <tr>
        <th style="width: 28px;">STT</th>
        <th>Họ và tên</th>
        <th>Phòng ban</th>
        <th>Chức vụ</th>
        <th style="width: 50px;">Ngày công</th>
        <th style="width: 48px;">Giờ OT</th>
        <th>Lương cơ bản</th>
        <th>Lương OT</th>
        <th>Phụ cấp</th>
        <th>BHXH (10.5%)</th>
        <th>Thuế TNCN</th>
        <th>Thực lĩnh</th>
        <th style="width: 70px;">Ký nhận</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4" style="text-align: center; text-transform: uppercase;">TỔNG CỘNG</td>
        <td style="text-align: center;">${sumCong}</td>
        <td style="text-align: center;">${sumOt}</td>
        <td style="text-align: right;">${formatVND(sumLuongCb)}</td>
        <td style="text-align: right;">${formatVND(sumLuongOt)}</td>
        <td style="text-align: right;">${formatVND(sumPhuCap)}</td>
        <td style="text-align: right; color: #dc2626;">-${formatVND(sumBhxh)}</td>
        <td style="text-align: right; color: #dc2626;">-${formatVND(sumThue)}</td>
        <td style="text-align: right; color: #1677ff;">${formatVND(sumThucLinh)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="words-box">
    <strong>Số tiền viết bằng chữ:</strong> ${numberToVietnameseWords(sumThucLinh)}
  </div>

  <div class="signature-grid">
    <div class="signature-item">
      <div class="signature-title">Người lập biểu</div>
      <div class="signature-sub">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="signature-item">
      <div class="signature-title">Kế toán trưởng</div>
      <div class="signature-sub">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="signature-item">
      <div class="signature-title">Giám đốc / Chủ doanh nghiệp</div>
      <div class="signature-sub">(Ký, đóng dấu)</div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printSinglePaySlip(slip: BangLuong) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tongThuNhap = (slip.luongCoBan || 0) + (slip.luongOt || 0) + (slip.phuCap || 0);
  const tongKhauTru = (slip.baoHiemXaHoi || 0) + (slip.thueTncn || 0);
  const thucLinh = slip.thucLinh || 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Phiếu Lương - ${slip.hoTen} - ${slip.thoiGian}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      color: #000;
      margin: 0;
      padding: 10px;
      line-height: 1.4;
    }
    .header-box {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .company-name {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 13pt;
    }
    .title-box {
      text-align: center;
      margin-bottom: 20px;
    }
    .title-box h2 {
      margin: 0 0 6px 0;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .emp-info {
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      border: 1px dashed #666;
      padding: 10px 14px;
      border-radius: 4px;
    }
    table.slip-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.slip-table th, table.slip-table td {
      border: 1px solid #333;
      padding: 6px 10px;
    }
    table.slip-table th {
      background-color: #f2f2f2;
      text-align: left;
      font-weight: bold;
    }
    .section-header {
      background-color: #e5e7eb;
      font-weight: bold;
      text-transform: uppercase;
    }
    .net-box {
      border: 2px solid #1677ff;
      background: #eff6ff;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1e3a8a;
    }
    .net-amount {
      font-size: 16pt;
      font-weight: bold;
      color: #1677ff;
    }
    .words-box {
      font-style: italic;
      margin-bottom: 24px;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      text-align: center;
    }
    .signature-item {
      width: 45%;
    }
    .signature-title {
      font-weight: bold;
      text-transform: uppercase;
    }
    .signature-sub {
      font-size: 10pt;
      font-style: italic;
      margin-bottom: 60px;
    }
    @media print {
      .no-print { display: none !important; }
    }
    .toolbar {
      padding: 8px 16px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn {
      padding: 6px 14px;
      font-size: 13px;
      font-family: sans-serif;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #0284c7;
      background: #0284c7;
      color: #fff;
      font-weight: bold;
    }
    .btn:hover { background: #0369a1; }
    .btn-secondary { background: #fff; color: #334155; border-color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="btn" onclick="window.print()">In phiếu lương / Lưu PDF</button>
    <button class="btn btn-secondary" onclick="window.close()">Đóng cửa sổ</button>
  </div>

  <div class="header-box">
    <div class="company-name">CÔNG TY CỔ PHẦN THỰC PHẨM XIMIFOOD</div>
    <div>Số 123 Đường Số 1, KCN Tân Bình, TP. Hồ Chí Minh | MST: 0312345678</div>
  </div>

  <div class="title-box">
    <h2>PHIẾU THANH TOÁN TIỀN LƯƠNG</h2>
    <div>Kỳ lương: <strong>${slip.thoiGian}</strong></div>
  </div>

  <div class="emp-info">
    <div><strong>Họ và tên:</strong> ${slip.hoTen}</div>
    <div><strong>Phòng ban:</strong> ${slip.tenPhongBan || 'Chưa cập nhật'}</div>
    <div><strong>Chức vụ:</strong> ${slip.tenChucVu || 'Chưa cập nhật'}</div>
    <div><strong>Số ngày công thực tế:</strong> ${slip.soNgayCong || 0} ngày</div>
    <div><strong>Tổng số giờ làm thêm (OT):</strong> ${slip.tongGioOt || 0} giờ</div>
    <div><strong>Trạng thái:</strong> ${slip.trangThaiChiTra || 'Đã duyệt'}</div>
  </div>

  <table class="slip-table">
    <thead>
      <tr>
        <th>Khoản mục chi tiết</th>
        <th style="width: 140px; text-align: right;">Số tiền (VNĐ)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-header">
        <td colspan="2">I. CÁC KHOẢN THU NHẬP</td>
      </tr>
      <tr>
        <td>1. Lương cơ bản theo hợp đồng</td>
        <td style="text-align: right;">${formatVND(slip.luongCoBan)}</td>
      </tr>
      <tr>
        <td>2. Tiền lương làm thêm giờ (OT)</td>
        <td style="text-align: right;">${formatVND(slip.luongOt)}</td>
      </tr>
      <tr>
        <td>3. Phụ cấp</td>
        <td style="text-align: right;">${formatVND(slip.phuCap)}</td>
      </tr>
      <tr style="font-weight: bold; background-color: #fafafa;">
        <td>TỔNG THU NHẬP (1 + 2 + 3)</td>
        <td style="text-align: right; color: #1677ff;">${formatVND(tongThuNhap)}</td>
      </tr>

      <tr class="section-header">
        <td colspan="2">II. CÁC KHOẢN TRÍCH TRỪ</td>
      </tr>
      <tr>
        <td>1. Bảo hiểm bắt buộc BHXH, BHYT, BHTN (10.5%)</td>
        <td style="text-align: right; color: #dc2626;">-${formatVND(slip.baoHiemXaHoi)}</td>
      </tr>
      <tr>
        <td>2. Thuế thu nhập cá nhân (TNCN)</td>
        <td style="text-align: right; color: #dc2626;">-${formatVND(slip.thueTncn)}</td>
      </tr>
      <tr style="font-weight: bold; background-color: #fafafa;">
        <td>TỔNG CÁC KHOẢN TRÍCH TRỪ (1 + 2)</td>
        <td style="text-align: right; color: #dc2626;">-${formatVND(tongKhauTru)}</td>
      </tr>
    </tbody>
  </table>

  <div class="net-box">
    <span class="net-title">THỰC LĨNH NHẬN VỀ:</span>
    <span class="net-amount">${formatVND(thucLinh)}</span>
  </div>

  <div class="words-box">
    <strong>Bằng chữ:</strong> ${numberToVietnameseWords(thucLinh)}
  </div>

  <div class="signature-grid">
    <div class="signature-item">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-sub">(Ký, ghi rõ họ tên)</div>
    </div>
    <div class="signature-item">
      <div class="signature-title">Người nhận tiền lương</div>
      <div class="signature-sub">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
