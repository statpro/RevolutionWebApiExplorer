using System;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents Web API resource result information.
    public class WebApiResourceResult
    {
        // Constructor.
        public WebApiResourceResult()
        {
            isLoggedOn = true;
            success = true;
            failedMessage = String.Empty;
            cachedResourceId = null;
        }

        #region Properties
        // True if the connecting user is logged on, else false.  The default is true.
        public Boolean isLoggedOn { get; set; }

        // True if the request was successful, and the DTO contains valid data.  False if the request failed, and
        // the DTO doesn't contain valid data.  The default is true.
        public Boolean success { get; set; }

        // If 'success' is false and this property is not null or empty, then it contains a message for the end user
        // indicating the reason why the request failed.  The default is the empty string.
        public String failedMessage { get; set; }

        // Contains the HTTP status code.  The desired status code is 200 (OK), which means that the object
        // contains a valid representation.
        public Int32 httpStatus { get; set; }

        // Contains the reason phrase from the HTTP response's status line.  This is only of interest for status
        // codes that aren't 200, in which case the reason phrase (probably) contains an interesting error message.
        public String reasonPhrase { get; set; }

        // The Web API error code, or null/empty.  If set, then it will either be one of the WebApiErrorCode enum
        // identifiers in string form (if we recognise it), or an integer in string form (if we don't recognise it).
        // This is only of interest for status codes that aren't 200.  It will be null or empty if a Web API error
        // code was not returned.
        public String webApiErrorCode { get; set; }

        // Contains the XML or JSON representation of the resource.
        // Ignore this property if the HTTP status code isn't 200.
        public String representation { get; set; }

        // True if the representation is in JSON format, false if in XML format.
        // Ignore this property if the HTTP status code isn't 200.
        public Boolean isJson { get; set; }

        // Contains the type of the resource; will be one of:-
        //   "service"
        //   "portfolios"
        //   "portfolioAnalysis"
        //   "segmentsTreeNode"
        //   "timeSeries"
        // Ignore this property if the HTTP status code isn't 200.
        public String type { get; set; }

        // Contains the cached resource id (or null/empty if the resource is not cached in session state).
        public String cachedResourceId { get; set; }
        #endregion
    }
}
