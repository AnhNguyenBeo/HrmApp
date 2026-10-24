using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Quản trị viên, Chủ doanh nghiệp")]
    public class NhatKyController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;

        public NhatKyController(QuanLyNhanSuDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs(
            [FromQuery] string? keyword,
            [FromQuery] string? hanhDong,
            [FromQuery] string? trangThai,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? tuNgay,
            [FromQuery] DateTime? toDate,
            [FromQuery] DateTime? denNgay,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.NhatKyHoatDongs.AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(l =>
                    l.TenDangNhap.ToLower().Contains(kw) ||
                    (l.HoTen != null && l.HoTen.ToLower().Contains(kw)) ||
                    l.HanhDong.ToLower().Contains(kw) ||
                    (l.ChiTiet != null && l.ChiTiet.ToLower().Contains(kw)));
            }

            if (!string.IsNullOrEmpty(hanhDong) && hanhDong != "ALL")
            {
                query = query.Where(l => l.HanhDong == hanhDong);
            }

            if (!string.IsNullOrEmpty(trangThai) && trangThai != "ALL")
            {
                query = query.Where(l => l.TrangThai == trangThai);
            }

            var fDate = fromDate ?? tuNgay;
            if (fDate.HasValue)
            {
                var from = fDate.Value.Date;
                query = query.Where(l => l.ThoiGian >= from);
            }

            var tDate = toDate ?? denNgay;
            if (tDate.HasValue)
            {
                var to = tDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(l => l.ThoiGian <= to);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(l => l.ThoiGian)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                Items = items
            });
        }

        [HttpGet("actions")]
        public async Task<IActionResult> GetDistinctActions()
        {
            var actions = await _context.NhatKyHoatDongs
                .Select(l => l.HanhDong)
                .Distinct()
                .ToListAsync();
            return Ok(actions);
        }
    }
}
