namespace HrmApp.Api.DTOs.BangLuong
{
    public class UpdateTrangThaiDto
    {
        public string? TrangThai { get; set; }
    }

    public class PheDuyetKyLuongDto
    {
        public string ThoiGian { get; set; } = null!;
        public string? TrangThai { get; set; }
    }
}
