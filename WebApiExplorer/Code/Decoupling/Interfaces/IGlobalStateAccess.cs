using System;
using System.Globalization;
using System.Collections.ObjectModel;

using StatPro.Revolution.WebApiExplorer.Models;

namespace StatPro.Revolution.WebApiExplorer
{
    /// <summary>
    /// Defines members for accessing global data.
    /// </summary>
    public interface IGlobalStateAccess
    {
        /// <summary>
        /// Gets information about all the measures that can be requested for inclusion in a Segments Tree Node
        /// resource representation.
        /// </summary>
        ReadOnlyCollection<MeasureInfo> SegmentsTreeNodeMeasuresInfo { get; }

        /// <summary>
        /// Gets a collection of all the named categories into which the Segments Tree Node measures fall.
        /// </summary>
        ReadOnlyCollection<String> SegmentsTreeNodeMeasureCategories { get; }

        /// <summary>
        /// Gets information about all the measures that can be requested for inclusion in a Time Series
        /// resource representation.
        /// </summary>
        ReadOnlyCollection<MeasureInfo> TimeSeriesMeasuresInfo { get; }

        /// <summary>
        /// Gets a collection of all the named categories into which the Time Series measures fall.
        /// </summary>
        ReadOnlyCollection<String> TimeSeriesMeasureCategories { get; }

        /// <summary>
        /// Gets a collection of all the cultures that can be used when exporting data (e.g. CSV data).
        /// </summary>
        ReadOnlyCollection<CultureInfo> ExportCultures { get; }
    }
}
