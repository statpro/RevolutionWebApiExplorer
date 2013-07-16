using System;
using System.Xml;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Globalization;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using Ninject;
using Newtonsoft.Json.Linq;

using StatPro.Revolution.WebApiExplorer.Models;
using StatPro.Revolution.WebApiExplorer.JsDtos;
using StatPro.Revolution.WebApiExplorer.Models.SegmentsTree;

using JsMeasureInfo = StatPro.Revolution.WebApiExplorer.JsDtos.MeasureInfo;

namespace StatPro.Revolution.WebApiExplorer.Controllers
{
    // WebApi controller, containing actions that interact with the StatPro Revolution Web API.
    public class WebApiController : BaseController
    {
        // Constructor.
        [Inject]
        public WebApiController(ISessionStateAccess sessionState, IAppSettingsAccess appSettings,
            IOAuth2ServerAccess oauth2Server, IWebApiAccess webApi, IResourcesAccess resources, ILogging logging,
            IGlobalStateAccess globalState)
            : base(sessionState, appSettings, oauth2Server, webApi, resources, logging, globalState)
        {
        }

        #region Actions
        // GetResource action.  Gets a resource representation from the specified URI in the specified format,
        // for the currently logged-on user.
        // 'uri' must be an absolute / fully-qualified URI that identifies one of the Web API's resources.
        // If null, empty or whitespace then the Web API's entry-point URI is used.
        // 'format' should be either "json" or "xml"; if null, empty, whitespace or invalid then JSON is requested.
        // 'cache' specifies whether or not to cache the resource in session state in addition to returning it;
        // if true then the CachedResourceId property of the return WebApiResourceResult object will contain its
        // identifer.  Use this feature to export data as CSV; see the ExportSegmentsTreeNodeAsCsv and
        // ExportTimeSeriesAsCsv actions for more details.
        [AcceptVerbs(HttpVerbs.Post)]
        [ValidateAntiForgeryToken()]
        public async Task<JsonResult<WebApiResourceResult>> GetResource(String uri, String format, Boolean cache)
        {
            // Get data about the logged-on user from session state.  If the connecting user isn't logged on,
            // return to the JavaScript indicating this.
            var userData = SessionState.LoggedOnUser;
            if (userData == null)
                return ToJsonResult(new WebApiResourceResult() { isLoggedOn = false });

            // If the URI isn't specified, use the entry-point URI.
            if (String.IsNullOrWhiteSpace(uri))
                uri = AppSettings.WebApiEntryPointUri;

            // Get the representation format.
            RepresentationFormat reprFormat = RepresentationFormat.Json;
            if (String.Equals(format, "xml", StringComparison.OrdinalIgnoreCase))
                reprFormat = RepresentationFormat.Xml;


            // Attempt to get the resource.
            Boolean getNewAccessToken = false;
            Tuple<String, String> resource = null;
            for (Int32 attempt = 0; ; attempt++)
            {
                // Default: we don't need to get a new access token.
                getNewAccessToken = false;


                // Get the specified resource represented in the specified format.  Break out of the loop
                // if successful.
                try
                {
                    resource = await WebApi.GetResourceAsync(uri, userData.AccessToken, reprFormat);
                    break;
                }
                catch (WebApiException ex)
                {
                    // Get and then return the appropriate result (unless we have to get a new access token).
                    var result = GetWebApiResourceResultOnError(ex, attempt, out getNewAccessToken);
                    if (!getNewAccessToken)
                        return result;
                }


                // If we have been told to get a new access token from the user's refresh token...
                if (getNewAccessToken)
                {
                    UserData newData;
                    try
                    {
                        // Get new user data from the OAuth2 Server.
                        newData = await OAuth2Server.GetUserDataFromRefreshTokenAsync(userData.RefreshToken);

                        // Update the user's data in session state (and our local variable).
                        SessionState.UpdateLoggedOnUserData(newData);
                        userData = newData;

                        // Continue round the loop to re-try the request with the new access token.
                        continue;
                    }
                    catch (AuthorizationException ex)
                    {
                        if (ex.AuthorizationGrantExpiredOrInvalid)
                        {
                            // The refresh token has been revoked.  So we have no usable access token or
                            // refresh token.  Log the user out, and return an error result.
                            SessionState.OnLoggedOff();
                            return ToJsonResult(new WebApiResourceResult()
                            {
                                isLoggedOn = false,
                                success = false,
                                failedMessage = "Access to the Web API has been denied, and you have been " +
                                    "automaticallly logged off from this website.  Please re-try."
                            });
                        }
                        else
                        {
                            return ToJsonResult(new WebApiResourceResult()
                            {
                                success = false,
                                failedMessage = ex.Message
                            });
                        }
                    }
                }
            }


            // If told to do so, cache the retrieved resource representation and its media type in session state.
            String cachedResourceId = null;
            if (cache)
            {
                cachedResourceId = SessionState.CacheResource(resource.Item1, resource.Item2);
            }


            // Return a WebApiResourceResult that encapsulates the retrieved resource representation and its
            // media type (+ cached resource id).
            return GetWebApiResourceResult(resource.Item1, resource.Item2, cachedResourceId);
        }

        // GetSegmentsTreeNodeMeasures action.  Gets information about the Segments Tree Node's requestable measures,
        // for consumption by JavaScript.
        [AcceptVerbs(HttpVerbs.Post)]
        [ValidateAntiForgeryToken()]
        public JsonResult<Measures> GetSegmentsTreeNodeMeasures()
        {
            var measures = GlobalState.SegmentsTreeNodeMeasuresInfo.Select(mi => new JsMeasureInfo(mi)).ToArray();
            var categories = GlobalState.SegmentsTreeNodeMeasureCategories.ToArray();

            return ToJsonResult(new Measures()
            {
                measures = measures,
                categories = categories
            });
        }

        // ExportSegmentsTreeNodeAsCsv action.  Exports a segments tree node data in CSV format, for the currently
        // logged-on user.
        //
        // 'cachedResourceId' must be the identifier of a segments tree node resource (in JSON format) that has been
        // cached in session state.
        // 'portfolioName' must specify the base64-encoded/UTF-8 name of the portfolio that the time series belongs to.
        // 'resultsTimestamp' must specify the analysis results timestamp, as returned by the Web API (RFC 3339
        // format; zero offset from UTC).  (Caveat: ASP.NET does not allow colons in the path of a URI, even encoded
        // as %3A.  So we require that the caller must replace the colons with spaces.)
        // 'currency' must specify the currency code (e.g. "USD") of the portfolio's finished default analysis.
        // 'statsFrequency' must specify the statistics frequency (e.g. "Weekly") of the portfolio's finished
        // default analysis.
        // 'culture' specifies the .NET name of the specific culture that is to be used to format the numbers in the
        // exported data (e.g. "en-GB").  If null/empty/whitespace/invalid then "en-US" will be used.
        //
        [AcceptVerbs(HttpVerbs.Get)]
        [SuppressMessage("Microsoft.Design", "CA1031:DoNotCatchGeneralExceptionTypes",
            Justification = "Not sure what exceptions Newtonsoft.Json can throw.")]
        public async Task<CsvActionResult> ExportSegmentsTreeNodeAsCsv(String cachedResourceId, String portfolioName,
            String resultsTimestamp, String currency, String statsFrequency, String culture)
        {
            var errorResult = new CsvActionResult("Error.csv", "An error occurred.".CsvEncode());


            /* Check the args. */

            // Check that the connecting user is logged on.
            if (!SessionState.IsUserLoggedOn)
                return errorResult;

            // Get the cached resource data from session state (and remove from session state).
            var resourceData = SessionState.GetAndRemoveCachedResource(cachedResourceId);
            if (resourceData == null)
                return errorResult;

            // Parse the cached resource representation and its media type name, and check that it's a valid
            // segments tree node resource in JSON format.
            var resourceResult = GetWebApiResourceResult(resourceData.Item1, resourceData.Item2, null).TypedData;
            if ((resourceResult == null) || (!resourceResult.success) || (resourceResult.type != "segmentsTreeNode") ||
                (!resourceResult.isJson))
            {
                return errorResult;
            }

            // Check that the mandatory args have been specified.
            if ((String.IsNullOrWhiteSpace(portfolioName)) || (String.IsNullOrWhiteSpace(resultsTimestamp)) ||
                (String.IsNullOrWhiteSpace(currency)) || (String.IsNullOrWhiteSpace(statsFrequency)))
            {
                return errorResult;
            }


            /* Get a complete Segments Tree Node object (i.e. one that includes all children, which may be spread over
             * a number of 'pages'), and then get information that we need about the node.
             */

            var node = await GetCompleteSegmentsTreeNodeFromJsonAsync(resourceResult.representation);
            if (node == null)
                return errorResult;

            var segmentName = node.Segment.Name;
            var segmentPeriodicMeasures = node.Segment.PeriodicMeasures;
            var children = node.GetChildren();
            var allTimePeriodCodes = node.GetAllTimePeriodCodes();
            var allMeasureIds = node.GetAllMeasureIds();
            var fieldsCount = 1 + (allMeasureIds.Count * allTimePeriodCodes.Count);


            /* Prepare to export the data as a string. */

            // Get the export culture.
            if (String.IsNullOrWhiteSpace(culture))
                culture = "en-US";
            CultureInfo exportCulture = null;
            try
            {
                exportCulture = new CultureInfo(culture);
            }
            catch (CultureNotFoundException)
            {
                exportCulture = new CultureInfo("en-US");
            }

            // Get the culture's list separator string.
            var separator = exportCulture.TextInfo.ListSeparator;

            // Reconstitute the results timestamp's RFC 3339 format and parse.
            resultsTimestamp = resultsTimestamp.Replace(' ', ':');
            var resultsTime = XmlConvert.ToDateTime(resultsTimestamp, XmlDateTimeSerializationMode.Utc);

            // Create the string builder.
            var output = new StringBuilder(2048);

            // Callback to get a measure value as text from a list of measures-for-period, for a specified time
            // period code and measure id (or the empty string if not found).  We expect 'code' and 'id' to be
            // valid, and don't check them for null, empty, whitespace, etc.  Look-up of time period code and measure
            // id is done case-sensitively.  Conversion of double and integer values to text is done using default
            // formatting and the 'exportCulture' culture.
            Func<List<MeasuresForPeriod>, String, String, String> getMeasureAsText = (measuresForPeriod, code, id) =>
                {
                    if (measuresForPeriod == null)
                        return String.Empty;

                    var measure = measuresForPeriod.Where(mfp => mfp.TimePeriodCode == code)
                                                   .Select(mfp => mfp.Measures.FirstOrDefault(m => m.Id == id))
                                                   .FirstOrDefault();
                    if (measure == null)
                        return String.Empty;

                    switch(measure.TypeIndicator)
                    {
                        case 'r' :
                            return measure.Value.NullableDoubleToString(exportCulture);
                        case 'i' :
                            return measure.IntegerValue.NullableInt32ToString(exportCulture);
                        case 's' :
                            return measure.StringValue ?? String.Empty;
                        default :
                            return String.Empty;
                    }
                };


            /* Add the header. */

            // Add header lines.
            AppendCsvExportLine(output, separator, "Source", "StatPro Revolution Web API");
            AppendCsvExportLine(output, separator, "Exported at (GMT)", DateTime.UtcNow.ToString("F", exportCulture));
            AppendCsvExportLine(output, separator, "Numbers exported in", exportCulture.DisplayName);
            AppendCsvExportLine(output, separator, "Results timestamp (GMT)", resultsTime.ToString("F", exportCulture));
            AppendCsvExportLine(output, separator, "Portfolio", portfolioName.Base64Decode(Encoding.UTF8, "n/a"));
            AppendCsvExportLine(output, separator, "Segment", segmentName);
            if (children != null)
                AppendCsvExportLine(output, separator, "Children", children.Item2);
            output.AppendLine();


            /* Add the line that contains the field headers. */

            var fields = new List<String>(fieldsCount);
            fields.Add("Name");
            allMeasureIds.ForEach(id =>
            {
                allTimePeriodCodes.ForEach(code =>
                {
                    fields.Add(GetSegmentsTreeMeasureName(id, currency, statsFrequency) + " - " + code);
                });
            });
            AppendCsvExportLine(output, separator, fields.ToArray());


            /* Add the lines for the segment and children (if any). */

            // Segment.
            fields.Clear();
            fields.Add(segmentName);
            allMeasureIds.ForEach(id =>
            {
                allTimePeriodCodes.ForEach(code =>
                {
                    fields.Add(getMeasureAsText(segmentPeriodicMeasures, code, id));
                });
            });
            AppendCsvExportLine(output, separator, fields.ToArray());

            // Children.
            if (children != null)
            {
                var list = children.Item1;
                list.ForEach(child =>
                {
                    fields.Clear();
                    fields.Add(child.Name);
                    allMeasureIds.ForEach(id =>
                    {
                        allTimePeriodCodes.ForEach(code =>
                        {
                            fields.Add(getMeasureAsText(child.PeriodicMeasures, code, id));
                        });
                    });
                    AppendCsvExportLine(output, separator, fields.ToArray());
                });
            }


            // Return the CSV data in an appropriately-named file.
            return new CsvActionResult("RevolutionWebAPISegmentsTreeNode.csv", output.ToString());
        }

        // ExportTimeSeriesAsCsv action.  Exports time series data in CSV format, for the currently logged-on user.
        //
        // 'cachedResourceId' must be the identifier of a time series resource (in JSON format) that has been cached
        // in session state.
        // 'portfolioName' must specify the base64-encoded/UTF-8 name of the portfolio that the time series belongs to.
        // 'resultsTimestamp' must specify the analysis results timestamp, as returned by the Web API (RFC 3339
        // format; zero offset from UTC).  (Caveat: ASP.NET does not allow colons in the path of a URI, even encoded
        // as %3A.  So we require that the caller must replace the colons with spaces.)
        // 'currency' must specify the currency code (e.g. "USD") of the portfolio's finished default analysis.
        // 'classifier' must specify the name of the time series's segment's classifier (or "null" for the "TOTAL"
        // segment).  Note that the time series itself tells us the name of the segment that it relates to.
        // 'culture' specifies the .NET name of the specific culture that is to be used to format the dates and
        // numbers in the exported data (e.g. "en-GB").  If null/empty/whitespace/invalid then "en-US" will be used.
        //
        [AcceptVerbs(HttpVerbs.Get)]
        [SuppressMessage("Microsoft.Design", "CA1031:DoNotCatchGeneralExceptionTypes",
            Justification = "Not sure what exceptions Newtonsoft.Json can throw.")]
        public CsvActionResult ExportTimeSeriesAsCsv(String cachedResourceId, String portfolioName, 
            String resultsTimestamp, String currency, String classifier, String culture)
        {
            const String DateFormat = "MMM dd yyyy";

            var errorResult = new CsvActionResult("Error.csv", "An error occurred.".CsvEncode());


            /* Check the args. */

            // Check that the connecting user is logged on.
            if (!SessionState.IsUserLoggedOn)
                return errorResult;

            // Get the cached resource data from session state (and remove from session state).
            var resourceData = SessionState.GetAndRemoveCachedResource(cachedResourceId);
            if (resourceData == null)
                return errorResult;

            // Parse the cached resource representation and its media type name, and check that it's a valid
            // time series resource in JSON format.
            var resourceResult = GetWebApiResourceResult(resourceData.Item1, resourceData.Item2, null).TypedData;
            if ((resourceResult == null) || (!resourceResult.success) || (resourceResult.type != "timeSeries") ||
                (!resourceResult.isJson))
            {
                return errorResult;
            }

            // Check that the mandatory args have been specified.
            if ((String.IsNullOrWhiteSpace(portfolioName)) || (String.IsNullOrWhiteSpace(resultsTimestamp)) ||
                (String.IsNullOrWhiteSpace(currency)) || (String.IsNullOrWhiteSpace(classifier)))
            {
                return errorResult;
            }

            // Parse the JSON time series resource representation.
            JObject jObj;
            try
            {
                jObj = JObject.Parse(resourceResult.representation);
            }
            catch (Exception)  // not sure what exceptions Newtonsoft.Json can throw, so will have to catch any/all
            {
                return errorResult;
            }


            /* Prepare to export the data as a string. */

            // Get the export culture.
            if (String.IsNullOrWhiteSpace(culture))
                culture = "en-US";
            CultureInfo exportCulture = null;
            try
            {
                exportCulture = new CultureInfo(culture);
            }
            catch (CultureNotFoundException)
            {
                exportCulture = new CultureInfo("en-US");
            }

            // Get the culture's list separator string.
            var separator = exportCulture.TextInfo.ListSeparator;

            // Reconstitute the results timestamp's RFC 3339 format and parse.
            resultsTimestamp = resultsTimestamp.Replace(' ', ':');
            var resultsTime = XmlConvert.ToDateTime(resultsTimestamp, XmlDateTimeSerializationMode.Utc);

            // Get information from the JSON representation.
            var jTimeSeries = jObj["timeSeries"];
            var jMeasures = (JArray)jTimeSeries["measures"];
            var jDataPoints = jTimeSeries["dataPoints"];
            var jItems = (JArray)jDataPoints["items"];
            var periodic = ((String)jDataPoints["type"] == "periodic");

            // Create the string builder (capacity: header = approx. 500 characters +
            // approx. 20 characters per field per data point).
            var numDataPoints = jItems.Count;
            var numFields = jMeasures.Count + (periodic ? 2 : 1);
            var output = new StringBuilder(500 + (20 * numFields * numDataPoints));


            /* Add the header. */

            // Add header lines.
            AppendCsvExportLine(output, separator, "Source", "StatPro Revolution Web API");
            AppendCsvExportLine(output, separator, "Exported at (GMT)", DateTime.UtcNow.ToString("F", exportCulture));
            AppendCsvExportLine(output, separator, "Dates/numbers exported in", exportCulture.DisplayName);
            AppendCsvExportLine(output, separator, "Results timestamp (GMT)", resultsTime.ToString("F", exportCulture));
            AppendCsvExportLine(output, separator, "Portfolio", portfolioName.Base64Decode(Encoding.UTF8, "n/a"));
            AppendCsvExportLine(output, separator, "Segment", (String)jTimeSeries["segmentName"]);
            AppendCsvExportLine(output, separator, "Classifier", classifier == "null" ? "--" : classifier);
            AppendCsvExportLine(output, separator, "Series type", (String)jTimeSeries["seriesType"]);
            AppendCsvExportLine(output, separator, "Start date", Iso8601DateToFormattedDate(
                (String)jTimeSeries["startDate"], DateFormat, exportCulture));
            AppendCsvExportLine(output, separator, "End date", Iso8601DateToFormattedDate(
                (String)jTimeSeries["endDate"], DateFormat, exportCulture));
            output.AppendLine();


            /* Add the line that contains the field headers for each data point line. */

            if (periodic)
                AppendCsvExportData(output, separator, "Start date", "End date");
            else
                AppendCsvExportData(output, separator, "Date");

            AppendCsvExportLine(output, separator, jMeasures.Select(measureId =>
                {
                    var id = (String)measureId;
                    var name = Resources.GetTimeSeriesMeasure(id);
                    if (name.Length > 0)
                        return name.Replace("[CUR]", currency);
                    else
                        return id;
                }).ToArray());


            /* Add the lines for the data points. */

            foreach (var item in jItems)
            {
                // Dates.
                if (periodic)
                {
                    AppendCsvExportData(output, separator,
                        Iso8601DateToFormattedDate((String)item["s"], DateFormat, exportCulture),
                        Iso8601DateToFormattedDate((String)item["e"], DateFormat, exportCulture));
                }
                else
                {
                    AppendCsvExportData(output, separator,
                        Iso8601DateToFormattedDate((String)item["d"], DateFormat, exportCulture));
                }

                // Values.
                AppendCsvExportLine(output, separator,
                    ((JArray)item["m"]).Select(value => ((Double?)value).NullableDoubleToString(exportCulture))
                                       .ToArray());
            }


            // Return the CSV data in an appropriately-named file.
            return new CsvActionResult("RevolutionWebAPITimeSeries.csv", output.ToString());
        }
        #endregion

        #region Methods
        // Returns an appropriate WebApiResourceResult according to the error condition in getting a Web API resource,
        // indicated by the specified WebApiException (which must not be null).  'attempt' specifies the number of
        // attempt to get the resource (0 = first attempt; 1 = second attempt).  If the error condition is that
        // the access token has expired, the method MAY return null and pass back 'getNewAccessToken' as true; in
        // this case the calling code should get a new access token from the user's refresh token, and then re-try
        // to get the same resource.
        public static JsonResult<WebApiResourceResult> GetWebApiResourceResultOnError(WebApiException ex,
            Int32 attempt, out Boolean getNewAccessToken)
        {
            // Default.
            getNewAccessToken = false;

            // Sanity check.
            if (ex == null)
                return null;


            // If there's no HTTP status code, then we suffered an unexpected, technical error and we
            // weren't able to talk to the Web API (or any HTTP intermediary).
            if (ex.StatusCode == null)
            {
                return ToJsonResult(new WebApiResourceResult()
                {
                    success = false,
                    failedMessage = ex.Message
                });
            }


            // If the access token has expired or is invalid...
            if (ex.AccessTokenExpiredOrInvalid)
            {
                // For attempt #1...
                if (attempt == 0)
                {
                    // We'll assume that the access token has expired.  It's unlikely that the OAuth2 Server
                    // has given us an invalid one, and it's unlikely that we've presented the access token
                    // incorrectly.  So we'll return saying that the OAuth2 Server should be asked for a new
                    // access token via the user's refresh token.
                    getNewAccessToken = true;
                    return null;
                }

                // For subsequent attempts...
                else
                {
                    return ToJsonResult(new WebApiResourceResult()
                    {
                        httpStatus = (Int32)ex.StatusCode.Value,
                        reasonPhrase = "Access to the Web API has been denied.",
                    });
                }
            }


            // If we wanted, we could do something server-side if the request has been forbidden due to a
            // Fair Usage Policy violation, such as log the user out.  For now we'll let the JavaScript
            // handle it.
            //   if (ex.RequestForbiddenDueToFairUsagePolicyViolation)
            //   {
            //       // do something
            //   }


            // For all other error conditions...
            return ToJsonResult(new WebApiResourceResult()
            {
                httpStatus = (Int32)ex.StatusCode.Value,
                reasonPhrase = ex.Message,
                webApiErrorCode = GetJsWebApiErrorCode(ex)
            });
        }

        // Returns a WebApiResourceResult with the specified resource representation and media type name
        // (both of which must be non-null and not empty), as a JsonResult.  The specified cached resource id
        // is also stored in the returned result (this id can be null).
        public static JsonResult<WebApiResourceResult> GetWebApiResourceResult(String representation,
            String mediaTypeName, String cachedResourceId)
        {
            // Sanity check.
            if ((representation == null) || (mediaTypeName == null))
                return null;

            // Create the results object that will be returned, and set the resource representation text, etc.
            var result = new WebApiResourceResult();
            result.httpStatus = 200;
            result.reasonPhrase = "OK";
            result.webApiErrorCode = null;
            result.representation = representation;
            result.cachedResourceId = cachedResourceId;

            // Set the 'isJson' property.
            if (mediaTypeName.EndsWith("+json", StringComparison.Ordinal))
                result.isJson = true;
            else if (mediaTypeName.EndsWith("+xml", StringComparison.Ordinal))
                result.isJson = false;
            else
            {
                // In the unlikely event that the Web API returned a media type that doesn't allow us to determine
                // whether it's XML or JSON based...
                return ToJsonResult(new WebApiResourceResult()
                {
                    success = false,
                    failedMessage = "Invalid response received from the Web API.  Unable to determine resource format."
                });
            }

            // Set the type of the resource representation (e.g. "service").
            result.type = GetJsResourceTypeName(mediaTypeName);
            if (result.type == null)
            {
                // In the unlikely event that the Web API returned an unknown media type name...
                return ToJsonResult(new WebApiResourceResult()
                {
                    success = false,
                    failedMessage = "Invalid response received from the Web API.  Unable to determine resource type."
                });
            }

            // Return.
            return ToJsonResult(result);
        }

        // Returns the JavaScript version of the Web API error code, as contained in the specified WebApiException
        // object, or null if not present.  This will be either a WebApiErrorCode enum identifier in string form (e.g.
        // "StartDateFormatInvalid"), or an integer in string form (if we don't recognise the error code).
        public static String GetJsWebApiErrorCode(WebApiException ex)
        {
            if (ex == null)
                return (null);

            if (ex.ErrorCode != null)
                return ex.ErrorCode.Value.ToString();

            if (ex.UnrecognisedErrorCode != null)
                return ex.UnrecognisedErrorCode.Value.ToString(CultureInfo.InvariantCulture);

            return null;
        }

        // Returns the JavaScript resource type name of the specified media type name; e.g.
        //   "application/vnd.statpro.revolution.api.service"  -->  "service"
        // Returns null if the specified media type name is null, empty, whitespace or unrecognised.
        public static String GetJsResourceTypeName(String mediaTypeName)
        {
            if (String.IsNullOrWhiteSpace(mediaTypeName))
                return null;

            // Strip off the "+json" / "+xml".
            var index = mediaTypeName.IndexOf('+');
            if (index >= 0)
                mediaTypeName = mediaTypeName.Substring(0, index);

            switch(mediaTypeName)
            {
                case "application/vnd.statpro.revolution.api.service":
                    return "service";

                case "application/vnd.statpro.revolution.api.eula":
                    return "eula";

                case "application/vnd.statpro.revolution.api.portfolios":
                    return "portfolios";

                case "application/vnd.statpro.revolution.api.portfolio-analysis":
                    return "portfolioAnalysis";

                case "application/vnd.statpro.revolution.api.segments-tree-node":
                    return "segmentsTreeNode";

                case "application/vnd.statpro.revolution.api.time-series":
                    return "timeSeries";

                default:
                    return null;
            }
        }

        // Appends the specified string values to the specified StringBuilder, followed by the default line
        // terminator.  Values are CSV-encoded, and are separated by the specified list separator (a
        // culture-specific string).  The last value is not followed by the list separator.
        // Does nothing if no values are specified.
        public static void AppendCsvExportLine(StringBuilder output, String separator, params String [] values)
        {
            AppendCsvExportData(output, separator, true, values);
        }

        // Appends the specified string values to the specified StringBuilder.  Values are CSV-encoded, and are
        // separated by the specified list separator (a culture-specific string).  The default line terminator
        // is not appended, and the last value is followed by the list separator.
        // Does nothing if no values are specified.
        public static void AppendCsvExportData(StringBuilder output, String separator, params String[] values)
        {
            AppendCsvExportData(output, separator, false, values);
        }

        // Implementation for the two methods above.
        private static void AppendCsvExportData(StringBuilder output, String separator, Boolean newline,
            params String[] values)
        {
            if ((output == null) || (separator == null) || (values == null) || (values.Length == 0))
                return;

            Int32 i;
            for (i = 0; i < (values.Length - 1); i++)
            {
                output.Append(values[i].CsvEncode() + separator);
            }

            if (newline)
                output.AppendLine(values[i].CsvEncode());
            else
                output.Append(values[i].CsvEncode() + separator);
        }

        // Converts an ISO 8601 date to a date that's formatted according to the specified .NET date format and
        // culture.  Returns the empty string in the event of error.
        public static String Iso8601DateToFormattedDate(String iso8601Date, String dateFormat, IFormatProvider culture)
        {
            if ((String.IsNullOrWhiteSpace(iso8601Date)) || (String.IsNullOrWhiteSpace(dateFormat)) ||
                (culture == null))
            {
                return String.Empty;
            }

            DateTime date;
            if (!iso8601Date.TryParseFromIso8601DateFormat(out date))
                return String.Empty;

            return date.ToString(dateFormat, culture);
        }

        // Gets a complete Segments Tree Node object (i.e. one that includes all children, which may be spread over
        // a number of "pages").  'json' must contain the JSON representation of the first (and possibly only) page.
        // Returns a newly-created and populated SegmentsTreeNode object.  Returns null if an error occurred.
        public async Task<SegmentsTreeNode> GetCompleteSegmentsTreeNodeFromJsonAsync(String json)
        {
            // Create/setup the master node from the JSON.
            var masterNode = SegmentsTreeNode.CreateFromJson(json);
            if (masterNode == null)
                return null;

            // Load-and-merge extra pages.
            Uri nextPageUri;
            JsonResult<WebApiResourceResult> jsonResult;
            WebApiResourceResult result;
            for (var node = masterNode; ; )
            {
                // Is there a next page of children?
                nextPageUri = node.GetNextPageOfChildrenUri();

                // No.
                if (nextPageUri == null)
                    break;

                // Yes.
                try
                {
                    // Get the next page.  Return null if failed.
                    jsonResult = await GetResource(nextPageUri.OriginalString, "json", false);
                    result = jsonResult.TypedData;
                    if (!result.isLoggedOn || !result.success || (result.httpStatus != 200))
                        return null;

                    // Create a new node from the retrieved representation.
                    node = SegmentsTreeNode.CreateFromJson(result.representation);

                    // Add the new node's children to the master node.
                    masterNode.AddChildren(node);
                }
                catch
                {
                    return null;
                }
            }

            // Return the master node.
            return masterNode;
        }

        // Gets the name of a segments tree node measure from the global collection of such measures, given its
        // measure id.  If 'currency' and 'statsFrequency' are specified, then they are used to replace placeholders
        // that may exist in the name (placeholders that refer to currency and statistics frequency).  Returns the
        // empty string if not found.
        public String GetSegmentsTreeMeasureName(String id, String currency, String statsFrequency)
        {
            if (String.IsNullOrWhiteSpace(id))
                return String.Empty;

            var measureInfo = GlobalState.SegmentsTreeNodeMeasuresInfo.FirstOrDefault(mi => mi.Id == id);
            if (measureInfo == null)
                return String.Empty;

            var name = measureInfo.Name;

            if (currency != null)
                name = name.Replace("[CUR]", currency);
            if (statsFrequency != null)
            {
                name = name.Replace("[SUBPERIOD]", statsFrequency)
                           .Replace("[SUBPERIODS]", statsFrequency + " Returns");
            }

            return name;
        }
        #endregion
    }
}
