using System;
using System.Net;
using System.Text;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Globalization;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using Newtonsoft.Json.Linq;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements IOAuth2ServerAccess for the website.
    public class OAuth2ServerAccess : IOAuth2ServerAccess
    {
        private String _clientAppPublicId;
        private String _clientAppSecret;
        private String _tokenEndpointUri;
        private ILogging _logging;

        // Constructor.
        // 'clientAppPublicId' must specify the public identifier of the client application.
        // 'clientAppSecret' must specify the client application's secret.
        // 'tokenEndpointUri' must specify the URI of the OAuth2 Server's token endpoint.
        // 'logging' must specify an implementation of ILogging.
        public OAuth2ServerAccess(String clientAppPublicId, String clientAppSecret, String tokenEndpointUri,
            ILogging logging)
        {
            this._clientAppPublicId = clientAppPublicId;
            this._clientAppSecret = clientAppSecret;
            this._tokenEndpointUri = tokenEndpointUri;
            this._logging = logging;
        }

        #region IOAuth2ServerAccess Implementation
        // Asynchronously gets user data from the OAuth2 Server, from an authorization code.
        // See the method definition in the IOAuth2ServerAccess interface for a full description.
        public async Task<UserData> GetUserDataFromAuthorizationCodeAsync(String code, String redirectUri)
        {
            // Check the args.
            if (code == null)
                throw new ArgumentNullException("code");
            if (redirectUri == null)
                throw new ArgumentNullException("redirectUri");
            if (String.IsNullOrWhiteSpace(code))
                throw new ArgumentException("The authorization code is empty or whitespace.", "code");
            if (String.IsNullOrWhiteSpace(redirectUri))
                throw new ArgumentException("The redirect URI is empty or whitespace.", "redirectUri");

            // Get the form data to POST to the OAuth2 Server to swap an authorization code for an access token
            // (+ other user data).  Reference: http://tools.ietf.org/html/rfc6749#section-4.1.3
            var formData = new List<KeyValuePair<String, String>>(3)
            {
                new KeyValuePair<String, String>("grant_type", "authorization_code"),
                new KeyValuePair<String, String>("code", code),
                new KeyValuePair<String, String>("redirect_uri", redirectUri)
            };

            // POST the form data, and return the user data.  Can throw AuthorizationException.
            return await GetUserDataFromOAuth2ServerAsync(formData);
        }

        // Asynchronously gets user data from the OAuth2 Server, from a refresh token.
        // See the method definition in the IOAuth2ServerAccess interface for a full description.
        public async Task<UserData> GetUserDataFromRefreshTokenAsync(String refreshToken)
        {
            // Check the arg.
            if (refreshToken == null)
                throw new ArgumentNullException("refreshToken");
            if (String.IsNullOrWhiteSpace(refreshToken))
                throw new ArgumentException("The refresh token is empty or whitespace.", "refreshToken");

            // Get the form data to POST to the OAuth2 Server to swap a refresh token for an access token
            // (+ other user data).  Reference: http://tools.ietf.org/html/rfc6749#section-6
            var formData = new List<KeyValuePair<String, String>>(2)
            {
                new KeyValuePair<String, String>("grant_type", "refresh_token"),
                new KeyValuePair<String, String>("refresh_token", refreshToken)
            };

            // POST the form data, and return the user data.  Can throw AuthorizationException.
            return await GetUserDataFromOAuth2ServerAsync(formData);
        }
        #endregion

        #region Methods
        // Returns an awaitable task that returns user data (access token, refresh token, user identity, etc.) from
        // the StatPro Revolution OAuth2 Server via either an authorization code or a refresh token.
        // 'formData' must be correctly set up with the form data (a collection of name/value pairs) that will be
        // POSTed to the OAuth2 Server.  This method will form-url-encode the form data.
        // This method uses the client application's public identifier and secret, plus the OAuth2 Server's token
        // endpoint URI (as set up in the private fields).
        // Throws AuthorizationException if an error occurs; the message of the exception is intended for end-user
        // consumption.  This exception also indicates if the authorization grant (the authorization code or refresh
        // token has expired, is invalid, or has been revoked.
        private async Task<UserData> GetUserDataFromOAuth2ServerAsync(
            IEnumerable<KeyValuePair<String, String>> formData)
        {
            HttpClient httpClient = null;
            try
            {
                httpClient = new HttpClient();

                // Set the Authorization header to identify the client application.
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                    "Basic",
                    Convert.ToBase64String(ASCIIEncoding.ASCII.GetBytes(_clientAppPublicId + ":" + _clientAppSecret))
                );

                // Get the application/x-www-form-urlencoded content of the request.
                var formUrlEncodedContent = new FormUrlEncodedContent(formData);

                // POST the form to the OAuth2 Server's token endpoint.
                var response = await httpClient.PostAsync(_tokenEndpointUri, formUrlEncodedContent);

                // For a 200 (OK) status code, we expect to have received JSON as described here:-
                //   http://tools.ietf.org/html/rfc6749#section-5.1
                // with the following variations:-
                //    - members 'expires_in', 'refresh_token' and 'scope' are always provided
                //    - members 'user_id' and 'user_name' are provided, and will contain the unique id
                //      and name of the user to whom the access token is tied.
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    // Get the JSON content of the successful response.
                    var jsonContent = await response.Content.ReadAsStringAsync();

                    // Deserialize the JSON into a UserData object.
                    var userData = UserData.DeserializeOAuth2ServerResponse(jsonContent);
                    if (userData == null)
                    {
                        throw new AuthorizationException("Received an invalid response from the Authorization Server.");
                    }

                    // Return the user data.
                    return userData;
                }

                // For status codes 400, 401 and 500 there's a good chance that the origin server (the OAuth2 Server)
                // has provided JSON as described here:-
                //   http://tools.ietf.org/html/rfc6749#section-5.2
                // but it's not guaranteed.
                if ((response.StatusCode == HttpStatusCode.BadRequest) ||
                    (response.StatusCode == HttpStatusCode.Unauthorized) ||
                    (response.StatusCode == HttpStatusCode.InternalServerError))
                {
                    // Get the content of the error response (it may or may not be JSON).
                    var content = await response.Content.ReadAsStringAsync();

                    // Extract error info from the error response.
                    var errorInfo = GetErrorInfoFromErrorResponseJson(content);

                    // If no error info...
                    if (errorInfo == null)
                    {
                        throw new AuthorizationException("The Authorization Server returned an error.  Status = " +
                            ((Int32)response.StatusCode).ToString(CultureInfo.InvariantCulture));
                    }

                    // Throw AuthorizationException with the extracted error message, and with its
                    // 'AuthorizationGrantExpiredOrInvalid' property set to true if the returned error
                    // code is "invalid_grant".
                    throw new AuthorizationException(errorInfo.Item1)
                    {
                        AuthorizationGrantExpiredOrInvalid = (errorInfo.Item2 == "invalid_grant")
                    };
                }

                // For all other status codes (which we assume are error status codes)...
                throw new AuthorizationException("The Authorization Server returned an error.  Status = " +
                    ((Int32)response.StatusCode).ToString(CultureInfo.InvariantCulture));
            }

            catch (AuthorizationException)
            {
                // Re-throw this exception.
                throw;
            }

            catch (Exception ex)
            {
                // Log the error.
                var errorMessage = "Error on talking to the Authorization Server.  " + ex.ToString();
                System.Diagnostics.Debug.WriteLine(errorMessage);
                _logging.LogError(errorMessage);

                throw new AuthorizationException("Failed to talk to the Authorization Server.", ex);
            }

            finally
            {
                if (httpClient != null)
                    httpClient.Dispose();
            }
        }

        // Returns a two-item tuple that contains information about an error response that *may* have been returned
        // by the OAuth2 Server, the format and contents of which are described here:-
        //   http://tools.ietf.org/html/rfc6749#section-5.2
        // (in addition, the StatPro Revolution OAuth2 Server can return non-standard error code "server_error").
        // The first item contains human-readable error message that equates to response's error code.
        // The second item contains the error code itself.
        // Returns null if 'content' is null, empty, whitespace or doesn't contain an OAuth2 error response as
        // described in section 5.2 of RFC 6749.
        [SuppressMessage("Microsoft.Design", "CA1031:DoNotCatchGeneralExceptionTypes",
            Justification = "Not sure what exceptions Newtonsoft.Json can throw.")]
        public static Tuple<String, String> GetErrorInfoFromErrorResponseJson(String content)
        {
            if (String.IsNullOrWhiteSpace(content))
                return null;

            try
            {
                // Get the error code (if available).
                var jObj = JObject.Parse(content);
                var errorCode = (String)jObj["error"];

                // The OAuth2 Server will also return "error_description", which is intended for the client
                // developer.  It can be accessed with:-
                //    var errorDescription = (String)jObj["error_description"]
                //

                // Get an error message from the error code.
                String errorMessage;
                switch (errorCode)
                {
                    // Recognised error codes.
                    case "invalid_request":
                        errorMessage = "The Authorization Server received an invalid request.  Please try again.";
                        break;

                    case "invalid_client":
                        errorMessage = "The Authorization Server was unable to authenticate the client application.";
                        break;

                    case "invalid_grant":
                        errorMessage = "The provided authorization code or refresh token is invalid, has expired " +
                            "or has been revoked.";
                        break;

                    case "invalid_scope":
                        errorMessage = "The requested scope is invalid or unknown.";
                        break;

                    case "unsupported_grant_type":
                        errorMessage = "The Authorization Server doesn't support the specified authorization " +
                            "grant type.";
                        break;

                    case "unauthorized_client":
                        errorMessage = "This application is not authorized to use the specified authorization " +
                            "grant type.";
                        break;

                    case "server_error":
                        errorMessage = "The Authorization Server suffered an unexpected internal error.";
                        break;

                    default:
                        return null;
                }

                // Return the error message and error code.
                return Tuple.Create<String, String>(errorMessage, errorCode);
            }

            catch
            {
                return null;
            }
        }
        #endregion
    }
}
