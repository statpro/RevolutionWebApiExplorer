/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Instances/LocallyStoredData"
],
function (Backbone, _, $, webApiData, locallyStoredData) {
    "use strict";

    // Export Cultures Select view.
    // NOTA BENE: only use this view if the server has provided one or more export cultures.
    var ExportCulturesSelectView = Backbone.View.extend({
        el: null,                 // the view's select element, must be specified on construction
        tagName: "select",

        // Reminder: don't call this method if there are no export cultures.
        render: function () {
            var selectedCulture = null,
                selectedCultureName,
                userPreferredCultureName = webApiData.get("preferredLanguage"),
                exportCultures = webApiData.get("exportCultures"),
                savedCultureName = locallyStoredData.get("exportCultureName");

            // Have we saved the user's export culture choice?
            if (savedCultureName) {
                selectedCulture = exportCultures.getCulture(savedCultureName);
            }

            // If no saved choice (or if the saved choice is no longer available), pick a culture based
            // on the user's preferred language.  If no culture matches, the first available culture
            // will be picked.
            if (!selectedCulture) {
                selectedCulture = exportCultures.getCulture(userPreferredCultureName);
            }

            // Get the name of the selected culture (e.g. "EN-US").
            selectedCultureName = selectedCulture.get("name");

            // Set up the select element with the available cultures, and select the chosen one.
            this.$el.html(this._getCulturesSelectHtml(exportCultures));
            this.$el.val(selectedCultureName);

            // Save for next time.
            locallyStoredData.set("exportCultureName", selectedCultureName);

            // Save the culture name whenever the user selects a culture.
            this.$el.change(function () {
                locallyStoredData.set("exportCultureName", $(this).val());
            });

            return this;
        },

        // Gets the name of the currently selected culture.  In all likelihood the culture name will be in upper case
        // (e.g. "EN-US").
        getSelectedCultureName: function () {
            return this.$el.val();
        },

        // Private.
        // Gets the HTML for the cultures <select>.  'exportCultures' must specify an instance of CultureCollection.
        _getCulturesSelectHtml: function (exportCultures) {
            return exportCultures.reduce(function (memo, culture) {
                return memo +
                    "<option value='" + culture.get("name") + "'>" + culture.get("displayName") + "</option>";
            }, "");
        }
    });

    return ExportCulturesSelectView;
});
