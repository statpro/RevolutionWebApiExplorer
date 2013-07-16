using System;
using System.Linq;
using System.Web;
using System.Web.Mvc;

using Ninject;

using StatPro.Revolution.WebApiExplorer.JsDtos;

namespace StatPro.Revolution.WebApiExplorer.Controllers
{
    public class HomeController : BaseController
    {
        // Constructor.
        [Inject]
        public HomeController(ISessionStateAccess sessionState, IAppSettingsAccess appSettings,
            IOAuth2ServerAccess oauth2Server, IWebApiAccess webApi, IResourcesAccess resources, ILogging logging,
            IGlobalStateAccess globalState)
            : base(sessionState, appSettings, oauth2Server, webApi, resources, logging, globalState)
        {
        }

        #region Actions
        // Default action.
        [AcceptVerbs(HttpVerbs.Get)]
        public ActionResult Default()
        {
            return RedirectToAction("Index");
        }

        // Index action.
        [AcceptVerbs(HttpVerbs.Get)]
        public ActionResult Index()
        {
            // Set up a UserInfo object to say if the connecting user is logged on or not, and if logged on what
            // their display name is.
            var userInfo = new UserInfo();
            var userData = SessionState.LoggedOnUser;
            if (userData == null)
            {
                userInfo.isLoggedOn = false;
                userInfo.displayName = String.Empty;
                userInfo.preferredLanguage = GetUserPreferredLanguage(Request);
            }
            else
            {
                userInfo.isLoggedOn = true;
                userInfo.displayName = userData.UserName;
                userInfo.preferredLanguage = GetUserPreferredLanguage(Request);
            }

            // Display our view, providing the UserInfo object as the model.
            return View(userInfo);
        }

        // LogOnOff action.
        [AcceptVerbs(HttpVerbs.Post)]
        [ValidateAntiForgeryToken()]
        public JsonResult<LogOnOffResult> LogOnOff()
        {
            // If the connecting user is currently logged on, log them off.
            if (SessionState.IsUserLoggedOn)
            {
                SessionState.OnLoggedOff();
                SessionState.Abandon();
                return ToJsonResult(new LogOnOffResult());
            }

            // Else the connecting user is currently logged off.
            else
            {
                // Get the info needed to make an authorization request to the StatPro Revolution OAuth2 Server.
                var authRequestInfo = OAuth2Controller.GetAuthorizationRequestInfo(AppSettings);

                // Cache the 'state' value of the request in session state.
                SessionState.AuthRequestState = authRequestInfo.Item2;

                // Return a result providing the URI to redirect to.
                return ToJsonResult(new LogOnOffResult()
                                    {
                                        authorizationRequestUri = authRequestInfo.Item1
                                    });
            }
        }

        // GetExportCultures action.  Gets information about the server-side cultures that can be used when
        // exporting data (e.g. CSV data).
        [AcceptVerbs(HttpVerbs.Post)]
        [ValidateAntiForgeryToken()]
        public JsonResult<Culture []> GetExportCultures()
        {
            return ToJsonResult(GlobalState.ExportCultures.Select(ci => new Culture(ci)).ToArray());
        }
        #endregion
    }
}
