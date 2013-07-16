using System;
using System.Globalization;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents information about a supported server-side culture.
    public class Culture
    {
        // Constructor.
        public Culture(CultureInfo culture)
        {
            if (culture == null)
                throw new ArgumentNullException("culture");

            this.name = culture.Name;
            this.displayName = culture.DisplayName;
        }

        #region Properties
        // Name (e.g. "en-US").
        public String name { get; set; }

        // Display name.
        public String displayName { get; set; }
        #endregion
    }
}
