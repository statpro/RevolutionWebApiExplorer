/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore"
],
function (Backbone, _) {
    "use strict";

    // Segments Tree Node model.  This model represents a single node in the Segments Tree, and contains segment /
    // security analysis results.
    var SegmentsTreeNodeModel = Backbone.Model.extend({
        defaults: function () {
            return {
                selfHref: "",               // URI of this node
                treeLevel: 0,               // 1 = root level
                numLevelsInTree: 0,
                segmentCntr: null,          // object containing data about the segment
                childSegmentsCntr: null,    // object containing data about child segments (or null if not present)
                securitiesCntr: null        // object containing data about securities (or null if not present)
            };
        },

        // Loads the node with the specified data, which must be a JavaScript object that contains Segments Tree Node
        // data, as described here: http://developer.statpro.com/Revolution/WebApi/Resource/SegmentsTreeNode#reprJson
        // The currently loaded data is cleared from the model before the new data is loaded.
        //
        // If the specified Segments Tree Node object contains time series query links for child segments, then
        // this method will trigger the global "timeSeriesSegmentQueriesAvailable" custom event (via the 
        // 'Backbone.pubSub' object).  The event's single argument will be an array of objects, each containing:-
        //   name: <name of the child segment>
        //   classifier: <name of the child segment's classifier>
        //   href: <uri to use to query for time series results for the child segment>
        //
        load: function (jsObject) {
            var stn, links;

            this.clear();

            if (!jsObject) {
                return;
            }

            stn = jsObject.segmentsTreeNode,
            links = stn.links;

            this.set({
                selfHref: links.self.href,
                treeLevel: stn.treeLevel["this"],
                numLevelsInTree: stn.treeLevel.count,
                segmentCntr: stn.segment,
                childSegmentsCntr: stn.childSegments ? stn.childSegments : null,
                securitiesCntr: stn.securities ? stn.securities : null
            });

            // Signal the availability of new time series segment queries, if any.
            this._signalNewTimeSeriesSegmentQueries(jsObject);
        },

        // Returns this node's href (aka self href, aka URI).
        getHref: function () {
            return this.get("selfHref");
        },

        // Returns true if the node is the root node, else false.
        isRoot: function () {
            return this.get("treeLevel") === 1;
        },

        // Returns the name of the segment.
        getSegmentName: function () {
            return this.get("segmentCntr").name;
        },

        // Returns an array of time period codes that the segment lives in.  There will be at least one code.
        // Child segments / securities (if any) may live in the same time periods, or a reduced set (thanks to
        // child filtering).
        getSegmentTimePeriods: function () {
            return this.get("segmentCntr").timePeriods;
        },

        // Returns an array of the segment's measures, or null if there aren't any.
        // If non-null, the array will contain objects that contain the following properties:-
        //    tp       - time period code (e.g. "3M")
        //    measures - array of measure objects that contain the following properties:-
        //          id    - the measure's identifier, e.g. "Rp"
        //          ty    - the measure's type: "r" (real number), "i" (integer), "s" (string)
        //          val   - the measure's value (may be null)
        //
        getSegmentMeasures: function () {
            var measures = this.get("segmentCntr").measures;
            return measures ? measures : null;
        },

        // Returns true if the node has child segments data, else false.
        hasChildSegments: function () {
            return this.get("childSegmentsCntr") !== null;
        },

        // Returns true if the node has securities data, else false.
        hasSecurities: function () {
            return this.get("securitiesCntr") !== null;
        },

        // Returns "childsegments" if the node has child segments data, "securities" if it has securities data, 
        // else "".
        getChildrenType: function () {
            var cntr = this._getChildrenContainer();

            if (cntr === null) {
                return "";
            } else if (cntr.segments) {
                return "childsegments";
            } else {
                return "securities";
            }
        },

        // Returns an array of the children objects (or null if there aren't any).
        // Each object will contain the following properties:-
        //    name        - the child's name
        //    links       - object containing "self" and "timeSeriesQuery" properties (for child segments only)
        //    timePeriods - array of time period codes
        //    measures    - null, or array of objects each containing the following properties:-
        //           tp       - time period code (e.g. "3M")
        //           measures - array of measure objects that contain the following properties:-
        //                 id    - the measure's identifier, e.g. "Rp"
        //                 ty    - the measure's type: "r" (real number), "i" (integer), "s" (string)
        //                 val   - the measure's value (may be null)
        getChildrenObjects: function () {
            var cntr = this._getChildrenContainer();

            if (cntr === null) {
                return null;
            } else if (cntr.segments) {
                return cntr.segments;
            } else {
                return cntr.securities;
            }
        },

        // Returns the URI of the next page of children (child segments or securities), or null if there is no
        // next page (e.g. because this node has no children, or because this node represents the last or only page
        // of children).
        getChildrenNextPageHref: function () {
            var children = this._getChildrenContainer();

            if (children && children.paging && children.paging.next) {
                return children.paging.next.href;
            } else {
                return null;
            }
        },

        // Returns the name of the child segments' classifier (or the empty string if the node doesn't contain
        // child segments).
        getChildSegmentsClassifier: function () {
            var cntr = this._getChildrenContainer();
            return (cntr && cntr.segments) ? cntr.classifier.name : "";
        },

        // Returns an array of codes of all the time periods that exist in the node.
        getAllTimePeriods: function () {
            // The segment lives in all requested time periods, by definition.  The number of time periods it lives
            // in is the maximum number of time periods that there can be in a node (children can live in the same
            // number, or fewer).
            return this.getSegmentTimePeriods();
        },

        // Returns an array of identifiers of all the measures that exist in the node for any one segment or
        // security (depends on what measures were requested, whether measures were requested for segment / 
        // child segments / securities, what data was requested to be included in the node, etc.)
        getAllMeasureIds: function () {
            var childWithMeasures,
                segmentMeasures = this.getSegmentMeasures() || [],
                children = this.getChildrenObjects() || [];

            // Start with no meaures.

            // If we have measures for the segment, then these are all the measures that can be in the node.
            if (segmentMeasures.length > 0) {
                return _.pluck(segmentMeasures[0].measures, "id");
            }

            // Else search the children for the first one with measures.  If found, it will contain all the measures
            // that can be in the node.
            childWithMeasures = _.find(children, function (child) {
                return child.measures;
            });
            if (childWithMeasures) {
                return _.pluck(childWithMeasures.measures[0].measures, "id");
            }

            // No measures in the mode.
            return [];
        },

        // Adds the children (child segments or securities) that exist in the specified node (which must be an
        // instance of SegmentsTreeNodeModel) to this node.  Does nothing if the specified node doesn't exist,
        // has no children, has no child paging information, has child segments but this node has securities, etc.
        // For correct operation, ensure that this node starts off with page 1, and that calls to this method
        // specify pages 2, 3, 4... of what is essentially the same Segments Tree Node.  This method must only be
        // used to aggregate all of a node's children into one object, and must not be used to randomly add children
        // from one distinct node to another.
        addChildrenFromNode: function (node) {
            var sourceChildren, targetChildren, sourceType, targetType, sourceArray, targetArray;

            if (!node) {
                return;
            }

            // Get info about the source and target nodes.
            sourceChildren = node._getChildrenContainer();
            targetChildren = this._getChildrenContainer();
            sourceType = node.getChildrenType();
            targetType = this.getChildrenType();

            // Go no further if it's not appropriate to add children from the source to the target.
            if (sourceChildren === null || targetChildren === null || !sourceChildren.paging ||
                !targetChildren.paging || sourceType !== targetType) {
                return;
            }

            // Copy children from source to target.
            if (sourceType === "childsegments") {
                sourceArray = sourceChildren.segments;
                targetArray = targetChildren.segments;
            } else {
                sourceArray = sourceChildren.securities;
                targetArray = targetChildren.securities;
            }
            _.each(sourceArray, function (obj) { targetArray.push(obj); });
        },

        // Removes paging information from this node (if any).  Can be called after calling 'addChildrenFromNode'
        // to ensure that this node is a completely self-contained node wrt its children.  I.e. if this node contains
        // all available children (possibly retrieved by multiple calls to the Web API), then it doesn't need, and
        // should't have, any paging information.
        removePagingInfo: function () {
            var children = this._getChildrenContainer();
            if (children && children.paging) {
                delete children.paging;
            }
        },

        // Private
        // Returns the child segments' container object (if present) or the securities' container object (if present)
        // or null (if neither are present).
        _getChildrenContainer: function () {
            var childSegments = this.get("childSegmentsCntr"),
                securities = this.get("securitiesCntr");

            if (childSegments) {
                return childSegments;
            } else if (securities) {
                return securities;
            } else {
                return null;
            }
        },

        // Private
        // Triggers the "timeSeriesSegmentQueriesAvailable" event if the specified specified Segments Tree Node object
        // contains time series query links for child segments.  For more details, see the description of the
        // 'load' method.
        _signalNewTimeSeriesSegmentQueries: function (jsObject) {
            var classifier,
                queries = [],
                childSegmentsCntr = jsObject.segmentsTreeNode.childSegments;

            if (!childSegmentsCntr) {
                return;
            }

            classifier = childSegmentsCntr.classifier.name;

            _.each(childSegmentsCntr.segments, function (childSegment) {
                queries.push({
                    name: childSegment.name,
                    classifier: classifier,
                    href: childSegment.links.timeSeriesQuery.href
                });
            });

            if (queries.length > 0) {
                Backbone.pubSub.trigger("timeSeriesSegmentQueriesAvailable", queries);
            }
        }
    });

    return SegmentsTreeNodeModel;
});
