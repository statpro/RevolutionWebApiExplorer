using System;
using System.Web;
using System.Collections.Generic;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements ISessionStateAccess for the website.
    public class SessionStateAccess : ISessionStateAccess
    {
        // Constructor.
        public SessionStateAccess()
        {
        }

        #region ISessionStateAccess Implementation
        // Abandons the current session.
        public void Abandon()
        {
            HttpContext.Current.Session.Abandon();

            // To defeat session fixation attacks, also clear the cookie-based ASP.NET session id so that a new one
            // will be generated when the connecting user next logs in.
            HttpContext.Current.Response.Cookies.Add(new HttpCookie("ASP.NET_SessionId", String.Empty));
        }

        // Should be called when the connecting user logs on.
        public void OnLoggedOn(UserData user)
        {
            if (user == null)
                throw new ArgumentNullException("user");

            HttpContext.Current.Session["User"] = user;
        }

        // Updates the logged-on user's data.
        public void UpdateLoggedOnUserData(UserData user)
        {
            if (user == null)
                throw new ArgumentNullException("user");

            if ((HttpContext.Current.Session["User"] as UserData) == null)
                throw new InvalidOperationException("The connecting user isn't logged on.");

            // We'll do a simple replace of all the user data.  Note that we don't expect the user's
            // name or email address to have changed.
            HttpContext.Current.Session["User"] = user;
        }

        // Should be called when the connecting (and logged on) user logs off.
        public void OnLoggedOff()
        {
            HttpContext.Current.Session.Clear();
        }

        // Gets a flag saying if the connected user is logged on or not.
        public Boolean IsUserLoggedOn
        {
            get
            {
                return ((HttpContext.Current.Session["User"] as UserData) != null);
            }
        }

        // Gets the logged-on user's information, or null if the connecting user is not logged on.
        public UserData LoggedOnUser
        {
            get
            {
                return (HttpContext.Current.Session["User"] as UserData);
            }
        }

        // Sets/gets the retained state value of the current authorization request (to the OAuth2 Server), or
        // null if there is no outstanding auth request.
        public Int32? AuthRequestState
        {
            get
            {
                return HttpContext.Current.Session["AuthRequestState"] as Int32?;
            }

            set
            {
                HttpContext.Current.Session["AuthRequestState"] = value;
            }
        }

        // Caches a resource representation (and its media type name) in session state for the logged-on user, and
        // returns a newly-created unique identifier for this data.
        public String CacheResource(String representation, String mediaTypeName)
        {
            if ((String.IsNullOrWhiteSpace(representation)) || String.IsNullOrWhiteSpace(mediaTypeName))
                return null;

            var identifier = Guid.NewGuid().ToString("N");
            HttpContext.Current.Session[identifier] = Tuple.Create(representation, mediaTypeName);
            return identifier;
        }

        // Gets a previously cached resource representation (and its media type name), and removes this data
        // from session state.
        public Tuple<String, String> GetAndRemoveCachedResource(String identifier)
        {
            if (String.IsNullOrWhiteSpace(identifier))
                return null;

            Guid id;
            if (!Guid.TryParseExact(identifier, "N", out id))
                return null;

            var data = HttpContext.Current.Session[identifier] as Tuple<String, String>;
            if (data == null)
                return null;

            HttpContext.Current.Session[identifier] = null;
            return data;
        }
        #endregion
    }
}
