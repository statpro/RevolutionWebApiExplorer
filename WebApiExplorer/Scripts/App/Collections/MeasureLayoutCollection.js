/* global define: false */

define([
    "LibRefs/Backbone",
    "Models/MeasureLayoutModel"
],
function (Backbone, MeasureLayoutModel) {
    "use strict";

    // Collection of MeasureLayoutModel.
    var MeasureLayoutCollection = Backbone.Collection.extend({
        model: MeasureLayoutModel,

        // Gets a layout in the collection by name; returns null or undefined if there is no such layout.
        // Note that layout names are treated case-insensitively.
        getLayout: function (name) {
            if (!name) {
                return null;
            }

            name = name.toUpperCase();
            return this.find(function (layout) {
                return (layout.get("name").toUpperCase() === name);
            });
        }
    }, {
        // Gets the maximum number of layouts that that any one user can have.
        getMaxNumLayouts: function () {
            return 8;
        }
    });

    return MeasureLayoutCollection;
});
