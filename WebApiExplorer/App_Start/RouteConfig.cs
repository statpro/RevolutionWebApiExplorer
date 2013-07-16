using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace StatPro.Revolution.WebApiExplorer
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
            routes.IgnoreRoute("{*favicon}", new { favicon = @"(.*/)?favicon.ico(/.*)?" });

            routes.MapRoute(
                name: "ExportSegmentsTreeNodeAsCsv",
                url: "WebApi/ExportSegmentsTreeNodeAsCsv/{cachedResourceId}/{portfolioName}/{resultsTimestamp}/{currency}/{statsFrequency}/{culture}",
                defaults: new { controller = "WebApi", action = "ExportSegmentsTreeNodeAsCsv",
                                culture = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "ExportTimeSeriesAsCsv",
                url: "WebApi/ExportTimeSeriesAsCsv/{cachedResourceId}/{portfolioName}/{resultsTimestamp}/{currency}/{classifier}/{culture}",
                defaults: new { controller = "WebApi", action = "ExportTimeSeriesAsCsv", 
                                culture = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
