/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Views/TimeSeriesQueryView",
    "Views/TimeSeriesResultsView"
],
function (Backbone, $, webApiData, TimeSeriesQueryView, TimeSeriesResultsView) {
    "use strict";

    // Time Series view.
    var TimeSeriesView = Backbone.View.extend({
        el: $("#timeSeriesView"),
        model: null,                   // specify instance of AnalysisModel when creating
        timeSeriesQueryView: null,     // our contained Time Series Query view
        timeSeriesResultsView: null,   // our contained Time Series Results view
        tagName: "div",
        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "change", this._onModelChange);
            this.listenTo(webApiData.get("timeSeriesResults"), "change", this._onResultsChange);

            this.timeSeriesQueryView = new TimeSeriesQueryView({
                model: this.model
            });
            this.timeSeriesResultsView = new TimeSeriesResultsView({
                model: webApiData.get("timeSeriesResults"),
                allTimeSeriesMeasures: webApiData.get("timeSeriesMeasuresInfo")
            });
        },
        render: function () {
            var name = this.model.get("name"),
                status = this.model.get("status"),
                noResultsDiv = this.$("#timeSeriesNoResults"),
                queryForm = this.$("#timeSeriesQueryForm"),
                resultsDiv = this.$("#timeSeriesResults"),
                portfolioLabel = $("#timeSeriesPortfolioLabel"),
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

            // The analysis has finished.  The user is able to query for time series data for the "Total" segment,
            // at the very least.
            noResultsDiv.html("");
            noResultsDiv.hide();
            resultsDiv.hide();
            queryForm.show();
            this.timeSeriesQueryView.render();

            return this;
        },

        // Private.
        // Must be called when our AnalysisModel model changes (= a new portfolio analysis is loaded; the current
        // one is updated; the model is cleared).
        _onModelChange: function () {
            // Clear the Time Series results model.
            webApiData.get("timeSeriesResults").clear();

            // Re-render this view.
            this.render();
        },

        // Private.
        // Must be called when the Time Series results object changes (or only when its "selfHref" attribute
        // changes).
        _onResultsChange: function () {
            var results = webApiData.get("timeSeriesResults");

            // If results are now available, show our contained Time Series results view.
            if (results.get("selfHref")) {
                this.$("#timeSeriesResults").show();
            }
        }
    });

    return TimeSeriesView;
});
