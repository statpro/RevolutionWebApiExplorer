using System;
using System.Configuration;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements IAppSettingsAccess for the website.
    public class AppSettingsAccess : IAppSettingsAccess
    {
        // Constructor.
        public AppSettingsAccess()
        {
        }

        #region IAppSettingsAccess Implementation
        // Gets the URI of the StatPro Revolution OAuth2 Server's Authorization endpoint.
        public String OAuth2ServerAuthorizationEndpointUri
        {
            get
            {
                return ConfigurationManager.AppSettings["OAuth2Server_AuthorizationEndpoint"];
            }
        }

        // Gets the URI of the StatPro Revolution OAuth2 Server's Token endpoint.
        public String OAuth2ServerTokenEndpointUri
        {
            get
            {
                return ConfigurationManager.AppSettings["OAuth2Server_TokenEndpoint"];
            }
        }

        // Gets the public identifier of this client application.
        public String ClientApplicationPublicId
        {
            get
            {
                return ConfigurationManager.AppSettings["ClientApp_PublicId"];
            }
        }

        // Gets the "secret" for this client application.
        public String ClientApplicationSecret
        {
            get
            {
                return ConfigurationManager.AppSettings["ClientApp_Secret"];
            }
        }

        // Gets the redirect URI of this client application (i.e. the full URI of the action that the OAuth2 Server
        // will redirect to, in order to provide an authorization code (or an authorization failure).  This
        // redirect URI must be registered with the OAuth2 Server.
        public String ClientApplicationRedirectUri
        {
            get
            {
                return ConfigurationManager.AppSettings["ClientApp_RedirectUri"];
            }
        }

        // Gets the space-delimited list of the scope identifiers of the Revolution resource servers (aka APIs)
        // that this application wants access to.
        public String RevolutionResourceServers
        {
            get
            {
                return ConfigurationManager.AppSettings["RevolutionResourceServers"];
            }
        }

        // Gets the Web API's entry-point address.
        public String WebApiEntryPointUri
        {
            get
            {
                return ConfigurationManager.AppSettings["WebApiEntryPointUri"];
            }
        }

        // Gets the Web API's URI that returns information about the requestable measures from the Segments Tree Node
        // resource.
        public String WebApiSegmentsTreeMeasuresUri
        {
            get
            {
                return ConfigurationManager.AppSettings["WebApiSegmentsTreeMeasuresUri"];
            }
        }

        // Gets the Web API's URI that returns information about the requestable measures from the Time Series
        // resource.
        public String WebApiTimeSeriesMeasuresUri
        {
            get
            {
                return ConfigurationManager.AppSettings["WebApiTimeSeriesMeasuresUri"];
            }
        }

        // Gets the static file version number, used to bust FireFox's aggressive caching of JavaScript, CSS etc.
        public String StaticFileVersionNumber
        {
            get
            {
                return ConfigurationManager.AppSettings["StaticFileVersionNumber"];
            }
        }

        // Gets the space-delimited list of names of .NET cultures that the user can use for exporting data
        // (e.g. CSV data).
        public String ExportCultureNames
        {
            get
            {
                return ConfigurationManager.AppSettings["ExportCultures"];
            }
        }
        #endregion
    }
}
