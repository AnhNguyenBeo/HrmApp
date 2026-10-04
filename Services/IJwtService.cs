using HrmApp.Api.Data.Models;

namespace HrmApp.Api.Services;

public interface IJwtService
{
	string GenerateToken(TaiKhoan taiKhoan);
}