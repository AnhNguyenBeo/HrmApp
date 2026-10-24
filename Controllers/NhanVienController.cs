using System;
using System.Linq;
using System.Security.Claims;
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

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<PagedResultDto<NhanVienResponseDto>>> GetNhanViens([FromQuery] NhanVienSearchDto search)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";
            bool isHR = myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHR && !isAdmin && currentUserRole != "Quản lý")
            {
                return StatusCode(403, new { message = "Bạn không có quyền truy cập danh sách nhân sự." });
            }

            var query = _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .AsQueryable();

            if (!isOwner && !isHR && !isAdmin)
            {
                if (currentNhanVien?.MaPhongBan != null)
                {
                    query = query.Where(n => n.MaPhongBan == currentNhanVien.MaPhongBan);
                }
            }
            else if (search.MaPhongBan.HasValue)
            {
                query = query.Where(n => n.MaPhongBan == search.MaPhongBan.Value);
            }

            if (!string.IsNullOrEmpty(search.Keyword))
            {
                var kw = search.Keyword.ToLower();
                query = query.Where(n => n.HoTen.ToLower().Contains(kw) 
                                      || n.Email.ToLower().Contains(kw) 
                                      || n.Cccd.Contains(kw)
                                      || n.SoDienThoai.Contains(kw));
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

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<NhanVienResponseDto>> GetNhanVien(Guid id)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";
            bool isHR = myDeptName.Contains("Nhân sự");

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

            if (!isOwner && !isHR && !isAdmin && currentNhanVien != null && nhanVien.MaPhongBan != currentNhanVien.MaPhongBan)
            {
                return StatusCode(403, new { message = "Bạn chỉ có quyền xem thông tin nhân sự thuộc phòng ban của mình." });
            }

            return Ok(nhanVien);
        }

        [HttpGet("search")]
        [Authorize]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<NhanVienResponseDto>>> Search([FromQuery] string keyword)
        {
            if (string.IsNullOrEmpty(keyword))
            {
                return BadRequest("Từ khóa tìm kiếm không được để trống.");
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isAdmin = currentUserRole == "Quản trị viên";
            bool isHR = myDeptName.Contains("Nhân sự");

            var kw = keyword.ToLower();
            var query = _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .Where(n => n.HoTen.ToLower().Contains(kw) || n.Email.ToLower().Contains(kw) || n.Cccd.Contains(kw));

            if (!isOwner && !isHR && !isAdmin && currentNhanVien?.MaPhongBan != null)
            {
                query = query.Where(n => n.MaPhongBan == currentNhanVien.MaPhongBan);
            }

            var nhanViens = await query
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

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<NhanVienResponseDto>> PostNhanVien([FromBody] CreateNhanVienDto dto)
        {
            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHR = myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHR)
            {
                return StatusCode(403, new { message = "Chỉ có Ban Giám đốc và các thành viên Phòng Nhân sự mới có quyền thêm nhân sự mới!" });
            }

            if (!isOwner)
            {
                var newCv = await _context.ChucVus.FindAsync(dto.MaChucVu);
                if (newCv != null && (newCv.TenChucVu.Contains("Giám đốc") || newCv.TenChucVu.Contains("Chủ doanh nghiệp")))
                {
                    return StatusCode(403, new { message = "Không có quyền tạo tài khoản thuộc Ban Giám đốc / Chủ doanh nghiệp!" });
                }
            }

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

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutNhanVien(Guid id, [FromBody] UpdateNhanVienDto dto)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHR = myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHR)
            {
                return StatusCode(403, new { message = "Quản lý các phòng ban chỉ có quyền xem thông tin. Chức năng cập nhật nhân sự do Phòng Nhân sự xử lý!" });
            }

            if (!isOwner)
            {
                var targetChucVu = nhanVien.MaChucVuNavigation?.TenChucVu ?? "";
                var targetPhongBan = nhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";

                if (targetChucVu.Contains("Giám đốc") || targetPhongBan.Contains("Ban Giám đốc"))
                {
                    return StatusCode(403, new { message = "Không thể chỉnh sửa thông tin của Ban Giám đốc / Chủ doanh nghiệp!" });
                }
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
            if (dto.MaChucVu.HasValue && dto.MaChucVu.Value != Guid.Empty && isOwner)
            {
                nhanVien.MaChucVu = dto.MaChucVu.Value;
            }
            if (!string.IsNullOrEmpty(dto.TrangThaiLamViec) && isOwner)
            {
                nhanVien.TrangThaiLamViec = dto.TrangThaiLamViec;
            }
            nhanVien.NgayNghiViec = dto.NgayNghiViec;
            nhanVien.GhiChu = dto.GhiChu;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thông tin nhân sự thành công." });
        }

        [HttpPut("{id}/chuc-vu")]
        [Authorize]
        public async Task<IActionResult> ChangeChucVu(Guid id, [FromBody] Guid maChucVu)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var newChucVu = await _context.ChucVus.FindAsync(maChucVu);
            if (newChucVu == null)
            {
                return NotFound(new { message = "Không tìm thấy chức vụ." });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHR = myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHR)
            {
                return StatusCode(403, new { message = "Quản lý các phòng ban chỉ có quyền xem thông tin. Chức năng cấp chức do Phòng Nhân sự xử lý!" });
            }

            if (nhanVien.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự cấp chức cho chính mình!" });
            }

            if (!isOwner)
            {
                var targetChucVu = nhanVien.MaChucVuNavigation?.TenChucVu ?? "";
                var targetPhongBan = nhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";

                if (targetChucVu.Contains("Giám đốc") || targetPhongBan.Contains("Ban Giám đốc") || targetChucVu.Contains("Chủ doanh nghiệp"))
                {
                    return StatusCode(403, new { message = "Không thể cấp chức cho Ban Giám đốc / Chủ doanh nghiệp!" });
                }

                if (newChucVu.TenChucVu.Contains("Giám đốc") || newChucVu.TenChucVu.Contains("Chủ doanh nghiệp"))
                {
                    return StatusCode(403, new { message = "Chỉ có Chủ doanh nghiệp mới có quyền bổ nhiệm vị trí Ban Giám đốc!" });
                }

                if (targetPhongBan.Contains("Nhân sự") && targetChucVu.Contains("Trưởng"))
                {
                    return StatusCode(403, new { message = "Chỉ có Chủ doanh nghiệp mới có quyền điều chỉnh chức vụ của Trưởng phòng Nhân sự!" });
                }

                if (targetPhongBan.Contains("Nhân sự") && newChucVu.TenChucVu.Contains("Trưởng"))
                {
                    return StatusCode(403, new { message = "Chỉ có Chủ doanh nghiệp mới có quyền bổ nhiệm Trưởng phòng Nhân sự!" });
                }
            }

            nhanVien.MaChucVu = maChucVu;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã cấp chức vụ {newChucVu.TenChucVu} cho nhân sự {nhanVien.HoTen} thành công." });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteNhanVien(Guid id)
        {
            var nhanVien = await _context.NhanViens
                .Include(n => n.MaPhongBanNavigation)
                .Include(n => n.MaChucVuNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == id);

            if (nhanVien == null)
            {
                return NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var currentUserIdStr = User.FindFirst("MaNhanVien")?.Value;
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            Guid.TryParse(currentUserIdStr, out var currentNhanVienId);

            if (nhanVien.MaNhanVien == currentNhanVienId)
            {
                return BadRequest(new { message = "Bạn không thể tự cho chính mình thôi việc!" });
            }

            var currentNhanVien = await _context.NhanViens
                .Include(n => n.MaChucVuNavigation)
                .Include(n => n.MaPhongBanNavigation)
                .FirstOrDefaultAsync(n => n.MaNhanVien == currentNhanVienId);

            var myDeptName = currentNhanVien?.MaPhongBanNavigation?.TenPhongBan ?? "";
            bool isOwner = currentUserRole == "Chủ doanh nghiệp";
            bool isHR = myDeptName.Contains("Nhân sự");

            if (!isOwner && !isHR)
            {
                return StatusCode(403, new { message = "Quản lý các phòng ban chỉ có quyền xem thông tin. Chức năng thôi việc do Phòng Nhân sự xử lý!" });
            }

            var targetChucVu = nhanVien.MaChucVuNavigation?.TenChucVu ?? "";
            var targetPhongBan = nhanVien.MaPhongBanNavigation?.TenPhongBan ?? "";

            if (targetChucVu.Contains("Giám đốc") || targetPhongBan.Contains("Ban Giám đốc") || targetChucVu.Contains("Chủ doanh nghiệp"))
            {
                return StatusCode(403, new { message = "Không thể cho Chủ doanh nghiệp / Ban Giám đốc thôi việc!" });
            }

            if (!isOwner)
            {
                if (targetPhongBan.Contains("Nhân sự") && targetChucVu.Contains("Trưởng"))
                {
                    return StatusCode(403, new { message = "Chỉ có Chủ doanh nghiệp mới có thẩm quyền cho Trưởng phòng Nhân sự thôi việc!" });
                }
            }

            nhanVien.TrangThaiLamViec = "Đã nghỉ việc";
            nhanVien.NgayNghiViec = DateOnly.FromDateTime(DateTime.Now);

            var taiKhoans = await _context.TaiKhoans.Where(t => t.MaNhanVien == nhanVien.MaNhanVien).ToListAsync();
            foreach (var tk in taiKhoans)
            {
                tk.TrangThai = "Bị khóa";
            }

            var hopDongs = await _context.HopDongLaoDongs
                .Where(h => h.MaNhanVien == nhanVien.MaNhanVien && (h.TrangThai == "Có hiệu lực" || h.TrangThai == "Đang hiệu lực"))
                .ToListAsync();
            foreach (var hd in hopDongs)
            {
                hd.TrangThai = "Đã thanh lý";
                hd.NgayKetThuc = DateOnly.FromDateTime(DateTime.Now);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã cho nhân sự {nhanVien.HoTen} thôi việc và tự động khóa tài khoản liên kết." });
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
            return Ok(new { message = "Cập nhật hồ sơ cá nhân thành công." });
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
