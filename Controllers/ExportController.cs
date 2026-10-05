using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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

        [HttpGet("bang-luong")]
        public async Task<IActionResult> ExportBangLuong([FromQuery] string? thoiGianThang, [FromQuery] int? nam)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            var roleClaim = User.Claims.FirstOrDefault(c => c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role" || c.Type == "role");
            var role = roleClaim?.Value;

            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var query = _context.BangLuongs.Include(b => b.MaNhanVienNavigation).AsQueryable();

            // Phân quyền
            if (role != "Quản trị viên" && role != "Kế toán" && role != "Quản lý") {
                query = query.Where(b => b.MaNhanVien == maNhanVien);
            }

            // Filter
            if (!string.IsNullOrEmpty(thoiGianThang)) {
                query = query.Where(b => b.ThoiGian == thoiGianThang);
            } else if (nam.HasValue) {
                query = query.Where(b => b.ThoiGian.EndsWith("/" + nam.Value));
            }

            var data = await query.ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("Mã Bảng Lương,Họ Tên,Thời Gian,Ngày Công,Giờ OT,Lương Cơ Bản,Lương OT,Bảo Hiểm Xã Hội,Thuế TNCN,Thực Lĩnh");

            foreach (var item in data)
            {
                var ten = item.MaNhanVienNavigation != null ? item.MaNhanVienNavigation.HoTen : "Unknown";
                sb.AppendLine($"{item.MaBangLuong},{ten},{item.ThoiGian},{item.SoNgayCong},{item.TongGioOt},{item.LuongCoBan},{item.LuongOt},{item.BaoHiemXaHoi},{item.ThueTncn},{item.ThucLinh}");
            }

            var BOM = new byte[] { 0xEF, 0xBB, 0xBF };
            var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
            var finalBytes = BOM.Concat(contentBytes).ToArray();

            var fileName = $"BangLuong_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            return File(finalBytes, "text/csv", fileName);
        }
    }
}
