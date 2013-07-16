using System;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines operations for logging.
    /// </summary>
    public interface ILogging
    {
        /// <summary>
        /// Logs an error message.
        /// </summary>
        /// <param name="errorMessage">
        /// The message to log as an error.
        /// </param>
        void LogError(String errorMessage);
    }
}
