using System;

namespace StatPro.Revolution.WebApiExplorer.JsDtos
{
    // Represents information about a measure ("Alpha", "Beta", etc.) that can be requested for inclusion in a
    // Segments Tree Node resource or a Time Series resource.  This class wraps an instance of
    // 'StatPro.Revolution.WebApiExplorer.MeasureInfo', and makes (some of) its properties accessible to JavaScript
    // in a JS-friendly way (i.e. property "name" instead of "Name").
    public class MeasureInfo
    {
        private StatPro.Revolution.WebApiExplorer.Models.MeasureInfo _measureInfo;

        // Constructor.
        public MeasureInfo(StatPro.Revolution.WebApiExplorer.Models.MeasureInfo measureInfo)
        {
            if (measureInfo == null)
                throw new ArgumentNullException("measureInfo");

            _measureInfo = measureInfo;
        }

        #region Properties
        // Gets the unique identifier of the measure.
        public String id
        {
            get
            {
                return _measureInfo.Id;
            }
        }

        // Gets the measure's name.
        public String name
        {
            get
            {
                return _measureInfo.Name;
            }
        }

        // Gets the measure's category name.
        public String category
        {
            get
            {
                return _measureInfo.Category;
            }
        }

        // Gets the measure's type.
        // "i" = integer, "d" = double, "s" = string
        public String type
        {
            get
            {
                return _measureInfo.MeasureType.ToString();
            }
        }
        #endregion
    }
}
