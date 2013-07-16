/* global define: false */

define([
    "LibRefs/Backbone",
    "Models/SegmentsTreeNodeModel"
],
function (Backbone, SegmentsTreeNodeModel) {
    "use strict";

    // Collection of SegmentsTreeNodeModel.
    var SegmentsTreeNodeCollection = Backbone.Collection.extend({
        model: SegmentsTreeNodeModel
    });

    return SegmentsTreeNodeCollection;
});
