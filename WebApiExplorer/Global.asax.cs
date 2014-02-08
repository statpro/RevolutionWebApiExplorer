using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;

using Ninject;

namespace StatPro.Revolution.WebApiExplorer
{
    // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
    // visit http://go.microsoft.com/?LinkId=9394801

    public class MvcApplication : System.Web.HttpApplication
    {
        private static IKernel _ninKernel;

        // Called when the application starts.
        protected void Application_Start()
        {
            // Create the Ninject kernel.
            _ninKernel = new StandardKernel();

            // Set up Ninject's bindings.
            SetNinjectBindings();

            // Tell our controller factory to use Ninject.
            ControllerFactory.NinjectKernel = _ninKernel;

            // Set our own controller factory.
            ControllerBuilder.Current.SetControllerFactory(typeof(ControllerFactory));

            // Disable the "X-AspNetMvc-Version" response header.
            MvcHandler.DisableMvcResponseHeader = true;

            // Initialize global state.  If this fails then an exception is thrown out to ASP.NET MVC, and the
            // application won't start up.
            InitializeGlobalState();

            // MVC boilerplate.
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
        }

        // Occurs just before ASP.NET sends HTTP headers to the client.
        protected void Application_PreSendRequestHeaders(object sender, EventArgs e)
        {
            // Remove the "Server" response header.
            // This won't work for static files (JavaScript and CSS).  Use a custom HTTP module for this case.
            Response.Headers.Remove("Server");
        }
        
        // Called when the application ends.
        protected void Application_End(object sender, EventArgs e)
        {
            // Dispose of the Ninject kernel.
            if (_ninKernel != null)
            {
                try
                {
                    _ninKernel.Dispose();
                }
                catch
                {
                    // swallow
                }
            }
        }

        // Sets up Ninject's bindings on the '_ninKernel' object.
        private static void SetNinjectBindings()
        {
            _ninKernel.Bind<ISessionStateAccess>().To<SessionStateAccess>().InSingletonScope();

            _ninKernel.Bind<IAppSettingsAccess>().To<AppSettingsAccess>().InSingletonScope();

            _ninKernel.Bind<ILogging>().To<WebsiteLogging>().InSingletonScope();

            _ninKernel.Bind<IGlobalStateAccess>().To<GlobalStateAccess>().InSingletonScope();

            _ninKernel.Bind<IOAuth2ServerAccess>().ToMethod(ctx =>
                {
                    var appSettings = _ninKernel.Get<IAppSettingsAccess>();
                    return new OAuth2ServerAccess(
                        appSettings.ClientApplicationPublicId,     // client app's public identifier
                        appSettings.ClientApplicationSecret,       // client app's "secret"
                        appSettings.OAuth2ServerTokenEndpointUri,  // OAuth2 Server's token endpoint URI
                        _ninKernel.Get<ILogging>()                 // ILogging implementation
                    );
                }).InSingletonScope();

            _ninKernel.Bind<IWebApiAccess>().To<WebApiAccess>().InSingletonScope();

            _ninKernel.Bind<IResourcesAccess>().To<ResourcesAccess>().InSingletonScope();
        }

        // Initializes global state (i.e. the GlobalStateAccess class).  Call at application startup, after
        // Ninject bindings have been set up.  Throws an exception if an error occurs.
        private static void InitializeGlobalState()
        {
            var appSettings = _ninKernel.Get<IAppSettingsAccess>();
            var logging = _ninKernel.Get<ILogging>();

            GlobalStateAccess.Init(
                new Uri(appSettings.WebApiSegmentsTreeMeasuresUri),
                new Uri(appSettings.WebApiTimeSeriesMeasuresUri),
                appSettings.ExportCultureNames,
                logging);
        }
    }
}
