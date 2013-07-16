using System;
using System.Xml.Linq;

namespace StatPro.Revolution.WebApiExplorer.Models
{
    // Represents information about a measure ("Alpha", "Beta", etc.) that can be requested for inclusion in a
    // Segments Tree Node resource or a Time Series resource.
    public class MeasureInfo
    {
        // Default constructor.
        public MeasureInfo()
        {
        }

        // Constructor that takes a measure element that represents the following XML format:-
        //     <measure>
        //       <id>ActiveShare</id>
        //       <name>Active Share</name>
        //       <category>Stock Weights</category>
        //       <type>d</type>
        //       <comment></comment>
        //     </measure>
        public MeasureInfo(XElement measureElement, XNamespace ns)
        {
            if (measureElement == null)
                throw new ArgumentNullException("measureElement");
            if (ns == null)
                throw new ArgumentNullException("ns");

            var me = measureElement;
            Id = me.Element(ns + "id").Value;
            Name = me.Element(ns + "name").Value;
            Category = me.Element(ns + "category").Value;
            MeasureType = me.Element(ns + "type").Value[0];
            Comment = me.Element(ns + "comment").Value;
        }

        #region Properties
        public String Id { get; set; }
        public String Name { get; set; }
        public String Category { get; set; }
        public Char MeasureType { get; set; }       // 'i' = integer, 'd' = double, 's' = string
        public String Comment { get; set; }
        #endregion
    }
}
