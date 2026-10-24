using System;

namespace HrmApp.Api.DTOs.ChamCong
{
    public class CheckInOutDto
    {
        [Obsolete("Server uses DateTime.Now; client date is ignored.")]
        public DateOnly Ngay { get; set; }

        [Obsolete("Server uses DateTime.Now; client time is ignored.")]
        public TimeOnly GioVao { get; set; }

        [Obsolete("Server uses DateTime.Now; client time is ignored.")]
        public TimeOnly? GioRa { get; set; }
    }
}