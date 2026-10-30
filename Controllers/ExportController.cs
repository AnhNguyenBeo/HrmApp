using System;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ExportController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public ExportController(QuanLyNhanSuDbContext context) { _context = context; }

        private static string EscapeCsv(string? input)
        {
            if (string.IsNullOrEmpty(input)) return "\"\"";
            var val = input;
            if (val.StartsWith("=") || val.StartsWith("+") || val.StartsWith("-") || val.StartsWith("@"))
            {
                val = "'" + val;
            }
            if (val.Contains("\"") || val.Contains(",") || val.Contains("\n") || val.Contains("\r"))
            {
                val = val.Replace("\"", "\"\"");
                return $"\"{val}\"";
            }
            return $"\"{val}\"";
        }

        [HttpGet("bang-luong")]
        public async Task<IActionResult> ExportBangLuong([FromQuery] string? thoiGianThang, [FromQuery] int? nam)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" || c.Type == "role");
            var role = roleClaim?.Value;

            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var query = _context.BangLuongs.Include(b => b.MaNhanVienNavigation).AsQueryable();

            bool isAccounting = false;
            var nv = await _context.NhanViens.Include(n => n.MaPhongBanNavigation).FirstOrDefaultAsync(n => n.MaNhanVien == maNhanVien);
            var tenPB = nv?.MaPhongBanNavigation?.TenPhongBan ?? "";
            isAccounting = role == "Quản lý" && tenPB.ToLower().Contains("kế toán");

            if (role != "Chủ doanh nghiệp" && !isAccounting)
            {
                query = query.Where(b => b.MaNhanVien == maNhanVien);
            }

            if (!string.IsNullOrEmpty(thoiGianThang))
            {
                query = query.Where(b => b.ThoiGian == thoiGianThang);
            }
            else if (nam.HasValue)
            {
                query = query.Where(b => b.ThoiGian.EndsWith("/" + nam.Value));
            }

            var data = await query.ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("Mã Bảng Lương,Họ Tên,Thời Gian,Ngày Công,Giờ OT,Lương Cơ Bản,Lương OT,Bảo Hiểm Xã Hội,Thuế TNCN,Thực Lĩnh");

            foreach (var item in data)
            {
                var id = EscapeCsv(item.MaBangLuong.ToString());
                var ten = EscapeCsv(item.MaNhanVienNavigation != null ? item.MaNhanVienNavigation.HoTen : "Unknown");
                var tg = EscapeCsv(item.ThoiGian);
                var ngayCong = item.SoNgayCong.ToString(CultureInfo.InvariantCulture);
                var gioOt = item.TongGioOt.ToString(CultureInfo.InvariantCulture);
                var luongCb = item.LuongCoBan.ToString(CultureInfo.InvariantCulture);
                var luongOt = (item.LuongOt ?? 0).ToString(CultureInfo.InvariantCulture);
                var bhxh = (item.BaoHiemXaHoi ?? 0).ToString(CultureInfo.InvariantCulture);
                var thue = (item.ThueTncn ?? 0).ToString(CultureInfo.InvariantCulture);
                var thucLinh = (item.ThucLinh ?? 0).ToString(CultureInfo.InvariantCulture);

                sb.AppendLine($"{id},{ten},{tg},{ngayCong},{gioOt},{luongCb},{luongOt},{bhxh},{thue},{thucLinh}");
            }

            var BOM = new byte[] { 0xEF, 0xBB, 0xBF };
            var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
            var finalBytes = BOM.Concat(contentBytes).ToArray();

            var fileName = $"BangLuong_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            return File(finalBytes, "text/csv", fileName);
        }
    }
}
