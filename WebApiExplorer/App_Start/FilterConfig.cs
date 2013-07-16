using System.Web;
using System.Web.Mvc;

namespace StatPro.Revolution.WebApiExplorer
{
    public class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
        }
    }
}