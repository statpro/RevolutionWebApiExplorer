using System;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents information about the connecting user.
    public class UserInfo
    {
        // Constructor.
        public UserInfo()
        {
        }

        #region Properties
        // True if the user is logged on, else false.
        public Boolean isLoggedOn { get; set; }

        // If the user is logged on, contains the display name of the user.
        public String displayName { get; set; }

        // Contains the user's preferred language (as specified by the browser, so the format may vary - ideally
        // it will be something like "en-US").
        public String preferredLanguage { get; set; }
        #endregion
    }
}
