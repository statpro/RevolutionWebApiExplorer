using System;

using Res = Resources.Shared;

namespace StatPro.Revolution.WebApiExplorer
{
    // Implements IResourcesAccess for the website.
    public class ResourcesAccess : IResourcesAccess
    {
        // Constructor.
        public ResourcesAccess()
        {
        }

        #region IResourcesAccess Implementation
        // Gets the name of a time series measure, from its identifier.
        public String GetTimeSeriesMeasure(String measureId)
        {
            if (String.IsNullOrWhiteSpace(measureId))
                return String.Empty;

            var resourceName = "TimeSeriesMeasure_" + measureId;

            var measureName = Res.ResourceManager.GetString(resourceName, Res.Culture);

            return measureName ?? String.Empty;
        }
        #endregion
    }
}
