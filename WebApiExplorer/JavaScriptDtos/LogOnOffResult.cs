using System;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents log on/off result information.
    public class LogOnOffResult
    {
        // Constructor.
        public LogOnOffResult()
        {
        }

        #region Properties
        // If non-null and non-empty, contains the URI of the OAuth2 Server endpoint to redirect to in order
        // to request authorization (for the connecting user, to the Revolution Web API, by this client application).
        public String authorizationRequestUri { get; set; }
        #endregion
    }
}
