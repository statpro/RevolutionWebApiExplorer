/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Models/CultureModel"
],
function (Backbone, _, $, CultureModel) {
    "use strict";

    // Collection of CultureModel.
    var CultureCollection = Backbone.Collection.extend({
        model: CultureModel,

        // Loads the collection with data retrieved from the server via a POST to the specified URI, which is expected
        // to take no arguments and to return an array of class StatPro.Revolution.WebApiExplorer.JsDtos.Culture.
        // Invokes the specified callback function when the data is loaded.
        load: function (uri, callback) {
            var thisCollection = this;

            if (!uri) {
                return;
            }

            // Block the UI.
            $.blockUI();

            // Get the data from the server.
            $.post(uri,
                {
                    "__RequestVerificationToken": $("#aftForm input").val()  // include the anti-forgery token
                },
                function (data) {
                    var array;

                    // Unblock the UI.
                    $.unblockUI();

                    // Populate this collection from the provided array.  Note that we store the culture names
                    // in upper case (e.g. "EN-GB"), as required by the model.
                    array = _.map(data, function (item) {
                        return new CultureModel({ name: item.name.toUpperCase(), displayName: item.displayName });
                    });
                    thisCollection.reset(array);

                    // Invoke the specified callback function.
                    if (callback) {
                        callback();
                    }
                },
                "json").fail(function (jqXHR, textStatus, errorThrown) {
                    $.unblockUI();
                    alert("Failed to get cultures information from the web server.  " + errorThrown);
                });
        },

        // Gets a culture model whose name (e.g. "en-US") is specified by 'cultureName'.
        // Returns null if the collection has no models.
        // If the 'cultureName' is null/empty/undefined (or "en") then the collection is searched for the
        // "en-US" culture.
        // If there is no direct match (e.g. culture name is specified as "fr") then the first model whose
        // culture name starts with this string is returned.
        // If there is no match at all, the model at index 0 in the collection is returned.
        // Note that culture names are treated case-insensitively.
        // Note that the culture name as stored in the returned model will be in upper case (e.g. "EN-US").
        getCulture: function (cultureName) {
            var culture;

            if (this.length === 0) {
                return null;
            }

            if (!cultureName) {
                cultureName = "EN-US";
            } else {
                cultureName = cultureName.toUpperCase();
                if (cultureName === "EN") {
                    cultureName = "EN-US";
                }
            }

            culture = this.find(function (cm) {
                return cm.get("name") === cultureName;
            });

            if (!culture) {
                culture = this.find(function (cm) {
                    return cm.get("name").indexOf(cultureName) === 0;
                });

                if (!culture) {
                    culture = this.at(0);
                }
            }

            return culture;
        }
    });

    return CultureCollection;
});
