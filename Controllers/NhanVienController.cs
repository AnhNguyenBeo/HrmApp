using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HrmApp.Api.Data;
using HrmApp.Api.Data.Models;
using HrmApp.Api.DTOs.NhanVien;
using HrmApp.Api.DTOs.Shared;

namespace HrmApp.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NhanVienController : ControllerBase
    {
        private readonly QuanLyNhanSuDbContext _context;

        public NhanVienController(QuanLyNhanSuDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy danh sách nhân viên có phân trang và tìm kiếm
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<ActionResult<PagedResultDto<NhanVienResponseDto>>> GetNhanViens([FromQuery] NhanVienSearchDto search)
        {
            var query = _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search.Keyword))
            {
                var kw = search.Keyword.ToLower();
                query = query.Where(n => n.HoTen.ToLower().Contains(kw) 
                                      || n.Email.ToLower().Contains(kw) 
                                      || n.Cccd.Contains(kw));
            }

            if (search.MaPhongBan.HasValue)
            {
                query = query.Where(n => n.MaPhongBan == search.MaPhongBan.Value);
            }

            if (search.MaChucVu.HasValue)
            {
                query = query.Where(n => n.MaChucVu == search.MaChucVu.Value);
            }

            if (!string.IsNullOrEmpty(search.TrangThaiLamViec))
            {
                query = query.Where(n => n.TrangThaiLamViec == search.TrangThaiLamViec);
            }

            var totalCount = await query.CountAsync();
            
            var items = await query
                .Skip((search.Page - 1) * search.PageSize)
                .Take(search.PageSize)
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .ToListAsync();

            return Ok(new PagedResultDto<NhanVienResponseDto>
            {
                TotalCount = totalCount,
                Page = search.Page,
                PageSize = search.PageSize,
                Items = items
            });
        }

        /// <summary>
        /// Lấy thông tin nhân viên theo ID
        /// </summary>
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<NhanVienResponseDto>> GetNhanVien(Guid id)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Where(n => n.MaNhanVien == id)
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .FirstOrDefaultAsync();

            if (nhanVien == null)
            {
                return NotFound("Không tìm thấy nhân viên.");
            }

            return Ok(nhanVien);
        }

        /// <summary>
        /// Tìm kiếm nhân viên
        /// </summary>
        [HttpGet("search")]
        [Authorize]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<NhanVienResponseDto>>> Search([FromQuery] string keyword)
        {
            if (string.IsNullOrEmpty(keyword))
            {
                return BadRequest("Từ khóa tìm kiếm không được để trống.");
            }

            var kw = keyword.ToLower();
            var nhanViens = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Where(n => n.HoTen.ToLower().Contains(kw) || n.Email.ToLower().Contains(kw) || n.Cccd.Contains(kw))
                .Select(n => new NhanVienResponseDto
                {
                    MaNhanVien = n.MaNhanVien,
                    HoTen = n.HoTen,
                    NgaySinh = n.NgaySinh,
                    GioiTinh = n.GioiTinh,
                    Cccd = n.Cccd,
                    Email = n.Email,
                    SoDienThoai = n.SoDienThoai,
                    DiaChi = n.DiaChi,
                    TrinhDoHocVan = n.TrinhDoHocVan,
                    MaPhongBan = n.MaPhongBan,
                    TenPhongBan = n.MaPhongBanNavigation != null ? n.MaPhongBanNavigation.TenPhongBan : "",
                    MaChucVu = n.MaChucVu,
                    TenChucVu = n.MaChucVuNavigation != null ? n.MaChucVuNavigation.TenChucVu : "",
                    NgayVaoLam = n.NgayVaoLam,
                    TrangThaiLamViec = n.TrangThaiLamViec,
                    NgayNghiViec = n.NgayNghiViec,
                    GhiChu = n.GhiChu
                })
                .ToListAsync();

            return Ok(nhanViens);
        }

        /// <summary>
        /// Tạo mới nhân viên
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<ActionResult<NhanVienResponseDto>> PostNhanVien([FromBody] CreateNhanVienDto dto)
        {
            var nhanVien = new NhanVien
            {
                MaNhanVien = Guid.NewGuid(),
                HoTen = dto.HoTen,
                NgaySinh = dto.NgaySinh,
                GioiTinh = dto.GioiTinh,
                Cccd = dto.Cccd,
                Email = dto.Email,
                SoDienThoai = dto.SoDienThoai,
                DiaChi = dto.DiaChi,
                TrinhDoHocVan = dto.TrinhDoHocVan,
                MaPhongBan = dto.MaPhongBan,
                MaChucVu = dto.MaChucVu,
                NgayVaoLam = dto.NgayVaoLam,
                TrangThaiLamViec = dto.TrangThaiLamViec,
                GhiChu = dto.GhiChu
            };

            _context.NhanViens.Add(nhanVien);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetNhanVien), new { id = nhanVien.MaNhanVien }, null);
        }

        /// <summary>
        /// Cập nhật thông tin nhân viên
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<IActionResult> PutNhanVien(Guid id, [FromBody] UpdateNhanVienDto dto)
        {
            var nhanVien = await _context.NhanViens.FindAsync(id);
            if (nhanVien == null)
            {
                return NotFound("Không tìm thấy nhân viên.");
            }

            nhanVien.HoTen = dto.HoTen;
            nhanVien.NgaySinh = dto.NgaySinh;
            nhanVien.GioiTinh = dto.GioiTinh;
            nhanVien.Cccd = dto.Cccd;
            nhanVien.Email = dto.Email;
            nhanVien.SoDienThoai = dto.SoDienThoai;
            nhanVien.DiaChi = dto.DiaChi;
            nhanVien.TrinhDoHocVan = dto.TrinhDoHocVan;
            nhanVien.MaPhongBan = dto.MaPhongBan;
            nhanVien.MaChucVu = dto.MaChucVu;
            nhanVien.TrangThaiLamViec = dto.TrangThaiLamViec;
            nhanVien.NgayNghiViec = dto.NgayNghiViec;
            nhanVien.GhiChu = dto.GhiChu;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Thay đổi chức vụ
        /// </summary>
        [HttpPut("{id}/chuc-vu")]
        [Authorize(Roles = "Quản trị viên,Quản lý")]
        public async Task<IActionResult> ChangeChucVu(Guid id, [FromBody] Guid maChucVu)
        {
            var nhanVien = await _context.NhanViens.FindAsync(id);
            if (nhanVien == null)
            {
                return NotFound("Không tìm thấy nhân viên.");
            }

            nhanVien.MaChucVu = maChucVu;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Xóa mềm nhân viên
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Quản trị viên")]
        public async Task<IActionResult> DeleteNhanVien(Guid id)
        {
            var nhanVien = await _context.NhanViens.FindAsync(id);
            if (nhanVien == null)
            {
                return NotFound("Không tìm thấy nhân viên.");
            }

            nhanVien.TrangThaiLamViec = "Đã nghỉ việc";
            nhanVien.NgayNghiViec = DateOnly.FromDateTime(DateTime.Now);
            await _context.SaveChangesAsync();

            return NoContent();
        }        
                [HttpPut("ho-so-cua-toi")]
        [Authorize]
        public async Task<IActionResult> UpdateHoSoCuaToi([FromBody] UpdateHoSoCuaToiDto request)
        {
            var maNhanVienStr = User.FindFirst("MaNhanVien")?.Value;
            if (!Guid.TryParse(maNhanVienStr, out var maNhanVien)) return Unauthorized();

            var nhanVien = await _context.NhanViens.FindAsync(maNhanVien);
            if (nhanVien == null) return NotFound(new { message = "Không tìm thấy nhân viên." });

            if (!string.IsNullOrEmpty(request.SoDienThoai)) nhanVien.SoDienThoai = request.SoDienThoai;
            if (!string.IsNullOrEmpty(request.Email)) nhanVien.Email = request.Email;
            if (!string.IsNullOrEmpty(request.DiaChi)) nhanVien.DiaChi = request.DiaChi;

            _context.NhanViens.Update(nhanVien);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật hớsơ cá nhân thành#ông." });
        }
    }
}

namespace HrmApp.Api.DTOs.NhanVien {
    public class UpdateHoSoCuaToiDto {
        public string? SoDienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChi { get; set; }
    }
}