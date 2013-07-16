/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Helpers/Functions"
],
function (Backbone, _, helperFns) {
    "use strict";

    // Web API Data model.  Contains general Web API information about the user, the currrently loaded portfolios,
    // the currently loaded portfolio analysis, etc.  Also contains helper functions for working with Web API data.
    var WebApiDataModel = Backbone.Model.extend({
        defaults: function () {
            return {
                // User-specific attributes.
                isUserLoggedOn: false,
                userDisplayName: "",
                preferredLanguage: "",
                numPortfolios: 0,
                portfoliosQueryHref: null,
                portfoliosInfo: null,               // instance of PortfoliosInfoModel
                analysis: null,                     // instance of AnalysisModel
                segmentsTreeResults: null,          // instance of SegmentsTreeResultsModel
                timeSeriesResults: null,            // instance of TimeSeriesResultsModel

                // Non user-specific attributes.
                segmentsTreeMeasuresInfo: null,     // instance of MeasuresInfoModel
                exportCultures: null                // instance of CultureCollection
            };
        },

        initialize: function () {
            // When the global "timeSeriesSegmentQueriesAvailable" custom event is triggered...
            Backbone.pubSub.on("timeSeriesSegmentQueriesAvailable", this._onTimeSeriesSegmentQueriesAvailable, this);
        },

        // Time Series measures.  Only Rp, Rb and RelR are supported for the CumulativeIndexed series type.
        // When accessing this array, be sure not to modify it.
        // TODO: we can get this data from the server, since the strings are built into a .resx file
        timeSeriesMeasures: [
            { id: "Rp", name: "Return ([CUR])" },
            { id: "RelR", name: "Relative Return ([CUR])" },
            { id: "Wp", name: "Weight Mean" },
            { id: "WOver", name: "Excess Weight Mean" },
            { id: "Rb", name: "Benchmark Return ([CUR])" },
            { id: "Wb", name: "Benchmark Weight Mean" }
        ],

        // Call this method instead of setting attribute "isUserLoggedOn" to false when it has been detected
        // that the user has been logged off.
        onUserLoggedOff: function () {
            this.set("userDisplayName", "");
            this.set("numPortfolios", 0);
            this.set("portfoliosQueryHref", null);
            this.set("portfoliosInfo", null);
            this.set("analysis", null);
            this.set("segmentsTreeResults", null);
            this.set("timeSeriesResults", null);
            this.set("isUserLoggedOn", false); // set this last, since this is what all the views are listening for
        },

        // Returns the fully-formed Web API URI that queries for portfolios, using the specified filtering, ordering
        // and slicing values.
        // E.g.
        //   filter = startswith(Name, 'FT')
        //   orderBy = Name asc
        //   skip = 0
        //   top = 10
        // All of the arguments can be undefined/null/empty in order to use default values.
        // If specified, all of the arguments must be valid - but they should not be URI encoded as the method will
        // perform this step.
        // See the Web API's documentation for the portfolios-query link relation for more details.
        getPortfoliosQueryUri: function (filter, orderBy, skip, top) {
            var portfoliosQueryHref = this.get("portfoliosQueryHref");

            if (!portfoliosQueryHref) {
                return null;
            }

            // Normalize undefined/null/empty args to use the defaults that the Web API itself will use (this is
            // important for when comparing URIs returned by this function with URIs supplied by the Web API for
            // equality).
            if (!filter) { filter = ""; }
            if (!orderBy) { orderBy = ""; }
            if (!skip) { skip = "0"; }
            if (!top) { top = "0"; }

            // Return the fully formed URI, with the text replacement parts replaced with the specified args (URI
            // encoded).
            return portfoliosQueryHref.replace("{filter}", encodeURIComponent(filter))
                                      .replace("{orderby}", encodeURIComponent(orderBy))
                                      .replace("{skip}", encodeURIComponent(skip))
                                      .replace("{top}", encodeURIComponent(top));
        },

        // Returns the fully-formed Web API URI that queries for a node (typically the root node) in the
        // Segments Tree, using the specified query link, time periods, data-to-include indicator, measures,
        // include-measures-for indicator, plus the specified values for filtering, ordering and slicing the included
        // children (child segments and/or securities).
        //   segmentsTreeQueryHref - must be valid; will have been returned by the Web API in a representation of
        //                           a Portfolio Analysis or Segments Tree Node resource
        //   timePeriods - array of time period codes (e.g. "1Y", "YTD"); can be null/emtpy/undefined.  Only include
        //                 codes for those time periods that are known to exist in the analysis's results.
        //   include     - "childSegments" or "securities" or "none"; if null/empty/undefined then the empty string
        //                 will be specified in order to get the Web API's default.
        //   measures    - array of measure identifiers (e.g. "Rp", "Rb"); can be null/empty/undefined.
        //   measuresFor - array containing zero or more identifiers of those parts of the Segments Tree Node
        //                 representation(s) for which measures are required.  The identifiers are "segment",
        //                 "childSegments" and "securities".
        //   filter      - says how to filter, order and slice included children (child segments or securities)
        //   orderBy
        //   skip
        //   top
        //
        // See the Web API's documentation for the segments-tree-root-node-query link relation for more details.
        getSegmentTreeNodeQueryUri: function (segmentsTreeQueryHref, timePeriods, include, measures,
            measuresFor, filter, orderBy, skip, top) {
            var timePeriodsList, measuresList, measuresForList;

            if (!segmentsTreeQueryHref) {
                return null;
            }

            // Normalize the args.
            if (!timePeriods || !_.isArray(timePeriods)) { timePeriods = []; }
            if (!include) { include = ""; }
            if (!measures || !_.isArray(measures)) { measures = []; }
            if (!measuresFor || !_.isArray(measuresFor)) { measuresFor = []; }
            if (!filter) { filter = ""; }
            if (!orderBy) { orderBy = ""; }
            if (!skip) { skip = ""; }
            if (!top) { top = ""; }

            // Derive comma-delimited lists from the specified arrays.  It doesn't matter if a list ends up
            // with a trailing comma.
            timePeriodsList = _.reduce(timePeriods, function (memo, tp) { return memo + tp + ","; }, "");
            measuresList = _.reduce(measures, function (memo, m) { return memo + m + ","; }, "");
            measuresForList = _.reduce(measuresFor, function (memo, part) { return memo + part + ","; }, "");

            // Return the fully formed URI, with the text replacement parts replaced with the specified args (URI
            // encoded).
            return segmentsTreeQueryHref.replace("{timePeriodsList}", encodeURIComponent(timePeriodsList))
                                        .replace("{dataToInclude}", encodeURIComponent(include))
                                        .replace("{measuresList}", encodeURIComponent(measuresList))
                                        .replace("{measuresFor}", encodeURIComponent(measuresForList))
                                        .replace("{filter}", encodeURIComponent(filter))
                                        .replace("{orderby}", encodeURIComponent(orderBy))
                                        .replace("{skip}", encodeURIComponent(skip))
                                        .replace("{top}", encodeURIComponent(top));
        },

        // Returns the fully-formed Web API URI that queries for time series results data, using the specified
        // time series query link, measures, start date, end date and series type.
        //   timeSeriesQueryHref - must be valid; will have been returned by the Web API in a representation of
        //                         a Portfolio Analysis, Segments Tree Node or Time Series resource
        //   measures   - must be set to a non-empty array containing one or more measure identifiers;
        //                see https://revapi.statpro.com/v1/apidocs/measures/timeSeries;
        //                this method doesn't check to see if the measure identifiers are valid
        //   startDate  - use null/empty/undefined for the earliest date in the analysis results;
        //                if a string then it must be in ISO 8601 date format ("2010-10-30");
        //                otherwise specify a JavaScript Date object
        //   endDate    - use null/empty/undefined for the latest date in the analysis results;
        //                if a string then it must be in ISO 8601 date format ("2012-09-21");
        //                otherwise specify a JavaScript Date object
        //   seriesType - "raw" or "cumulativeIndexed" (without the quotes); if null/empty/undefined or
        //                unrecognised then "raw" will be used.
        //
        // Returns null if any arg is invalid.
        // See the Web API's documentation for the time-series-query link relation for more details.
        getTimeSeriesQueryUri: function (timeSeriesQueryHref, measures, startDate, endDate, seriesType) {
            var list, start, end, type;

            // Check args.
            if (!timeSeriesQueryHref || !measures || !_.isArray(measures) || (measures.length === 0)) {
                return null;
            }

            // Get the comma-separated measures list.
            list = _.reduce(measures, function (memo, id) { return memo + id + ","; }, "");
            list = list.slice(0, -1);

            // Get the start and end dates.
            function getDate(date) {
                if (!date) {
                    return "";
                }
                if (_.isString(date)) {
                    return date;
                }
                if (_.isDate(date)) {
                    return helperFns.getDateInISO8601DateFormat(date);
                }
                return null;
            }
            start = getDate(startDate);
            end = getDate(endDate);
            if ((start === null) || (end === null)) {
                return null;
            }

            // Get the type.
            if (!seriesType) {
                type = "raw";
            } else if (seriesType.toUpperCase() === "CUMULATIVEINDEXED") {
                type = "cumulativeIndexed";
            } else {
                type = "raw";
            }

            // Return the fully formed URI, with the text replacement parts replaced with the specified args (URI
            // encoded).
            return timeSeriesQueryHref.replace("{measuresList}", encodeURIComponent(list))
                                      .replace("{startDate}", encodeURIComponent(start))
                                      .replace("{endDate}", encodeURIComponent(end))
                                      .replace("{seriesType}", encodeURIComponent(type));
        },

        // Private
        // Should be called when the global "timeSeriesSegmentQueriesAvailable" custom event is triggered to
        // inform listeners that (possibly) new time series segment queries are available.  'queries' should be
        // an array of objects, each containing 'name', 'classifier' and 'href' properties.
        _onTimeSeriesSegmentQueriesAvailable: function (queries) {
            var count,
                analysis = this.get("analysis");

            if (!analysis || !queries || queries.length === 0) {
                return;
            }

            // Add the queries to the Analysis model.  All additions are silent, except for the last.
            count = queries.length;
            _.each(queries, function (query, index) {
                analysis.addTimeSeriesQueryForSegment(query.href, query.name, query.classifier, 
                    (index === (count - 1)) ? false : true);
            });
        }
    });

    return WebApiDataModel;
});
