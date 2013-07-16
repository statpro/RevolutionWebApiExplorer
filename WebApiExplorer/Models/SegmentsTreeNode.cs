using System;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using Newtonsoft.Json.Linq;

namespace StatPro.Revolution.WebApiExplorer.Models.SegmentsTree
{
    // Represents a Segments Tree Node resource.
    //
    // Note: this class doesn't contain all the information that there can be in a Segments Tree Node resource.
    // Instead it contains only the information that is required by the Web API Explorer.
    //
    // For full details of the data: http://developer.statpro.com/Revolution/WebApi/Resource/SegmentsTreeNode#reprJson
    //
    public class SegmentsTreeNode
    {
        public SegmentsTreeNode() { }

        public SegmentInfo Segment { get; set; }
        public ChildSegmentsInfo ChildSegments { get; set; }
        public SecuritiesInfo Securities { get; set; }

        #region Informational Methods
        // Gets all the time period codes that exist in the node (will be at least one).
        public List<String> GetAllTimePeriodCodes()
        {
            return Segment.TimePeriodCodes;
        }

        // Gets all the measure identifiers that exist in the node (or an empty list if none).
        public List<String> GetAllMeasureIds()
        {
            // If we have measures for the segment...
            var pm = Segment.PeriodicMeasures;
            if ((pm != null) && (pm.Count > 0))
                return pm[0].Measures.Select(m => m.Id).ToList();

            // Else if we have measures for children...
            if (ChildSegments != null)
                pm = ChildSegments.ChildSegments[0].PeriodicMeasures;
            else if (Securities != null)
                pm = Securities.Securities[0].PeriodicMeasures;
            else
                pm = null;
            if ((pm != null) && (pm.Count > 0))
                return pm[0].Measures.Select(m => m.Id).ToList();

            // No measures.
            return new List<String>();
        }

        // Returns a two-item tuple containing the node's children.
        // The second item will contain either "child segments" or "securities".
        // Returns null if there are no chilren.
        public Tuple<List<SegmentTreeNodeChildBase>, String> GetChildren()
        {
            if (ChildSegments != null)
                return Tuple.Create(ChildSegments.ChildSegments.ConvertAll(c => (SegmentTreeNodeChildBase)c),
                                    "child segments");
            else if (Securities != null)
                return Tuple.Create(Securities.Securities.ConvertAll(c => (SegmentTreeNodeChildBase)c),
                                    "securities");
            else
                return null;
        }

        // Returns the URI of the next page of the node's children, or null if the node has no children or if
        // there is no next page.
        public Uri GetNextPageOfChildrenUri()
        {
            if (ChildSegments != null)
                return ChildSegments.NextPageUri;
            else if (Securities != null)
                return Securities.NextPageUri;
            else
                return null;
        }
        #endregion

        #region Operational Methods
        // Appends the children of the specified node to this node.  This node must already have children of the
        // same type as the specified node.
        public void AddChildren(SegmentsTreeNode sourceNode)
        {
            // No source node.
            if (sourceNode == null)
                return;

            if (sourceNode.ChildSegments != null)
            {
                if (this.ChildSegments == null)
                    return;

                this.ChildSegments.ChildSegments.AddRange(sourceNode.ChildSegments.ChildSegments);
            }

            else if (sourceNode.Securities != null)
            {
                if (this.Securities == null)
                    return;

                this.Securities.Securities.AddRange(sourceNode.Securities.Securities);
            }

            else
            { }
        }
        #endregion

        #region CreateFromJson
        // Creates, sets up from the specified JSON string, and returns a new Segments Tree Node.
        // Return null if 'json' isn't valid, or an error occurs.
        [SuppressMessage("Microsoft.Design", "CA1031:DoNotCatchGeneralExceptionTypes",
            Justification = "Not sure what exceptions Newtonsoft throws.")]
        public static SegmentsTreeNode CreateFromJson(String json)
        {
            // Check arg.
            if (String.IsNullOrWhiteSpace(json))
                return null;

            // Parse.
            JObject jObj;
            try
            {
                jObj = JObject.Parse(json);
            }
            catch (Exception)
            {
                return null;
            }

            var jSegTreeNode = jObj["segmentsTreeNode"];
            if (jSegTreeNode == null)
                return null;

            // Create new node.
            var node = new SegmentsTreeNode();

            // Add segment info.
            var jSegment = jSegTreeNode["segment"];
            node.Segment = new SegmentInfo()
            {
                Name = (String)jSegment["name"],
                TimePeriodCodes = ((JArray)jSegment["timePeriods"]).Select(tp => (String)tp).ToList(),
                PeriodicMeasures = GetPeriodicMeasures((JArray)jSegment["measures"])
            };

            // Add children info.
            var jChildSegments = jSegTreeNode["childSegments"];
            var jSecurities = jSegTreeNode["securities"];

            if (jChildSegments != null)
            {
                node.ChildSegments = new ChildSegmentsInfo()
                {
                    NextPageUri = GetChildrenNextPageUri(jChildSegments),
                    ChildSegments = GetChildren<ChildSegment>((JArray)jChildSegments["segments"])
                };
            }
            else if (jSecurities != null)
            {
                node.Securities = new SecuritiesInfo()
                {
                    NextPageUri = GetChildrenNextPageUri(jSecurities),
                    Securities = GetChildren<Security>((JArray)jSecurities["securities"])
                };
            }
            else
            { }


            // Return the node.
            return node;
        }

        // Helper for CreateFromJson.
        private static List<TChild> GetChildren<TChild>(JArray children) where TChild : SegmentTreeNodeChildBase, new()
        {
            if (children == null)
                return new List<TChild>();

            return children.Select(c => new TChild()
                                   {
                                       Name = (String)c["name"],
                                       TimePeriodCodes = ((JArray)c["timePeriods"]).Select(tp => (String)tp).ToList(),
                                       PeriodicMeasures = GetPeriodicMeasures((JArray)c["measures"])
                                   })
                           .ToList();
        }

        // Helper for CreateFromJson.
        private static Uri GetChildrenNextPageUri(JToken childrenToken)
        {
            if (childrenToken != null)
            {
                var paging = childrenToken["paging"];
                if (paging != null)
                {
                    var next = paging["next"];
                    if (next != null)
                        return new Uri((String)next["href"]);
                }
            }

            return null;
        }

        // Helper for CreateFromJson.
        private static List<MeasuresForPeriod> GetPeriodicMeasures(JArray periodicMeasures)
        {
            var pm = periodicMeasures;

            if (pm == null)
                return new List<MeasuresForPeriod>();

            return pm.Select(mfp => new MeasuresForPeriod()
                             {
                                 TimePeriodCode = (String)mfp["tp"],
                                 Measures = ((JArray)mfp["measures"]).Select(m => GetMeasure(m))
                                                                     .ToList()
                             })
                     .ToList();
        }

        // Helper for CreateFromJson.
        private static Measure GetMeasure(JToken measureToken)
        {
            if (measureToken == null)
                return null;

            var id = (String)measureToken["id"];
            var ty = (String)measureToken["ty"];

            var measure = new Measure();
            measure.Id = id;

            switch(ty)
            {
                case "r":
                    measure.Value = (Double?)measureToken["val"];
                    break;
                case "i":
                    measure.IntegerValue = (Int32?)measureToken["val"];
                    break;
                case "s":
                    measure.StringValue = (String)measureToken["val"];
                    break;
            }

            return measure;
        }
        #endregion
    }

    #region Supporting Classes
    // Represents the segment.
    public class SegmentInfo
    {
        public SegmentInfo() { }

        public String Name { get; set; }
        public List<String> TimePeriodCodes { get; set; }
        public List<MeasuresForPeriod> PeriodicMeasures { get; set; }
    }

    // Represents the child segments.
    public class ChildSegmentsInfo
    {
        public ChildSegmentsInfo() { }

        public Uri NextPageUri { get; set; }
        public List<ChildSegment> ChildSegments { get; set; }
    }

    // Represents the securities.
    public class SecuritiesInfo
    {
        public SecuritiesInfo() { }

        public Uri NextPageUri { get; set; }
        public List<Security> Securities { get; set; }
    }

    // Represents a child (either a child segment or a security).
    public abstract class SegmentTreeNodeChildBase
    {
        public String Name { get; set; }
        public List<String> TimePeriodCodes { get; set; }
        public List<MeasuresForPeriod> PeriodicMeasures { get; set; }
    }

    // Represents an individual child segment.
    public class ChildSegment : SegmentTreeNodeChildBase
    {
        public ChildSegment() { }
    }

    // Represents an individual security.
    public class Security : SegmentTreeNodeChildBase
    {
        public Security() { }
    }

    // Repesents a list of measures in a certain time period.
    public class MeasuresForPeriod
    {
        public MeasuresForPeriod() {}

        public String TimePeriodCode { get; set; }
        public List<Measure> Measures { get; set; }
    }

    // Represents an individual measure in a <see cref="SegmentsTreeNode"/> resource.
    public class Measure
    {
        private Double? _value;
        private Int32? _iValue;
        private String _sValue;

        public Measure() { }

        public String Id { get; set; }
        public Char TypeIndicator { get; set; }

        public Double? Value
        {
            get { return (_value); }
            set { _value = value; TypeIndicator = 'r'; }
        }

        public Int32? IntegerValue
        {
            get { return (_iValue); }
            set { _iValue = value; TypeIndicator = 'i'; }
        }

        public String StringValue
        {
            get { return (_sValue); }
            set { _sValue = value; TypeIndicator = 's'; }
        }
    }
    #endregion
}
