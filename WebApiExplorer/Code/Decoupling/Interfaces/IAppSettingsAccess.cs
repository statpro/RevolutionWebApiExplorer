using System;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines operations for accessing application settings.
    /// </summary>
    public interface IAppSettingsAccess
    {
        /// <summary>
        /// Gets the URI of the StatPro Revolution OAuth2 Server's Authorization endpoint.
        /// </summary>
        String OAuth2ServerAuthorizationEndpointUri { get; }

        /// <summary>
        /// Gets the URI of the StatPro Revolution OAuth2 Server's Token endpoint.
        /// </summary>
        String OAuth2ServerTokenEndpointUri { get; }

        /// <summary>
        /// Gets the public identifier of this client application.
        /// </summary>
        String ClientApplicationPublicId { get; }

        /// <summary>
        /// Gets the "secret" for this client application.
        /// </summary>
        String ClientApplicationSecret { get; }

        /// <summary>
        /// Gets the redirect URI of this client application (i.e. the full URI of the action that the OAuth2 Server
        /// will redirect to, in order to provide an authorization code (or an authorization failure).  This
        /// redirect URI must be registered with the OAuth2 Server.
        /// </summary>
        String ClientApplicationRedirectUri { get; }

        /// <summary>
        /// Gets the space-delimited list of the scope identifiers of the Revolution resource servers (aka APIs)
        /// that this application wants access to.
        /// </summary>
        String RevolutionResourceServers { get; }

        /// <summary>
        /// Gets the Web API's entry-point address.
        /// </summary>
        String WebApiEntryPointUri { get; }

        /// <summary>
        /// Gets the Web API's URI that returns information about the requestable measures from the Segments Tree Node
        /// resource.  By default this endpoint returns HTML.  Including request header "Accept: application/json"
        /// will cause it to return JSON; "Accept: application/xml" causes it to return XML.
        /// </summary>
        String WebApiSegmentsTreeMeasuresUri { get; }

        /// <summary>
        /// Gets the static file version number, used to bust FireFox's aggressive caching of JavaScript, CSS etc.
        /// </summary>
        String StaticFileVersionNumber { get; }

        // Gets the space-delimited list of names of .NET cultures that the user can use for exporting data
        // (e.g. CSV data).
        String ExportCultureNames { get; }
    }
}
