using System;

namespace HrmApp.Api.DTOs.ChamCong
{
    public class CheckInOutDto
    {
        public DateOnly Ngay { get; set; }
        public TimeOnly GioVao { get; set; }
        public TimeOnly? GioRa { get; set; }
    }
}
