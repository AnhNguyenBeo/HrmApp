namespace HrmApp.Api.Constants;

public static class TrangThaiLuong
{
    public const string ChoDuyet = "Chờ duyệt";
    public const string DaChiTra = "Đã chi trả";
    public const string DaThanhToan = "Đã thanh toán";

    public static bool IsDaChiTra(string? status)
    {
        return status == DaChiTra || status == DaThanhToan;
    }

    public static bool IsValidTargetStatus(string? status)
    {
        return status == ChoDuyet || status == DaChiTra;
    }
}