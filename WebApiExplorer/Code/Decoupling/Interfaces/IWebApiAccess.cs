using System;
using System.Threading.Tasks;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines operations for accessing data from the StatPro Revolution Web API.
    /// </summary>
    public interface IWebApiAccess
    {
        /// <summary>
        /// Asynchronously gets the representation of a resource from the Web API.
        /// </summary>
        /// <param name="resourceUri">
        /// The absolute URI of resource, including any query strings.  The URI must be properly encoded (e.g.
        /// spaces in query string values must be replaced with "%20").
        /// </param>
        /// <param name="accessToken">
        /// The access token provided by the OAuth2 Server that allows access to the Web API for a particular user,
        /// by this client application.  The access token is expected to the base64-encoded.
        /// </param>
        /// <param name="format">
        /// Indicates whether the resource representation should be in XML format or JSON format.
        /// </param>
        /// <returns>
        /// An awaitable task that will return a two-item tuple; the first item will contain the resource
        /// representation, and the second item will contain the resource's media type name (e.g. 
        /// "application/vnd.statpro.revolution.api.portfolios+json").  If the Web API (or an HTTP intermediary)
        /// returns an error, or if there is a problem in talking to the Web API in the first place, then an instance
        /// of <see cref="WebApiException"/> is thrown.
        /// </returns>
        /// <exception cref="ArgumentNullException">
        /// Thrown if <paramref name="resourceUri"/> or <paramref name="accessToken"/> is null.
        /// </exception>
        /// <exception cref="ArgumentException">
        /// Thrown if <paramref name="resourceUri"/> or <paramref name="accessToken"/> is empty or whitespace.
        /// Thrown if <paramref name="format"/> contains an invalid value.
        /// </exception>
        /// <exception cref="WebApiException">
        /// Thrown by the returned task if the Web API (or an HTTP intermediary) returns an error.
        /// </exception>
        Task<Tuple<String, String>> GetResourceAsync(String resourceUri, String accessToken,
            RepresentationFormat format);
    }
}
