/* global define: false */

define([
    "LibRefs/moment",
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Helpers/GetWebApiResource"
],
function (moment, Backbone, _, getWebApiResource) {
    "use strict";

    // Analysis (aka Portfolio Analysis) model.
    var AnalysisModel = Backbone.Model.extend({
        defaults: function () {
            return {
                selfHref: "",
                name: "",
                id: "",
                code: "",
                owner: "",
                portfolioType: "",
                investmentType: "",
                isDefault: true,
                version: "",
                currency: "",
                statsFrequency: "",
                riskHorizon: 1,
                riskPercentile: 0.9,
                benchmarks: [],            // each has 'name' and 'type'
                riskFreeRateName: null,
                classifier1Name: null,
                classifier2Name: null,
                classifier3Name: null,
                fixedIncomeClassifier2Name: null,
                fixedIncomeClassifier3Name: null,
                status: "",
                resultsId: "",             // unique id for these results
                resultsTimestamp: "",      // results timestamp from the Web API (in RFC 3339 format; zero offset from UTC)
                resultsMoment: null,       // results timestamp as a moment.js 'moment'
                errors: [],                // array of strings
                messages: [],              // array of strings
                timePeriods: [],           // each has 'code', 'name', 'startDate', 'endDate' (dates are stored as moments)
                segmentsTreeRootNodeQueryHref: null,
                timeSeriesQueryHref: null, // this link is specifically for getting time series for the "Total" segment

                // Array of queries for time series data for different segments (one entry per segment).
                // Each object in this array must contain:-
                //   name: <name of the segment>
                //   classifier: <name of the segment's classifier, or null for the "Total" segment>
                //   href: <uri to use to query for time series results for this segment>
                //
                // When a finished analysis is first loaded, we know only about the query for the "Total" segment,
                // and this information is added to the array by the 'load' method.  When Segments Tree nodes are
                // loaded one by one for this analysis, time series queries for more segments are revealed.  In this
                // case method 'addTimeSeriesQueryForSegment' should be called to add this data to this AnalysisModel
                // instance.
                //
                timeSeriesSegmentQueries: []
            };
        },

        // Loads this analysis model with the default analysis data from the specified Web API URI.  The current
        // analysis attributes are cleared from the model before the new data is loaded.
        load: function (defaultAnalysisHref) {
            // Clear all current attributes; will fire a changed event.
            this.clear();

            if (!defaultAnalysisHref) {
                return;
            }

            getWebApiResource(defaultAnalysisHref, function (data) {
                var timePeriods,
                    p = data.jsObject.portfolioAnalysis,
                    l = p.links,
                    a = p.analysis,
                    c = a.classifiers;

                // Set the attributes (without triggering a change event).  The results attributes are reset.
                this.set({
                    selfHref: l.self.href,
                    name: p.name,
                    id: p.id,
                    code: p.code,
                    owner: p.owner,
                    portfolioType: p.portfolioType,
                    investmentType: p.investmentType,
                    isDefault: a.isDefault,
                    version: a.version,
                    currency: a.currency,
                    statsFrequency: a.statisticsFrequency,
                    riskHorizon: a.risk.horizon,
                    riskPercentile: a.risk.percentile,
                    benchmarks: a.benchmarks,
                    riskFreeRateName: a.riskFreeRate ? a.riskFreeRate.name : null,
                    classifier1Name: c.classifier1 ? c.classifier1.name : null,
                    classifier2Name: c.classifier2 ? c.classifier2.name : null,
                    classifier3Name: c.classifier3 ? c.classifier3.name : null,
                    fixedIncomeClassifier2Name: c.fixedIncomeClassifier2Name ? c.fixedIncomeClassifier2Name.name : null,
                    fixedIncomeClassifier3Name: c.fixedIncomeClassifier3Name ? c.fixedIncomeClassifier3Name.name : null,
                    status: a.status,
                    errors: (a.status === "FailedWithErrors") ? a.errors : [],
                    messages: (a.status === "FinishedWithMessages") ? a.messages : [],
                    timePeriods: [],
                    segmentsTreeRootNodeQueryHref: null,
                    timeSeriesQueryHref: null
                },
                { silent: true });

                // If the analysis has finished, set the results attributes (again, silently).
                if ((a.status === "Finished") || (a.status === "FinishedWithMessages")) {
                    this.set({
                        resultsId: a.results.timeStamp,  // timestamp from Web API doubles as unique id for the results
                        resultsTimestamp: a.results.timeStamp,
                        resultsMoment: moment.utc(a.results.timeStamp, "YYYY-MM-DDTHH:mm:ssZ"),
                        timePeriods: a.results.timePeriods,
                        segmentsTreeRootNodeQueryHref: a.results.links.segmentsTreeRootNodeQuery.href,
                        timeSeriesQueryHref: a.results.links.timeSeriesQuery.href,
                        timeSeriesSegmentQueries: []
                    },
                    { silent: true });

                    // Convert the start and end dates of each time period to moments.
                    timePeriods = this.get("timePeriods");
                    _.each(timePeriods, function (tp) {
                        tp.startDate = moment.utc(tp.startDate, "YYYY-MM-DD");
                        tp.endDate = moment.utc(tp.endDate, "YYYY-MM-DD");
                    });

                    // We know how to get time series results data for the "Total" segment only, at this point.
                    this.addTimeSeriesQueryForSegment(a.results.links.timeSeriesQuery.href, "Total", null, true);
                }

                // Finally trigger a change event for this model.
                this.trigger("change");
            },
            this);
        },

        // Adds the href (= URI) of the time series query for the specified segment to our time series segment queries
        // array.  For all but the "Total" segment, the name of the (child) segment's classifier must also be
        // specified.  After adding, triggers the "change" event for this attribute, unless 'silent' is true.
        // Does nothing if the href already exists in the array.
        addTimeSeriesQueryForSegment: function (timeSeriesQueryHref, segmentName, classifierName, silent) {
            var status = this.get("status"),
                queries = this.get("timeSeriesSegmentQueries");

            // Only makes sense if the analysis has finished.
            if ((status !== "Finished") && (status !== "FinishedWithMessages")) {
                return;
            }

            // Return if we already know about this one.
            if (_.find(queries, function (query) { return query.href === timeSeriesQueryHref; })) {
                return;
            }

            // Add this new one.
            queries.push({
                href: timeSeriesQueryHref,
                name: segmentName,
                classifier: !classifierName ? "" : classifierName
            });

            // Unless disabled, trigger a change event for this attribute.
            if (!silent) {
                this.trigger("change:timeSeriesSegmentQueries");
            }
        },

        // Returns true if the currently loaded analysis data was loaded via a query for the Last Successful version
        // (as opposed to the Latest version).  Returns false in all other cases.
        queriedForLastSuccessful: function () {
            return (this.get("selfHref").indexOf("lastSuccessful=true") !== -1);
        },

        // Returns the name of the specified time period that exists in the finished analysis.
        // 'code' - the code of the time period (e.g. "1Y").  Lookup of time periods by code is done case-sensitively.
        // Returns the empty string if the specified time period doesn't exist in the analysis.
        getTimePeriodName: function (code) {
            var timePeriod,
                timePeriods = this.get("timePeriods");

            if (!code || !timePeriods) {
                return "";
            }

            timePeriod = _.find(timePeriods, function (tp) { return tp.code === code; });
            return timePeriod ? timePeriod.name : "";
        }
    });

    return AnalysisModel;
});
