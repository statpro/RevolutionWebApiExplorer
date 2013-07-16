/* global define: false */

define([
    "LibRefs/moment",
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Helpers/GetWebApiResource"
],
function (moment, Backbone, _, getWebApiResource) {
    "use strict";

    // Time Series Results model.  Contains time series results data for a particular segment in analysis results data.
    var TimeSeriesResultsModel = Backbone.Model.extend({
        defaults: function () {
            return {
                selfHref: "",               // URI of these time series results
                segmentName: "",            // name of the segment that the time series pertains to
                classifierName: "",         // name of the segment's classifier; null for the "Total" segment
                currency: "",               // currency code of the analysis, e.g. "USD"
                seriesType: "",             // "Raw" or "CumulativeIndexed"
                startDate: "",              // stored as a moment.js 'moment'
                endDate: "",                // ditto
                measures: [],               // array of measure identifiers, in requested order
                dataPointsType: "",         // "atDate" or "periodic"
                datedItems: null,           // array; each item has 'd' (date) and 'm' (measures array)
                periodicItems: null         // array; each tiem has 's' (start date), 'e' (end date) & 'm' (measures array)
                // - if dataPointsType === "atDate" then datedItems is populated, else periodicItems is populated
                // - date / start date / end date are stored as moment.js moments
            };
        },

        // Loads this time series model with time series results from the specified Web API URI.  The current
        // time series attributes are cleared from the model before the new data is loaded.
        // The URI will pertain to a particular segment (e.g. "Total").  The specified classifier name helps
        // to contextualize this segment (should be null/empty/undefined for the "Total" segment).  We don't
        // need the caller to tell us the name of the segment itself because the Web API will provide this.
        // The specified currency must contain the currency code of the analysis (e.g. "USD").
        load: function (timeSeriesQueryHref, classifierName, currency) {
            // Clear all current attributes; will fire a changed event.
            this.clear();

            if (!timeSeriesQueryHref) {
                return;
            }

            getWebApiResource(timeSeriesQueryHref, function (data) {
                var ts = data.jsObject.timeSeries,
                    points = ts.dataPoints,
                    items;

                // Set the attributes (without triggering a change event).
                this.set({
                    selfHref: ts.links.self.href,
                    segmentName: ts.segmentName,
                    classifierName: classifierName ? classifierName : null,
                    currency: currency,
                    seriesType: ts.seriesType,
                    startDate: moment.utc(ts.startDate, "YYYY-MM-DD"),
                    endDate: moment.utc(ts.endDate, "YYYY-MM-DD"),
                    measures: ts.measures,
                    dataPointsType: points.type,
                    datedItems: (points.type === "atDate") ? points.items : null,
                    periodicItems: (points.type !== "atDate") ? points.items : null
                },
                { silent: true });

                // Convert the dates to moments.
                items = this.get("datedItems");
                if (items !== null) {
                    _.each(items, function (item) {
                        item.d = moment.utc(item.d, "YYYY-MM-DD");
                    });
                }
                items = this.get("periodicItems");
                if (items !== null) {
                    _.each(items, function (item) {
                        item.s = moment.utc(item.s, "YYYY-MM-DD");
                        item.e = moment.utc(item.e, "YYYY-MM-DD");
                    });
                }

                // Finally trigger a change event for this model.
                this.trigger("change");
            },
            this);
        }
    });

    return TimeSeriesResultsModel;
});
