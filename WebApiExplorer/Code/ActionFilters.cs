using System;
using System.Web;
using System.Web.Mvc;

namespace StatPro.Revolution.WebApiExplorer
{
    // Action filter attribute that can be applied to MVC controller actions.  The attribute inhibits downstream
    // proxy servers and the user's browser from caching action results.
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    sealed public class NoCacheAttribute : ActionFilterAttribute
    {
        // Called before the target action starts executing.
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            if (filterContext != null)
            {
                AddResponseHeaders(filterContext.HttpContext.Response);
            }
        }

        // Adds the website's standard do-not-cache response headers to the specified HTTP response.
        // Called by this class, and can also be called from outside (see the CsvActionResult).
        // These particular headers should not be added for file-save responses, when the browser is
        // (certain versions of) IE, because they would stop IE from saving the file.
        public static void AddResponseHeaders(HttpResponseBase response)
        {
            if (response != null)
            {
                response.AppendHeader("Cache-Control", "no-cache, no-store, max-age=0");
                response.AppendHeader("Pragma", "no-cache, no-store");
                response.AppendHeader("Vary", "*");
            }
        }
    }

    // Action filter attribute that can be applied to MVC controller actions.  The attribute inhibits other
    // websites from embedding this website in an iframe (or tries to - it depends on whether the browser
    // supports "X-Frame-Options").
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    sealed public class DenyIframeEmbeddingAttribute : ActionFilterAttribute
    {
        // Called before the target action starts executing.
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            if (filterContext != null)
            {
                filterContext.HttpContext.Response.AppendHeader("X-Frame-Options", "DENY");
            }
        }
    }
}
