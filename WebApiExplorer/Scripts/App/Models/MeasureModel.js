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
    }, {
        // Gets the full display name of a measure by replacing well-known text substitution parts in the specified
        // measure name with the specified currency (e.g. "USD") and statistics frequency (e.g. "Weekly").
        getMeasureDisplayName: function (name, currency, statsFrequency) {
            return name.replace("[CUR]", currency)
                       .replace("[SUBPERIOD]", statsFrequency)
                       .replace("[SUBPERIODS]", statsFrequency + " Returns");
        }
    });

    return MeasureModel;
});
