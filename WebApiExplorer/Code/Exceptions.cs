using System;
using System.Net;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// The exception that is thrown when the OAuth2 Server returns an error response, or there is an error
    /// in talking to the OAuth2 Server.
    /// </summary>
    public class AuthorizationException : Exception
    {
        #region Constructors
        /// <summary>
        /// Initializes a new instance of the AuthorizationException class.
        /// </summary>
        public AuthorizationException()
            : base(String.Empty)
        {
        }

        /// <summary>
        /// Initializes a new instance of the AuthorizationException class with a specified error message.
        /// </summary>
        /// <param name="message">
        /// The error message that explains the reason for the exception. 
        /// </param>
        public AuthorizationException(String message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the AuthorizationException class with a specified error message and a
        /// reference to the inner exception that is the cause of this exception. 
        /// </summary>
        /// <param name="message">
        /// The error message that explains the reason for the exception. 
        /// </param>
        /// <param name="innerException">
        /// The exception that is the cause of the current exception. If the innerException parameter is not a
        /// null reference, the current exception is raised in a catch block that handles the inner exception.
        /// </param>
        public AuthorizationException(String message, Exception innerException)
            : base(message, innerException)
        {
        }
        #endregion

        #region Properties
        /// <summary>
        /// Sets/gets a flag that says if the authorization grant (an authorization code or a refresh token)
        /// has expired, is invalid, or has been revoked.
        /// </summary>
        public Boolean AuthorizationGrantExpiredOrInvalid { get; set; }
        #endregion
    }

    /// <summary>
    /// The exception that is thrown when the Revolution Web API returns an error response, or there is an error
    /// in talking to the Revolution Web API.
    /// </summary>
    public class WebApiException : Exception
    {
        #region Constructors
        /// <summary>
        /// Initializes a new instance of the WebApiException class.
        /// </summary>
        public WebApiException()
            : base(String.Empty)
        {
        }

        /// <summary>
        /// Initializes a new instance of the WebApiException class with a specified error message.
        /// </summary>
        /// <param name="message">
        /// The error message that explains the reason for the exception. 
        /// </param>
        public WebApiException(String message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the WebApiException class with a specified error message and a
        /// reference to the inner exception that is the cause of this exception. 
        /// </summary>
        /// <param name="message">
        /// The error message that explains the reason for the exception. 
        /// </param>
        /// <param name="innerException">
        /// The exception that is the cause of the current exception. If the innerException parameter is not a
        /// null reference, the current exception is raised in a catch block that handles the inner exception.
        /// </param>
        public WebApiException(String message, Exception innerException)
            : base(message, innerException)
        {
        }
        #endregion

        #region Properties
        /// <summary>
        /// Sets/gets the response's HTTP status code (or null if not available).
        /// </summary>
        /// <remarks>
        /// If non-null, then the response's Reason Phrase will be set as the message of the exception (stripped of
        /// the Web API-provided error code (" REVAPI_ERROR=&lt;error code&gt;") if provided).
        /// </remarks>
        public HttpStatusCode? StatusCode { get; set; }

        /// <summary>
        /// Sets/gets the Web API-provided error code (" REVAPI_ERROR=&lt;error code&gt;") that was provided in
        /// the response's reason phrase (or null if not available).  If non-null then the provided error code was
        /// recognised (i.e. we have an enum identifier that equates to the error code's value).
        /// </summary>
        /// <remarks>
        /// Ignore this property is <see cref="StatusCode"/> is null.
        /// </remarks>
        public WebApiErrorCode? ErrorCode { get; set; }

        /// <summary>
        /// Sets/gets the Web API-provided error code (" REVAPI_ERROR=&lt;error code&gt;") that was provided in
        /// the response's reason phrase (or null if not available).  If non-null then the provided error code was
        /// not recognised (i.e. we don't have an enum identifier that equates to the error code's value).
        /// </summary>
        /// <remarks>
        /// Ignore this property is <see cref="StatusCode"/> is null.
        /// </remarks>
        public Int32? UnrecognisedErrorCode { get; set; }

        /// <summary>
        /// True if the Web API indicated that the specified access token has expired or is invalid; in all other
        /// case the flag is false.
        /// </summary>
        /// <remarks>
        /// Ignore this property is <see cref="StatusCode"/> is null.
        /// </remarks>
        public Boolean AccessTokenExpiredOrInvalid { get; set; }

        /// <summary>
        /// True if the Web API indicates that the request is forbidden because the combination of the requesting
        /// client application and the user's organization has been blacklisted due to usage exceeding the
        /// Revolution Web API's Fair Usage Policy limits.
        /// </summary>
        /// <remarks>
        /// Ignore this property is <see cref="StatusCode"/> is null.
        /// </remarks>
        public Boolean RequestForbiddenDueToFairUsagePolicyViolation { get; set; }
        #endregion
    }
}
