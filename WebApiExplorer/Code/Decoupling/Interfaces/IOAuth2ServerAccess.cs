using System;
using System.Threading.Tasks;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines operations for accessing data from the StatPro Revolution OAuth2 Server.
    /// </summary>
    public interface IOAuth2ServerAccess
    {
        /// <summary>
        /// Asynchronously gets user data from the OAuth2 Server, from an authorization code.
        /// </summary>
        /// <remarks>
        /// Returns an awaitable task that will return user data (access token, refresh token, user identity, etc.)
        /// from the OAuth2 Server, via an Authorization Code which must have been previously supplied by the OAuth2
        /// Server as part of a successful response to an authorization request.
        /// </remarks>
        /// <param name="code">
        /// The authorization code.
        /// </param>
        /// <param name="redirectUri">
        /// The client application's registered redirect URI.  This URI must have been specified in the original
        /// authorization request which was used to obtain the authorization code in the first place.
        /// </param>
        /// <returns>
        /// An awaitable task that will return user data, if the method is successful.  If the OAuth2 Server
        /// returned an error response, then an instance of <see cref="AuthorizationException"/> is thrown.
        /// </returns>
        /// <exception cref="ArgumentNullException">
        /// Thrown if <paramref name="code"/> or <paramref name="redirectUri"/> is null.
        /// </exception>
        /// <exception cref="ArgumentException">
        /// Thrown if <paramref name="code"/> or <paramref name="redirectUri"/> is empty or whitespace.
        /// </exception>
        /// <exception cref="AuthorizationException">
        /// Thrown by the returned task if the OAuth2 Server returned an error response, or if there was a problem
        /// in talking to the OAuth2 Server in the first place.  The message of this exception is intended for
        /// end-user consumption.  This exception also indicates if the authorization code has expired, is invalid,
        /// or has been revoked.
        /// </exception>
        Task<UserData> GetUserDataFromAuthorizationCodeAsync(String code, String redirectUri);

        /// <summary>
        /// Asynchronously gets user data from the OAuth2 Server, from a refresh token.
        /// </summary>
        /// <remarks>
        /// <para>
        /// Returns an awaitable task that will return user data (access token, refresh token, user identity, etc.)
        /// from the OAuth2 Server, via a refresh token which must have been previously supplied by the OAuth2
        /// Server as part of a successful response to a request for user data (whether from an authorization code
        /// or a refresh token).
        /// </para>
        /// <para>
        /// The main point of this method is to get a new access token for the currently logged-on user.  The method
        /// should be called only when the user's current access token has expired, or is about to expire.
        /// </para>
        /// <para>
        /// Like an access token, a refresh token is tied to a specific user.
        /// </para>
        /// <para>
        /// When issuing a new access token from a refresh token, the StatPro Revolution OAuth2 Server will invalidate
        /// the refresh token, and will issue a new one that should be used next time.
        /// </para>
        /// </remarks>
        /// <param name="refreshToken">
        /// The refresh token.
        /// </param>
        /// <returns>
        /// An awaitable task that will return user data, if the method is successful.  If the OAuth2 Server
        /// returned an error response, then an instance of <see cref="AuthorizationException"/> is thrown.
        /// </returns>
        /// <exception cref="ArgumentNullException">
        /// Thrown if <paramref name="refreshToken"/> is null.
        /// </exception>
        /// <exception cref="ArgumentException">
        /// Thrown if <paramref name="refreshToken"/> is empty or whitespace.
        /// </exception>
        /// <exception cref="AuthorizationException">
        /// Thrown by the returned task if the OAuth2 Server returned an error response, or if there was a problem
        /// in talking to the OAuth2 Server in the first place.  The message of this exception is intended for
        /// end-user consumption.  This exception also indicates if the refresh token is invalid, or has been revoked.
        /// </exception>
        Task<UserData> GetUserDataFromRefreshTokenAsync(String refreshToken);
    }
}
