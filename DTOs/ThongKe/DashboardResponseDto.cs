using System.Collections.Generic;

namespace HrmApp.Api.DTOs.ThongKe
{
    public class DashboardResponseDto
    {
        public int TongSoNhanVien { get; set; }
        public int NhanVienMoiTrongThang { get; set; }
        public int DonTuChoDuyet { get; set; }
        public decimal TongQuyLuongThang { get; set; }
        public List<ThongKePhongBanDto> NhanVienTheoPhongBan { get; set; } = new List<ThongKePhongBanDto>();
        public List<ThongKeTrinhDoDto> NhanVienTheoTrinhDo { get; set; } = new List<ThongKeTrinhDoDto>();
        public List<ThongKeThamNienDto> NhanVienTheoThamNien { get; set; } = new List<ThongKeThamNienDto>();
    }

    public class ThongKePhongBanDto { public string TenPhongBan { get; set; } = null!; public int SoLuongNhanVien { get; set; } }
    public class ThongKeTrinhDoDto { public string TrinhDo { get; set; } = null!; public int SoLuong { get; set; } }
    public class ThongKeThamNienDto { public string NhomThamNien { get; set; } = null!; public int SoLuong { get; set; } }
}
