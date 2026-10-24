using System.Threading.Tasks;

namespace HrmApp.Api.Services;

public interface INhatKyService
{
    Task GhiLogAsync(string tenDangNhap, string? hoTen, string hanhDong, string chiTiet, string trangThai = "Thành công", string? diaChiIp = null);
}
