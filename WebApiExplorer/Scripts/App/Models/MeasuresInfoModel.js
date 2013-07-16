/* global define: false, alert: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Models/MeasureModel",
    "Collections/MeasureCollection"
],
function (Backbone, _, $, MeasureModel, MeasureCollection) {
    "use strict";

    // Measures Info model.  Represents a collection of requestable measures (e.g. for the Segments Tree) and
    // their categories, which are provided by the web server.
    var MeasuresInfoModel = Backbone.Model.extend({
        defaults: function () {
            return {
                uri: null,              // URI that supplied the measures info
                categories: [],         // array of names of the categories into which the measures fall
                measures: null          // instance of MeasureCollection
            };
        },

        // Loads the model with data retrieved from the server via a POST to the specified URI, which is expected
        // to take no arguments and to return an instance of class StatPro.Revolution.WebApiExplorer.JsDtos.Measures.
        // Invokes the specified callback function when the data is loaded (invokes immediately if the data is
        // already loaded).
        load: function (uri, callback) {
            var thisModel = this;

            if (!uri) {
                return;
            }

            // Already loaded from the specified URI?
            if (this.get("uri") === uri) {
                if (callback) {
                    callback();
                    return;
                }
            }

            // Block the UI.
            $.blockUI();

            // Get the data from the server.
            $.post(uri,
                {
                    "__RequestVerificationToken": $("#aftForm input").val()  // include the anti-forgery token
                },
                function (data) {
                    var measuresArray, measures;

                    // Unblock the UI.
                    $.unblockUI();

                    // Update this model with the loaded data.
                    thisModel.set("categories", data.categories);

                    // Build up an array of measure models.
                    measuresArray = _.map(data.measures, function (measure) {
                        return new MeasureModel({
                            id: measure.id,
                            name: measure.name,
                            category: measure.category,
                            type: measure.type
                        });
                    });

                    // Add a new collection of measures to this model based on the array, or replace the contents
                    // of the current collection.
                    measures = thisModel.get("measures");
                    if (measures === null) {
                        thisModel.set("measures", new MeasureCollection(measuresArray));
                    } else {
                        measures.reset(measuresArray);
                    }

                    // When all loaded, record the URI that supplied the data.
                    thisModel.set("uri", uri);

                    // Invoke the specified callback function.
                    if (callback) {
                        callback();
                        return;
                    }
                },
                "json").fail(function (jqXHR, textStatus, errorThrown) {
                    $.unblockUI();
                    alert("Failed to get measures information from the web server.  " + errorThrown);
                });
        },

        // Returns the name of the specified measure.
        // 'id' - the identifier of the measure (e.g. "Rp").  Lookup of measures by id is done case-sensitively.
        // Returns the empty string if the specified measure doesn't exist, or if this model hasn't been loaded
        // with data.
        getMeasureName: function (id) {
            var measure,
                measures = this.get("measures");

            if (!id || !measures) {
                return "";
            }

            measure = measures.find(function (m) { return m.get("id") === id; });
            return measure ? measure.get("name") : "";
        }
    });

    return MeasuresInfoModel;
});
