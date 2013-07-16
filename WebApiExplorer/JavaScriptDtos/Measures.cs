using System;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents information about a collection of requestable measures, for either Time Series or Segments Tree Node
    // results data.
    public class Measures
    {
        // Constructor.
        public Measures()
        {
        }

        #region Properties
        // Array of measures.
        public MeasureInfo[] measures { get; set; }

        // Array of named categories into which the measures fall.
        public String[] categories { get; set; }
        #endregion
    }
}
