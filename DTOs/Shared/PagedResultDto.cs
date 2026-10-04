namespace HrmApp.Api.DTOs.Shared
{
    public class PagedResultDto<T>
    {
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)System.Math.Ceiling((double)TotalCount / PageSize);
        public System.Collections.Generic.IEnumerable<T> Items { get; set; } = new System.Collections.Generic.List<T>();
    }
}
