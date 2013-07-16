/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Instances/RevWebApi",
    "Helpers/GetWebApiResource",
    "Helpers/Functions",
    "Views/ExportCulturesSelectView"
],
function (Backbone, _, $, webApiData, revWebApi, getWebApiResource, helperFns, ExportCulturesSelectView) {
    "use strict";

    // Time Series Results view.
    var TimeSeriesResultsView = Backbone.View.extend({
        el: $("#timeSeriesResults"),
        model: null,                       // specify instance of TimeSeriesResultsModel when creating
        exportCulturesSelectView: null,    // our contained Export Cultures Select view
        tagName: "div",
        resultsPropsTemplate: _.template($("#timeSeriesResultsPropertiesTableTemplate").html()),
        dataPointsTemplate: _.template($("#timeSeriesDataPointsTableTemplate").html()),
        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "change", this.render);
        },
        render: function () {
            var attrs, propsTable, pointsTable, periodic, exportHtml, exportCultures;

            // If the user isn't logged on...
            if (webApiData.get("isUserLoggedOn") === false) {
                this.$el.html("");
                return this;
            }

            // If no time series results have been loaded into our model...
            if (!this.model.get("segmentName")) {
                this.$el.html("");
                return this;
            }

            // Get our model's attributes.
            attrs = this.model.attributes;

            // Generate the HTML for the results properties table.
            propsTable = this.resultsPropsTemplate({
                segmentName: attrs.segmentName,
                classifierName: attrs.classifierName,
                seriesType: attrs.seriesType,
                startDate: attrs.startDate,
                endDate: attrs.endDate,
                dataPointsType: (attrs.dataPointsType === "periodic") ? "Periodic" : "Non-periodic"
            });

            // Generate the HTML for the data points table.
            periodic = (attrs.dataPointsType === "periodic") ? true : false;
            pointsTable = this.dataPointsTemplate({
                periodic: periodic,
                measureIds: attrs.measures,
                measureNames: this._getMeasureNames(attrs.measures),
                items: (attrs.datedItems !== null) ? attrs.datedItems : attrs.periodicItems,
                numColumns: attrs.measures.length + (periodic ? 2 : 1)
            });

            // Generate the HTML that contains controls for exporting the time series results as CSV.
            exportCultures = webApiData.get("exportCultures");
            if (exportCultures && exportCultures.length > 0) {
                exportHtml = "<form class='form-inline'>" +
                    "<button id='exportTimeSeriesCsvBtn' class='btn btn-primary' type='button'>Export as CSV</button> " +
                    "<label for='exportTimeSeriesCsvCultureSelect'>Export culture:</label> " +
                    "<select id='exportTimeSeriesCsvCultureSelect' name='exportCulture'></select>" +
                    "</form>";
            } else {
                exportHtml = "<p><button id='exportTimeSeriesCsvBtn' class='btn btn-primary' type='button'>Export as CSV</button>";
            }

            // Render out the two tables into our div, plus controls for exporting the time series results as CSV.
            this.$el.html(propsTable + exportHtml + pointsTable);

            // Wire up an event handler for when the "Export as CSV" button is clicked.
            this.$("#exportTimeSeriesCsvBtn").off("click").click($.proxy(this._exportAsCsv, this));

            // If the server has provided one or more export cultures, create and render the view that represents the
            // select element that allows the user to choose the export culture.
            if (exportCultures && exportCultures.length > 0) {
                this.exportCulturesSelectView = new ExportCulturesSelectView({
                    el: this.$("#exportTimeSeriesCsvCultureSelect")
                });
                this.exportCulturesSelectView.render();
            }

            // Enable the tooltips in the data points table.
            this.$('#timeSeriesDataPointsTable').tooltip({
                selector: "[data-toggle=tooltip]"
            });

            // Disable the tooltips' links.
            this.$("#timeSeriesDataPointsTable thead [href=#]").off("click").click(function (e) {
                e.preventDefault();
            });

            // After rendering, scroll down so that the user can view the results.
            setTimeout(function () {
                $('html, body').animate({
                    scrollTop: $("#timeSeriesResults").offset().top
                }, 500);
            }, 500);

            return this;
        },

        // Private
        // Returns an array of time series measure names, whose identifiers are specified in the 'measureIds' array.
        // (If a name cannot be found for a measure id, then the id is returned as the name.)
        _getMeasureNames: function (measureIds) {
            var measures = webApiData.timeSeriesMeasures,
                currency = this.model.get("currency"),
                names = [];

            _.each(measureIds, function (id) {
                var measure = _.find(measures, function (m) {
                    return m.id === id;
                });

                names.push(measure ? measure.name.replace("[CUR]", currency) : id);
            });

            return names;
        },

        // Private
        // Call this method when the user clicks on the button to export the current time series results as CSV.
        // 'this' must be set to this view.
        _exportAsCsv: function () {
            var exportUri = revWebApi.actionUris.exportTimeSeriesAsCsv,
                portfolioName = webApiData.get("analysis").get("name"),
                resultsTimestamp = webApiData.get("analysis").get("resultsTimestamp"),
                currency = this.model.get("currency"),
                classifier = this.model.get("classifierName"),
                culture;

            // If there's no classifier name (i.e. for the "TOTAL" segment) then pass up as "null".
            if (!classifier) {
                classifier = "null";
            }

            // Get the currently-selected export culture name.
            if (this.exportCulturesSelectView) {
                culture = this.exportCulturesSelectView.getSelectedCultureName();
            } else {
                culture = "EN-US";
            }

            // Tell the server to re-get the current time series results, but this time cache in session state.
            // When successful, issue a GET to the Export Time Series As CSV endpoint, specifying the returned
            // cached resource id.  The server will respond with a CSV file download (+ will remove the cached
            // resource from session state).
            //
            // NOTE: ASP.NET does not allow colons in the path of a URI, even encoded as %3A.  So we replace the
            // colons with spaces.
            //
            getWebApiResource(this.model.get("selfHref"), function (data) {
                var uri = exportUri.replace("{cachedResourceId}", encodeURIComponent(data.cachedResourceId));
                uri = uri.replace("{portfolioName}", encodeURIComponent(helperFns.base64EncodeString(portfolioName)));
                uri = uri.replace("{resultsTimestamp}", encodeURIComponent(resultsTimestamp.split(':').join(' ')));
                uri = uri.replace("{currency}", encodeURIComponent(currency));
                uri = uri.replace("{classifier}", encodeURIComponent(classifier));
                uri = uri.replace("{culture}", encodeURIComponent(culture));
                window.location.href = uri;
            },
            this,   // scope
            false,  // don't ignore error status (i.e. report errors to the user)
            true);  // cache resource in session state
        }

    });

    return TimeSeriesResultsView;
});
