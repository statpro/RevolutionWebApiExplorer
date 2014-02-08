using System;
using System.Web;
using System.Web.Mvc;
using System.Threading.Tasks;
using System.Globalization;
using System.Diagnostics.CodeAnalysis;

using Ninject;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer.Controllers
{
    // OAuth2 controller, containing actions that interact with the StatPro Revolution OAuth2 Server.
    public class OAuth2Controller : BaseController
    {
        // Random number generator.
        private static Random _random = new Random();  // seeded from system clock

        // Constructor.
        [Inject]
        public OAuth2Controller(ISessionStateAccess sessionState, IAppSettingsAccess appSettings,
            IOAuth2ServerAccess oauth2Server, IWebApiAccess webApi, IResourcesAccess resources, ILogging logging,
            IGlobalStateAccess globalState)
            : base(sessionState, appSettings, oauth2Server, webApi, resources, logging, globalState)
        {
        }

        #region Actions
        // ReceiveAuthCode action.  Will be redirected-to with either an authorization code or with an indication
        // of authorization failure by the StatPro Revolution OAuth2 Server.
        // The arguments come from query strings of the same name (ergo the parameters must not be renamed).
        [AcceptVerbs(HttpVerbs.Get)]
        [SuppressMessage("Microsoft.Naming", "CA1707:IdentifiersShouldNotContainUnderscores",
            Justification = "Parameter error_description must be so named to match the query string of the same name.")]
        public async Task<ActionResult> ReceiveAuthCode(String code, String error, String error_description,
            String state)
        {
            const String InvalidAuthResponseMessage = 
                "An invalid response has been received from the Authorization Server.  Please try again.";
            const String UserTookTooLongMessage =
                "Sorry, but it took too long to log in to the Authorization Server and grant access.  Please try again.";


            /* Check for errors */

            ViewBag.Error = false;
            ViewBag.ErrorMessage = String.Empty;
            ViewBag.ErrorDescription = String.Empty;

            // We must have been supplied a 'state' query string value.
            if (String.IsNullOrWhiteSpace(state))
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = InvalidAuthResponseMessage;
                return View();
            }

            // We supplied an integer state value in the auth request, so the echoed-back state value must be
            // an integer.
            Int32 stateValue;
            if (!Int32.TryParse(state, NumberStyles.Integer, CultureInfo.InvariantCulture, out stateValue))
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = InvalidAuthResponseMessage;
                return View();
            }

            // Get the retained state value from session state.  If null, then session state has expired due to
            // inactivity - i.e. the user took too long to log in and grant access.
            var retainedStateValue = SessionState.AuthRequestState;
            if (retainedStateValue == null)
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = UserTookTooLongMessage;
                return View();
            }

            // We can now null-out the retained state value in session state.
            SessionState.AuthRequestState = null;

            // Reject the authorization response if the provided state value isn't the same as the retained
            // state value.
            if (stateValue != retainedStateValue.Value)
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = InvalidAuthResponseMessage;
                return View();
            }

            // It's an error if we've been supplied with both an authorization code and an error code.
            if (!String.IsNullOrWhiteSpace(code) && !String.IsNullOrWhiteSpace(error))
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = InvalidAuthResponseMessage;
                return View();
            }

            // If the OAuth2 Server reported an error...
            if (!String.IsNullOrWhiteSpace(error))
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = GetErrorMessageForAuthorizationCodeGrantError(error);
                ViewBag.ErrorDescription = error_description ?? String.Empty;
                return View();
            }

            // If the OAuth2 Server didn't supply an authorization code...
            if (String.IsNullOrWhiteSpace(code))
            {
                ViewBag.Error = true;
                ViewBag.ErrorMessage = InvalidAuthResponseMessage;
                return View();
            }
            

            /* We've got an authorization code. */

            // Swap the authorization code for user data.
            UserData userData;
            try
            {
                userData = await OAuth2Server.GetUserDataFromAuthorizationCodeAsync(code,
                    AppSettings.ClientApplicationRedirectUri);
            }
            catch (AuthorizationException ex)
            {
                // Note: we don't take any special action if the authorization code has expired.

                ViewBag.Error = true;
                ViewBag.ErrorMessage = ex.Message;
                return View();
            }

            // Log the user on to this website.
            SessionState.OnLoggedOn(userData);

            // Redirect to the Home page.     
            return RedirectToAction("Index", "Home");
        }
        #endregion

        #region Methods
        // Returns a tuple whose first item contains the URI to redirect to, in order to request an authorization
        // code from the StatPro Revolution OAuth2 Server.  The second item contains the 'state' value that's
        // included in the URI.  'appSettings' give access to application settings, and must be non-null.
        public static Tuple<String, Int32> GetAuthorizationRequestInfo(IAppSettingsAccess appSettings)
        {
            if (appSettings == null)
                return null;

            // Get the data we need from app settings.
            var authEndpointUri = appSettings.OAuth2ServerAuthorizationEndpointUri;
            var publicId = appSettings.ClientApplicationPublicId;
            var redirectUri = appSettings.ClientApplicationRedirectUri;
            var scopeList = appSettings.RevolutionResourceServers;

            // State = a random, positive integer.
            var state = _random.Next();

            // Form the URI to redirect to.
            var uri = String.Format(CultureInfo.InvariantCulture,
                "{0}?response_type=code&client_id={1}&redirect_uri={2}&scope={3}&state={4}",
                authEndpointUri,
                Uri.EscapeDataString(publicId),
                Uri.EscapeDataString(redirectUri),
                Uri.EscapeDataString(scopeList),
                state);

            // Return the resulting URI + the state value.
            return Tuple.Create<String, Int32>(uri, state);
        }

        // Returns an error message that equates to the specified error code, which is expected to be one of the
        // error codes that's defined by http://tools.ietf.org/html/rfc6749#section-4.1.2.1 
        // Only call this method if 'error' is not null, empty or whitespace.
        public static String GetErrorMessageForAuthorizationCodeGrantError(String error)
        {
            switch (error)
            {
                case "invalid_request":
                    return "The Authorization Server received an invalid request.  Please try again.";

                case "unauthorized_client":
                    return "This application is not correctly registered to talk to the Authorization Server.";

                case "access_denied":
                    return "Access by this website to the indicated resource service(s) has been denied.  " +
                           "Please try again.";

                case "unsupported_response_type":
                    return "The Authorization Server cannot process the authorization request.";

                case "invalid_scope":
                    return "This application did not correctly identify the resource service(s) that it " +
                        "wishes to access.";

                case "server_error":
                    return "The Authorization Server suffered an unexpected, internal error.  Please try again.";

                case "temporarily_unavailable":
                    return "The Authorization Server is temporarily unavailable.  Please try again.";

                default:
                    return "The Authorization Server returned an unknown error code.";
            }
        }
        #endregion
    }
}
