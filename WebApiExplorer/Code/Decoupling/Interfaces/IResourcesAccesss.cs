using System;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines members for accessing the application's resource strings (as stored in .resx files).
    /// </summary>
    public interface IResourcesAccess
    {
        /// <summary>
        /// Gets the name of a time series measure, from its identifier.
        /// </summary>
        /// <remarks>
        /// <para>
        /// If the returned name contains "[CUR]", this fragment should be replaced by the analysis's currency code
        /// before the name is displayed to the user.
        /// </para>
        /// <para>
        /// For full details of time series measures, see https://revapi.statpro.com/v1/apidocs/measures/timeSeries
        /// </para>
        /// </remarks>
        /// <param name="measureId">
        /// The time series measure's identifier (e.g. "Rp").  The identifier is treated case-sensitively.
        /// </param>
        /// <returns>
        /// The name of the measure, or the empty string if <paramref name="measureId"/> is null/empty/whitespace or
        /// unknown.
        /// </returns>
        String GetTimeSeriesMeasure(String measureId);
    }
}
