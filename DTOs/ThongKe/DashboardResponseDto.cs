using System;
using System.Collections.Generic;

namespace HrmApp.Api.DTOs.ThongKe
{
    public class DashboardResponseDto
    {
        public int TongSoNhanVien { get; set; }
        public int NhanVienMoiTrongThang { get; set; }
        public int DonTuChoDuyet { get; set; }
        public bool CanViewPayroll { get; set; }
        public decimal TongQuyLuongThang { get; set; }
        public decimal LuongDaChiTraThang { get; set; }
        public decimal LuongChoChiTraThang { get; set; }
        public int SoBangLuongDaChiTra { get; set; }
        public int SoBangLuongChoChiTra { get; set; }
        public List<ThongKePhongBanDto> NhanVienTheoPhongBan { get; set; } = new List<ThongKePhongBanDto>();
        public List<ThongKeTrinhDoDto> NhanVienTheoTrinhDo { get; set; } = new List<ThongKeTrinhDoDto>();
        public List<ThongKeThamNienDto> NhanVienTheoThamNien { get; set; } = new List<ThongKeThamNienDto>();
        public List<ThongKeMucLuongDto> NhanVienTheoMucLuong { get; set; } = new List<ThongKeMucLuongDto>();
        public TinhHinhNhanSuThangDto TinhHinhNhanSu { get; set; } = new TinhHinhNhanSuThangDto();
    }

    public class ThongKePhongBanDto { public string TenPhongBan { get; set; } = null!; public int SoLuongNhanVien { get; set; } }
    public class ThongKeTrinhDoDto { public string TrinhDo { get; set; } = null!; public int SoLuong { get; set; } }
    public class ThongKeThamNienDto { public string NhomThamNien { get; set; } = null!; public int SoLuong { get; set; } }
    public class ThongKeMucLuongDto { public string MucLuong { get; set; } = null!; public int SoLuong { get; set; } }

    public class TinhHinhNhanSuThangDto
    {
        public List<NhanSuStatusDto> DangLamViec { get; set; } = new List<NhanSuStatusDto>();
        public List<NhanSuNghiPhepDto> NghiPhep { get; set; } = new List<NhanSuNghiPhepDto>();
        public List<NhanSuStatusDto> DaNghiViec { get; set; } = new List<NhanSuStatusDto>();
    }

    public class NhanSuStatusDto
    {
        public Guid MaNhanVien { get; set; }
        public string HoTen { get; set; } = null!;
        public string TenPhongBan { get; set; } = "";
        public string TenChucVu { get; set; } = "";
        public DateOnly? NgayVaoLam { get; set; }
        public DateOnly? NgayNghiViec { get; set; }
    }

    public class NhanSuNghiPhepDto
    {
        public Guid MaNhanVien { get; set; }
        public string HoTen { get; set; } = null!;
        public string TenPhongBan { get; set; } = "";
        public string LoaiDon { get; set; } = "";
        public decimal SoNgayNghi { get; set; }
        public DateOnly NgayBatDau { get; set; }
        public DateOnly NgayKetThuc { get; set; }
    }
}