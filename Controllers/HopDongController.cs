using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.HopDong;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HopDongController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;

        public HopDongController(QuanLyNhanSuDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách hợp đồng
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<HopDongResponseDto>>> GetHopDongs([FromQuery] Guid? nhanVienId)
        {
            var query = _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .AsQueryable();

            if (nhanVienId.HasValue)
            {
                query = query.Where(h => h.MaNhanVien == nhanVienId.Value);
            }

            var result = await query.Select(h => new HopDongResponseDto
            {
                MaHopDong = h.MaHopDong,
                MaNhanVien = h.MaNhanVien,
                TenNhanVien = h.MaNhanVienNavigation != null ? h.MaNhanVienNavigation.HoTen : "",
                LoaiHopDong = h.LoaiHopDong,
                NgayBatDau = h.NgayBatDau,
                NgayKetThuc = h.NgayKetThuc,
                LuongCoBan = h.LuongCoBan,
                TrangThai = h.TrangThai,
                LuongThuong = h.LuongThuong
            }).ToListAsync();

            return Ok(result);
        }

        /// <summary>
        /// Lấy hợp đồng theo ID
        /// </summary>
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<HopDongResponseDto>> GetHopDong(Guid id)
        {
            var hopDong = await _context.HopDongLaoDongs
                .Include(h => h.MaNhanVienNavigation)
                .Where(h => h.MaHopDong == id)
                .Select(h => new HopDongResponseDto
                {
                    MaHopDong = h.MaHopDong,
                    MaNhanVien = h.MaNhanVien,
                    TenNhanVien = h.MaNhanVienNavigation != null ? h.MaNhanVienNavigation.HoTen : "",
                    LoaiHopDong = h.LoaiHopDong,
                    NgayBatDau = h.NgayBatDau,
                    NgayKetThuc = h.NgayKetThuc,
                    LuongCoBan = h.LuongCoBan,
                    TrangThai = h.TrangThai,
                    LuongThuong = h.LuongThuong
                })
                .FirstOrDefaultAsync();

            if (hopDong == null)
            {
                return NotFound("Không tìm thấy hợp đồng.");
            }

            return Ok(hopDong);
        }

        /// <summary>
        /// Tạo hợp đồng mới
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<ActionResult<HopDongResponseDto>> PostHopDong([FromBody] CreateHopDongDto dto)
        {
            var hopDong = new HopDongLaoDong
            {
                MaHopDong = Guid.NewGuid(),
                MaNhanVien = dto.MaNhanVien,
                LoaiHopDong = dto.LoaiHopDong,
                NgayBatDau = dto.NgayBatDau,
                NgayKetThuc = dto.NgayKetThuc,
                LuongCoBan = dto.LuongCoBan,
                TrangThai = dto.TrangThai,
                LuongThuong = dto.LuongThuong
            };

            _context.HopDongLaoDongs.Add(hopDong);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetHopDong), new { id = hopDong.MaHopDong }, null);
        }

        /// <summary>
        /// Cập nhật hợp đồng
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<IActionResult> PutHopDong(Guid id, [FromBody] UpdateHopDongDto dto)
        {
            var hopDong = await _context.HopDongLaoDongs.FindAsync(id);
            if (hopDong == null)
            {
                return NotFound("Không tìm thấy hợp đồng.");
            }

            hopDong.LoaiHopDong = dto.LoaiHopDong;
            hopDong.NgayBatDau = dto.NgayBatDau;
            hopDong.NgayKetThuc = dto.NgayKetThuc;
            hopDong.LuongCoBan = dto.LuongCoBan;
            hopDong.TrangThai = dto.TrangThai;
            hopDong.LuongThuong = dto.LuongThuong;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Chấm dứt hợp đồng
        /// </summary>
        [HttpPut("{id}/cham-dut")]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<IActionResult> TerminateHopDong(Guid id)
        {
            var hopDong = await _context.HopDongLaoDongs.FindAsync(id);
            if (hopDong == null)
            {
                return NotFound("Không tìm thấy hợp đồng.");
            }

            hopDong.TrangThai = "Đã chấm dứt";
            hopDong.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
