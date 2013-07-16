using System;

using NLog;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements ILogging for the website.
    public class WebsiteLogging : ILogging
    {
        private static Logger _logger = LogManager.GetCurrentClassLogger();

        // Constructor.
        public WebsiteLogging()
        {
        }

        #region ILogging Implementation
        public void LogError(String errorMessage)
        {
            if (errorMessage == null)
                errorMessage = String.Empty;

            _logger.Error(errorMessage);
        }
        #endregion
    }
}
