/* global define: false */

define([
    "LibRefs/Backbone"
],
function (Backbone) {
    "use strict";

    // Measure model.
    var MeasureModel = Backbone.Model.extend({
        // attributes:-
        //   id
        //   name
        //   category
        //   type
        //   compoundable      -- for Time Series resource only
    }, {
        // Gets the full display name of a measure by replacing well-known text substitution parts in the specified
        // measure name with the specified currency (e.g. "USD") and statistics frequency (e.g. "Weekly").
        // Note that currency must be specified, but statistics frequency is optional (omit it for time series
        // measures).
        getMeasureDisplayName: function (name, currency, statsFrequency) {
            if (statsFrequency) {
                return name.replace("[CUR]", currency)
                           .replace("[SUBPERIOD]", statsFrequency)
                           .replace("[SUBPERIODS]", statsFrequency + " Returns");
            } else {
                return name.replace("[CUR]", currency);
            }
        }
    });

    return MeasureModel;
});
