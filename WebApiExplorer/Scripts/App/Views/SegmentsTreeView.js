/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Views/SegmentsTreeQueryView",
    "Views/SegmentsTreeResultsView"
],
function (Backbone, $, webApiData, SegmentsTreeQueryView, SegmentsTreeResultsView) {
    "use strict";

    // Segments Tree view.
    var SegmentsTreeView = Backbone.View.extend({
        el: $("#segmentsTreeView"),
        model: null,                    // specify instance of AnalysisModel when creating
        segmentsTreeQueryView: null,    // our contained Segments Tree Query view
        segmentsTreeResultsView: null,  // our contained Segments Tree Results view
        tagName: "div",
        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "change", this._onModelChange);
            this.listenTo(webApiData.get("segmentsTreeResults"), "change", this._onResultsChange);

            this.segmentsTreeQueryView = new SegmentsTreeQueryView({
                model: this.model
            });
            this.segmentsTreeResultsView = new SegmentsTreeResultsView({
                model: webApiData.get("segmentsTreeResults"),
                analysisModel: this.model,
                allSegmentsTreeMeasures: webApiData.get("segmentsTreeMeasuresInfo")
            });
        },
        render: function () {
            var name = this.model.get("name"),
                status = this.model.get("status"),
                noResultsDiv = this.$("#segmentsTreeNoResults"),
                queryForm = this.$("#segmentsTreeQueryForm"),
                resultsDiv = this.$("#segmentsTreeResults"),
                portfolioLabel = $("#segmentsTreePortfolioLabel"),
                clickToViewMsg = "<p>Click to view the analysis of a portfolio in the portfolios grid.</p>",
                noResultsMsg = "<p>No results data is available for the current portfolio analysis.</p>";

            function showNoResultsMsg(msg) {
                noResultsDiv.show();
                noResultsDiv.html(msg);
                queryForm.hide();
                resultsDiv.hide();
            }

            // If user isn't logged on...
            if (webApiData.get("isUserLoggedOn") === false) {
                portfolioLabel.html("Portfolio:");
                showNoResultsMsg("");
                return this;
            }

            // If no data is loaded into our analysis model...
            if (!name) {
                portfolioLabel.html("Portfolio:");
                showNoResultsMsg(clickToViewMsg);
                return this;
            }

            // Display the portfolio name.
            portfolioLabel.html("Portfolio: " + this.model.escape("name"));

            // If the currently loaded portfolio analysis hasn't finished...
            if ((status !== "Finished") && (status !== "FinishedWithMessages")) {
                showNoResultsMsg(noResultsMsg);
                return this;
            }

            // The analysis has finished.  The user is able to query for segments tree data, starting at the
            // root node (= the "TOTAL" segment).
            noResultsDiv.html("");
            noResultsDiv.hide();
            resultsDiv.hide();
            queryForm.show();
            this.segmentsTreeQueryView.render();

            return this;
        },

        // Private.
        // Must be called when our AnalysisModel model changes (= a new portfolio analysis is loaded; the current
        // one is updated; the model is cleared).
        _onModelChange: function () {
            // Clear the Segments Tree results model.
            webApiData.get("segmentsTreeResults").clear();

            // Re-render this view.
            this.render();
        },

        // Private.
        // Must be called when the Segments Tree results object changes (or only when its "rootHref" attribute
        // changes).
        _onResultsChange: function () {
            var results = webApiData.get("segmentsTreeResults");

            // If results are now available, show our contained Segments Tree results view.
            if (results.get("rootHref")) {
                this.$("#segmentsTreeResults").show();
            }
        }
    });

    return SegmentsTreeView;
});
