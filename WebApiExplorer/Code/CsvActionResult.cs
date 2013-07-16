using System;
using System.Web;
using System.Text;
using System.Web.Mvc;
using System.Globalization;

namespace StatPro.Revolution.WebApiExplorer
{
    // An action result that sends CSV data to the browser.
    public class CsvActionResult : ActionResult
    {
        // Default constructor.
        public CsvActionResult()
        {
            FileName = "CsvExport.csv";
            CsvData = String.Empty;
        }

        // Parameterized constructor.
        public CsvActionResult(String fileName, String csvData)
        {
            FileName = fileName;
            CsvData = csvData;
        }

        #region Properties
        // The website-proposed filename for saving the CSV data to.
        public String FileName { set; get; }

        // The CSV data.
        public String CsvData { set; get; }
        #endregion

        #region Methods
        // Executes the result (called by ASP.NET MVC).
        public override void ExecuteResult(ControllerContext context)
        {
            // Sanity check.
            if (context == null)
                throw new ArgumentNullException("context");

            // Get the current HTTP response, and clear it of content and headers.
            var response = context.HttpContext.Response;
            response.ClearHeaders();
            response.Clear();           // Intellisense says this clears headers, but it doesn't

            // Add do-not-cache headers to the response, but in a way that still allows IE to save the file.
            AddDoNotCacheHeadersToFileSaveResponse(response, context.HttpContext.Request);

            // Set the content type and disposition.
            response.ContentType = "text/csv";
            response.AddHeader("content-disposition", "attachment; filename=" + FileName);

            // Make sure the contents of the file are all sent at the same time.
            response.Buffer = true;

            // Use the Western code page 1252 encoding, which corresponds to the ISO-8859-1 standard.
            response.ContentEncoding = Encoding.GetEncoding(1252);

            // Write out the data.
            response.Write(CsvData);
        }

        // Adds do-not-cache headers to the specified HTTP response (which is expected to result in a file-save
        // operation by the browser) in such a way that the IE browser is still able to save the file.
        // (TODO: if we have more file-save action results than just CsvActionResult, this method can be lifted to
        // a common location and be used by all of them.)
        private static void AddDoNotCacheHeadersToFileSaveResponse(HttpResponseBase response, HttpRequestBase request)
        {
            // Get the browser's internal identifier (from .NET browser definition file).
            var browserId = request.Browser.Id;

            // Detect if the browser is a problem version of IE (= IE 7 and 8; IE 6 and lower aren't supported by this
            // website).
            var problemIEVersion = false;
            if ((browserId.Equals("IE7", StringComparison.OrdinalIgnoreCase)) ||
                (browserId.Equals("IE8", StringComparison.OrdinalIgnoreCase)))
            {
                problemIEVersion = true;
            }

            // Add do-not-cache response headers.
            if (!problemIEVersion)
            {
                // Add the website's standard do-not-cache headers.
                NoCacheAttribute.AddResponseHeaders(response);
            }
            else
            {
                // For problem IE versions...   reference: http://stackoverflow.com/a/5084395
                response.AppendHeader("Last-Modified",
                    DateTime.UtcNow.ToString("R", CultureInfo.InvariantCulture)); // RFC 1123 format
                response.AppendHeader("Expires", "-1");
                response.AppendHeader("Cache-Control", "must-revalidate, private");
                response.AppendHeader("Vary", "*");
            }
        }
        #endregion
    }
}
