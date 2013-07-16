using System;
using System.Collections.Generic;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines methods and properties for accessing per-user ASP.NET session state.
    /// </summary>
    public interface ISessionStateAccess
    {
        /// <summary>
        /// Abandons the current session.
        /// </summary>
        void Abandon();

        /// <summary>
        /// Should be called when the connecting user logs on.
        /// </summary>
        /// <param name="user">
        /// User data.
        /// </param>
        /// <exception cref="ArgumentNullException">
        /// Thrown if <paramref name="user"/> is null.
        /// </exception>
        void OnLoggedOn(UserData user);

        /// <summary>
        /// Updates the logged-on user's data.
        /// </summary>
        /// <remarks>
        /// Call this method after successfully getting a new access token from the user's refresh token.
        /// </remarks>
        /// <param name="user">
        /// Updated user data.
        /// </param>
        /// <exception cref="ArgumentNullException">
        /// Thrown if <paramref name="user"/> is null.
        /// </exception>
        /// <exception cref="InvalidOperationException">
        /// Thrown if the connecting user isn't logged on.
        /// </exception>
        void UpdateLoggedOnUserData(UserData user);

        /// <summary>
        /// Should be called when the connecting (and logged on) user logs off.
        /// </summary>
        void OnLoggedOff();

        /// <summary>
        /// Gets a flag saying if the connected user is logged on or not.
        /// </summary>
        Boolean IsUserLoggedOn { get; }

        /// <summary>
        /// Gets the logged-on user's information, or null if the connecting user is not logged on.
        /// </summary>
        UserData LoggedOnUser { get; }

        /// <summary>
        /// Sets/gets the retained state value of the current authorization request (to the OAuth2 Server), or
        /// null if there is no outstanding auth request.
        /// </summary>
        Int32? AuthRequestState { get; set; }

        /// <summary>
        /// Caches a resource representation (and its media type name) in session state for the logged-on user, and
        /// returns a newly-created unique identifier for this data.
        /// </summary>
        /// <remarks>
        /// <para>
        /// Only call this method if the connecting user is logged on.
        /// </para>
        /// <para>
        /// Cache representations prior to exporting them in CSV format.  CSV Export must remove the representation
        /// from session state.  Representations must be cached only for a very short time.
        /// </para>
        /// </remarks>
        /// <param name="representation">
        /// The resource representation.
        /// </param>
        /// <param name="mediaTypeName">
        /// The resource representation's media type name.
        /// </param>
        /// <returns>
        /// A newly-created unique identifier for the cached data, or null if <paramref name="representation"/> or
        /// <paramref name="mediaTypeName"/> are null/empty/whitespace.
        /// </returns>
        String CacheResource(String representation, String mediaTypeName);

        /// <summary>
        /// Gets a previously cached resource representation (and its media type name), and removes this data
        /// from session state.
        /// </summary>
        /// <param name="identifier">
        /// The unique identifier of the cached resource representation, as returned by a previous call to
        /// <see cref="CacheResource"/>.
        /// </param>
        /// <returns>
        /// A two-item tuple containing the cached representation and the media type name in the first and second
        /// items respectively, or null if the specified identifier is null/empty/whitespace/invalid/unknown.
        /// </returns>
        Tuple<String, String> GetAndRemoveCachedResource(String identifier);
    }
}
