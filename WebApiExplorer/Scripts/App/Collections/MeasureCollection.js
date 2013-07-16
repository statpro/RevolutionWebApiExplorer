/* global define: false */

define([
    "LibRefs/Backbone",
    "Models/MeasureModel"
],
function (Backbone, MeasureModel) {
    "use strict";

    // Collection of MeasureModel.
    var MeasureCollection = Backbone.Collection.extend({
        model: MeasureModel
    });

    return MeasureCollection;
});
