/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore"
],
function (Backbone, _) {
    "use strict";

    // Measure Layout model.
    var MeasureLayoutModel = Backbone.Model.extend({
        defaults: function () {
            return {
                // name is used as the layout identifier and should be treated case-insensitively
                name: "",

                // the Default layout should not be deletable
                canDelete: true,

                // hash of measure ids; a measure is in the layout if a) its id exists in the hash, and
                // b) true is stored as its value
                measureIds: {},

                // an indirect change to the measure ids hash (i.e. without setting the 'measureIds' attribute)
                // must be accompanied by a set of this attribute to true
                measuresChanged: false
            };
        },

        // Returns the number of measures in the layout.
        getMeasuresCount: function () {
            return _.reduce(this.get("measureIds"), function (memo, value) {
                return memo + ((value === true) ? 1 : 0);
            }, 0);
        },

        // Removes all measures that are currently in the layout.
        removeAllMeasures: function () {
            this.set("measureIds", {});
        },

        // Returns an array of identifiers of those measures that exist in the layout.
        // The identifiers won't be ordered.
        getMeasureIds: function () {
            var ids = [];

            _.each(this.get("measureIds"), function (value, key) {
                if (value === true) {
                    ids.push(key);
                }
            });

            return ids;
        },

        // Returns the identifiers of those measures that exist in the layout as a comma-separated values in a string;
        // e.g. "Rp,Rb,RelR,".
        getMeasureIdsAsCsv: function () {
            return _.reduce(this.get("measureIds"), function (memo, value, key) {
                return memo + ((value === true) ? (key + ",") : "");
            }, "");
        },

        // Adds those measures whose identifiers are in the specified CSV string, which should have been returned by
        // a previous call to the 'getMeasureIdsAsCsv' method (for either this, or another, measure layout).
        // 'allMeasures' must specify a hash containing all of the measures that could be contained in the layout;
        // for each measure, its id must be the key, and the value stored against that key must be true.  E.g.
        //     allMeasures["Rp"] = true;
        // This hash is used to cross-check the validity of the comma-delimited identifiers in the CSV string.
        // Note that this method only adds measures to the layout; existing measures aren't removed.  Returns the
        // number of measures that were added to the layout (i.e. measures that didn't previously exist in the
        // layout, but now do).
        addMeasureIdsFromCsv: function (csv, allMeasures) {
            var measureIds, measuresInLayout,
                numAdded = 0;

            if (!csv || !allMeasures) {
                return 0;
            }

            measureIds = csv.split(",");
            measuresInLayout = this.get("measureIds");
            _.each(measureIds, function (mid) {
                if (mid && (allMeasures[mid] === true)) {
                    if (measuresInLayout[mid] !== true) {  // may not exist, or value may be false
                        measuresInLayout[mid] = true;
                        numAdded = numAdded + 1;
                    }
                }
            });

            if (numAdded > 0) {
                this.set("measuresChanged", true);
            }

            return numAdded;
        }
    }, {
        // Gets the maximum length of measure layout names.
        getMaxLengthName: function () {
            return 30;
        },

        // Validates the specified layout name.  Returns false if the name is null, empty, too long, or contains
        // disallowed characters (i.e. anything other than alphanumeric, space, hyphen, underscore).  Otherwise
        // returns true.
        validateName: function (name) {
            var re;

            if (!name || name.length > MeasureLayoutModel.getMaxLengthName()) {
                return false;
            }

            re = new RegExp("^[-\\w\\s]*$");
            return re.test(name);
        }
    });

    return MeasureLayoutModel;
});
