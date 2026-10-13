using HrmApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DanhMucController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;
        public DanhMucController(QuanLyNhanSuDbContext context) { _context = context; }

        [HttpGet("phong-ban")]
        public async Task<IActionResult> GetPhongBans()
        {
            var data = await _context.PhongBans.Select(p => new { p.MaPhongBan, p.TenPhongBan }).ToListAsync();
            return Ok(data);
        }

        [HttpGet("chuc-vu")]
        public async Task<IActionResult> GetChucVus()
        {
            var data = await _context.ChucVus.Select(c => new { c.MaChucVu, c.TenChucVu, c.PhuCapChucVu }).ToListAsync();
            return Ok(data);
        }

        [HttpGet("vai-tro")]
        public async Task<IActionResult> GetVaiTros()
        {
            var data = await _context.VaiTros.Select(v => new { v.MaVaiTro, v.TenVaiTro }).ToListAsync();
            return Ok(data);
        }
    }
}