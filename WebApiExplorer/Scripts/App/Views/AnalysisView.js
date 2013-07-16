/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData"
],
function (Backbone, _, $, webApiData) {
    "use strict";

    // Analysis (aka Portfolio Analysis) view.
    var AnalysisView = Backbone.View.extend({
        // specify instance of TabsView when creating, as the 'tabsView' option (accessed thru this.options.tabsView)
        el: $("#analysisView"),
        model: null,              // specify instance of AnalysisModel when creating
        tagName: "div",
        statusPropsTemplate: _.template($("#analysisStatusPropertiesTableTemplate").html()),
        portfolioPropsTemplate: _.template($("#analysisPortfolioPropertiesTableTemplate").html()),
        analysisPropsTemplate: _.template($("#analysisAnalysisPropertiesTableTemplate").html()),
        timePeriodsTemplate: _.template($("#analysisResultsTimePeriodsTableTemplate").html()),
        getLastSuccessfulTemplate: _.template($("#getLastSuccessfulAnalysisTemplate").html()),
        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "change", this.render);
        },
        render: function () {
            var attrs, statusTable, portfolioTable, analysisTable, timePeriodsTable,
                portfolioLabel = $("#analysisPortfolioLabel"),
                clickToViewMsg = "<p>Click to view the analysis of a portfolio in the portfolios grid.</p>",
                getLastSuccessfulMarkup = "";

            // If user isn't logged on...
            if (webApiData.get("isUserLoggedOn") === false) {
                portfolioLabel.html("Portfolio:");
                this.$el.html("");
                return this;
            }

            // If no data is loaded into our analysis model...
            if (!this.model.get("name")) {
                portfolioLabel.html("Portfolio:");
                this.$el.html(clickToViewMsg);
                return this;
            }

            // Display the portfolio name.
            portfolioLabel.html("Portfolio: " + this.model.escape("name"));

            // Get our analysis model's attributes.
            attrs = this.model.attributes;

            // Generate the HTML for the Status Properties table.
            statusTable = this.statusPropsTemplate({
                status: attrs.status,
                resultsTimeStamp: attrs.resultsMoment ? attrs.resultsMoment.toString() : "",
                errors: attrs.errors,
                messages: attrs.messages
            });

            // Generate the HTML for the Portfolio Properties table.
            portfolioTable = this.portfolioPropsTemplate({
                name: attrs.name,
                id: attrs.id,
                code: attrs.code,
                owner: attrs.owner,
                portfolioType: attrs.portfolioType,
                investmentType: attrs.investmentType
            });

            // Generate the HTML for the Analysis Properties table.
            analysisTable = this.analysisPropsTemplate({
                isDefault: attrs.isDefault,
                version: attrs.version,
                currency: attrs.currency,
                statsFrequency: attrs.statsFrequency,
                riskHorizon: attrs.riskHorizon,
                riskPercentile: attrs.riskPercentile,
                benchmarks: attrs.benchmarks,
                riskFreeRateName: attrs.riskFreeRateName,
                classifier1Name: attrs.classifier1Name,
                classifier2Name: attrs.classifier2Name,
                classifier3Name: attrs.classifier3Name,
                fixedIncomeClassifier2Name: attrs.fixedIncomeClassifier2Name,
                fixedIncomeClassifier3Name: attrs.fixedIncomeClassifier3Name
            });

            // If the analysis has finished (i.e. there are results)...
            timePeriodsTable = "";
            if ((attrs.status === "Finished") || (attrs.status === "FinishedWithMessages")) {
                // Generate the HTML for the Portfolio Analysis - Results' Time Periods table.
                timePeriodsTable = this.timePeriodsTemplate({
                    timePeriods: attrs.timePeriods
                });
            }

            // If the analysis hasn't finished and we didn't ask for the last successful analysis, allow the
            // user to query for the last successful analysis (if available).
            if ((attrs.status !== "Finished") && (attrs.status !== "FinishedWithMessages") &&
                (!this.model.queriedForLastSuccessful())) {
                getLastSuccessfulMarkup = this.getLastSuccessfulTemplate({});
            }

            // Render out the view, with the tables in this order: status, time periods, analysis, portfolio.
            this.$el.html(statusTable + getLastSuccessfulMarkup + timePeriodsTable + analysisTable + portfolioTable);

            // Wire up an event handler for when the "Get Last Successful" button is clicked (if rendered).
            if (getLastSuccessfulMarkup) {
                this.$("#getLastSuccessfulAnalysisBtn").off("click").click($.proxy(this._getLastSuccessful, this));
            }

            // Ensure that the portfolio analysis is visible.
            this.options.tabsView.goToTab("analysis", 200);

            return this;
        },

        // Private
        // Call this method when the user clicks on the button to get the last successful analysis.
        // 'this' must be set to this view.
        _getLastSuccessful: function () {
            this.model.load(this.model.get("selfHref").replace("lastSuccessful=false", "lastSuccessful=true"));
        }
    });

    return AnalysisView;
});
