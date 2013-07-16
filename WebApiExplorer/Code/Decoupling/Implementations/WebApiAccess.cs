using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Globalization;

using Ninject;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements IWebApiAccess for the website.
    public class WebApiAccess : IWebApiAccess
    {
        private ILogging _logging;

        // Constructor.
        [Inject]
        public WebApiAccess(ILogging logging)
        {
            _logging = logging;
        }

        #region IWebApiAccess Implementation
        // Asynchronously gets the representation of a resource from the Web API.
        // See the method definition in the IOAuth2ServerAccess interface for a full description.
        public async Task<Tuple<String, String>> GetResourceAsync(String resourceUri, String accessToken,
            RepresentationFormat format)
        {
            // Check the args.
            if (resourceUri == null)
                throw new ArgumentNullException("resourceUri");
            if (accessToken == null)
                throw new ArgumentNullException("accessToken");
            if (String.IsNullOrWhiteSpace(resourceUri))
                throw new ArgumentException("The resource URI is empty or whitespace.", "resourceUri");
            if (String.IsNullOrWhiteSpace(accessToken))
                throw new ArgumentException("The access token is empty or whitespace.", "accessToken");
            if ((format != RepresentationFormat.Json) && (format != RepresentationFormat.Xml))
                throw new ArgumentException("The representation format is invalid.", "format");


            // Get the resource from the Web API.
            HttpClient httpClient = null;
            try
            {
                httpClient = new HttpClient();

                // Set the Authorization header to identify the user.  The access token is not base64-encoded here
                // because it is expected to already be base64-encodedi.
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                // Set the Accept header to indicate whether we want a JSON or XML based resource representation.
                httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue(
                        (format == RepresentationFormat.Json) ? "application/json" : "application/xml"
                    ));

                // Send a GET request for the resource and await the response.
                var response = await httpClient.GetAsync(resourceUri);

                // According to the status of the response...
                switch (response.StatusCode)
                {
                    case HttpStatusCode.OK:
                        {
                            var representation = await response.Content.ReadAsStringAsync();
                            var mediaType = response.Content.Headers.ContentType.MediaType;
                            return Tuple.Create(representation, mediaType);
                        }

                    // We will assume that any other status code is an error status code.
                    default:
                        {
                            // Get error information from the reason phrase.
                            var errorInfo = GetErrorInformation(response.ReasonPhrase);

                            // Has the access token expired (or is it invalid)?
                            var accessTokenRejected = IsAccessTokenExpiredOrInvalid(response);

                            // Was the request blocked/forbidden due to a Fair Usage Policy violation?
                            var blockedDueToFup = IsRequestBlockedDueToFairUsagePolicy(response,
                                errorInfo.Item2);   // recognised Web API error code (or null)

                            // Throw WebApiException, specifying as much information about the error as possible.
                            throw new WebApiException(errorInfo.Item1)   // exception message = error message
                            {
                                StatusCode = response.StatusCode,        // status code
                                ErrorCode = errorInfo.Item2,             // recognised Web API error code (or null)
                                UnrecognisedErrorCode = errorInfo.Item3, // unrecognised Web API error code (or null)
                                AccessTokenExpiredOrInvalid = accessTokenRejected,
                                RequestForbiddenDueToFairUsagePolicyViolation = blockedDueToFup
                            };
                        }
                }
            }

            catch (WebApiException)
            {
                // Re-throw this exception.
                throw;
            }

            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Error on talking to the Web API.  " + ex.ToString();
                System.Diagnostics.Debug.WriteLine(errorMessage);
                _logging.LogError(errorMessage);

                throw new WebApiException("Failed to talk to the Revolution Web API.", ex);
            }

            finally
            {
                if (httpClient != null)
                    httpClient.Dispose();
            }
        }
        #endregion

        #region Methods
        // Parses the specified reason phrase and returns a three-item tuple with the following information:-
        //   item 1 - the reason phrase (or error message) stripped of " (REVAPI_ERROR=<error code>)" if present
        //   item 2 - the Web API error code as a WebApiErrorCode enum value (or null if not present)
        //   item 3 - the Web API error code as an integer, if present but not recognised as a WebApiErrorCode value.
        public static Tuple<String, WebApiErrorCode?, Int32?> GetErrorInformation(String reasonPhrase)
        {
            const String WebApiErrorPrefix = " (REVAPI_ERROR=";


            // Null reason phrase --> empty string.
            if (reasonPhrase == null)
                reasonPhrase = String.Empty;

            // Defaults.
            String errorMessage = reasonPhrase;
            WebApiErrorCode? errorCode = null;
            Int32? unrecognisedErrorCode = null;

            // If the reason phrase contains text " (REVAPI_ERROR="...
            var index = reasonPhrase.IndexOf(WebApiErrorPrefix, StringComparison.Ordinal);
            if (index >= 0)
            {
                // Get the error code + trailing closing parens.
                var text = reasonPhrase.Substring(index + WebApiErrorPrefix.Length);

                // If there's a trailing parens...
                if (text.EndsWith(")", StringComparison.Ordinal))
                {
                    // Isolate the error code.
                    text = text.TrimEnd(')');

                    // Convert error code text to value.  If successful...
                    Int32 errorCodeValue;
                    if (Int32.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out errorCodeValue))
                    {
                        // Set up either 'errorCode' or 'unrecognisedErrorCode'.
                        if (Enum.IsDefined(typeof(WebApiErrorCode), errorCodeValue))
                            errorCode = (WebApiErrorCode)errorCodeValue;
                        else
                            unrecognisedErrorCode = errorCodeValue;

                        // Error message = reason phrase stripped of " (REVAPI_ERROR=<error code>)".
                        errorMessage = reasonPhrase.Substring(0, index);
                    }
                }
            }

            // Return.
            return Tuple.Create(errorMessage, errorCode, unrecognisedErrorCode);
        }

        // Returns true if the Web API has indicated that the supplied bearer access token has expired or is invalid.
        // In all other cases the method returns false.
        public static Boolean IsAccessTokenExpiredOrInvalid(HttpResponseMessage response)
        {
            if ((response == null) || (response.StatusCode != HttpStatusCode.Unauthorized))
                return false;

            var headerValue = response.Headers.WwwAuthenticate.FirstOrDefault(ahv => ahv.Scheme == "Bearer");

            if ((headerValue != null) && (headerValue.Parameter != null) &&
                (headerValue.Parameter.IndexOf("error=\"invalid_token\"", StringComparison.Ordinal) >= 0))
                return true;
            else
                return false;
        }

        // Returns true if the Web API has indicated that the request was blocked/forbidden due to a Fair Usage
        // Policy violation.  In all other cases the method returns false.
        // 'response' is the response that was returned; 'webApiErrorCode' contains the Web API error code that the
        // Web API may have returned (if non-null).
        public static Boolean IsRequestBlockedDueToFairUsagePolicy(HttpResponseMessage response, 
            WebApiErrorCode? webApiErrorCode)
        {
            if ((response != null) &&
                (webApiErrorCode != null) &&
                (response.StatusCode == HttpStatusCode.Forbidden) &&
                (webApiErrorCode.Value == WebApiErrorCode.UserTenancyAndClientAppBlacklisted))
                return true;
            else
                return false;
        }
        #endregion
    }
}
