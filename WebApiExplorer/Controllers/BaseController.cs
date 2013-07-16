using System;
using System.Web;
using System.Web.Mvc;
using System.Xml;

namespace StatPro.Revolution.WebApiExplorer.Controllers
{
    // The base controller for all of the website's controllers.
    [NoCache]
    [DenyIframeEmbedding]
    public abstract class BaseController : Controller
    {
        // Injected dependencies.
        private readonly ISessionStateAccess _sessionState;
        private readonly IAppSettingsAccess _appSettings;
        private readonly IOAuth2ServerAccess _oauth2Server;
        private readonly IWebApiAccess _webApi;
        private readonly IResourcesAccess _resources;
        private readonly ILogging _logging;
        private readonly IGlobalStateAccess _globalState;

        // Constructor.
        protected BaseController(ISessionStateAccess sessionState, IAppSettingsAccess appSettings,
            IOAuth2ServerAccess oauth2Server, IWebApiAccess webApi, IResourcesAccess resources, ILogging logging,
            IGlobalStateAccess globalState)
        {
            this._sessionState = sessionState;
            this._appSettings = appSettings;
            this._oauth2Server = oauth2Server;
            this._webApi = webApi;
            this._resources = resources;
            this._logging = logging;
            this._globalState = globalState;

            // Set up the ViewBag with the static file version number.  Because this ViewBag item is used in
            // the _Layout.cshtml view, it must be set up for each and every action that can display a view.
            // For debugging, the static file version 'number' is the time now, in RFC 3339 date/time format.
#if DEBUG
            var sfvn = XmlConvert.ToString(DateTime.UtcNow, XmlDateTimeSerializationMode.Utc);
#else
            var sfvn = (appSettings != null) ? appSettings.StaticFileVersionNumber : "1";
#endif
            ViewBag.Sfvn = Uri.EscapeDataString(sfvn);

            // Set up the ViewBag with the flag saying whether the browser should load the optimized/built JavaScript
            // (one file) or the non-optimised JavaScript (many files).
#if DEBUG
            ViewBag.UseOptimizedJs = false;
#else
            ViewBag.UseOptimizedJs = true;
#endif
        }

        #region Properties
        // Gets the injected implementation of ISessionStateAccess.
        protected ISessionStateAccess SessionState
        {
            get
            {
                return _sessionState;
            }
        }

        // Gets the injected implementation of IAppSettingsAccess.
        protected IAppSettingsAccess AppSettings
        {
            get
            {
                return _appSettings;
            }
        }

        // Gets the injected implementation of IOAuth2ServerAccess.
        protected IOAuth2ServerAccess OAuth2Server
        {
            get
            {
                return _oauth2Server;
            }
        }

        // Gets the injected implementation of IWebApiAccess.
        protected IWebApiAccess WebApi
        {
            get
            {
                return _webApi;
            }
        }

        // Gets the injected implementation of IResourcesAccess.
        protected IResourcesAccess Resources
        {
            get
            {
                return _resources;
            }
        }

        // Gets the injected implementation of ILogging.
        protected ILogging Logging
        {
            get
            {
                return _logging;
            }
        }

        // Gets the injected implementation of IGlobalStateAccess.
        protected IGlobalStateAccess GlobalState
        {
            get
            {
                return _globalState;
            }
        }
        #endregion

        #region Methods
        // Returns a newly-created strongly-typed Json result.
        protected static JsonResult<TData> ToJsonResult<TData>(TData obj)
        {
            return new JsonResult<TData>(obj);
        }

        // Returns the user's preferred language as a culture name, as supplied by the user's browser in the
        // specified request object.
        protected static String GetUserPreferredLanguage(HttpRequestBase request)
        {
            const String defaultLang = "en-US";

            if ((request == null) || (request.UserLanguages == null) || (request.UserLanguages.Length == 0))
                return defaultLang;

            return request.UserLanguages[0];
        }

        #endregion
    }
}
