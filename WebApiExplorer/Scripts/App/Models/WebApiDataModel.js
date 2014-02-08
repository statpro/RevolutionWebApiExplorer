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
                timeSeriesMeasuresInfo: null,       // instance of MeasuresInfoModel
                exportCultures: null                // instance of CultureCollection
            };
        },

        initialize: function () {
            // When the global "timeSeriesSegmentQueriesAvailable" custom event is triggered...
            Backbone.pubSub.on("timeSeriesSegmentQueriesAvailable", this._onTimeSeriesSegmentQueriesAvailable, this);
        },

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
        //   seriesType - "raw" or "cumulative" or "cumulativeIndexed" or "overallCustomPeriod" (without the quotes);
        //                if null/empty/undefined or unrecognised then "raw" will be used.
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
            } else if (seriesType.toUpperCase() === "CUMULATIVE") {
                type = "cumulative";
            } else if (seriesType.toUpperCase() === "CUMULATIVEINDEXED") {
                type = "cumulativeIndexed";
            } else if (seriesType.toUpperCase() === "OVERALLCUSTOMPERIOD") {
                type = "overallCustomPeriod";
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

        // Returns information about extra measures that required by a Web API time series resource request, over
        // and above the measures that are actually being requested by the user.  There are normally no such extra
        // measures.  However, for the Cumulative, CumulativeIndexed and OverallCustomPeriod series types, in
        // conjunction with a small number of measures (e.g. Relative Return), extra measures are required
        // (e.g. Portfolio Return and Benchmark Return).  If not explicitly requested by the client application, the
        // Web API will get time series data for these extra measures, will use this data in the compounding of the
        // requested measures that require the extra measures, but *won't* return the required-but-not-requested extra
        // measures to the client application.  More significantly for a client application, required-but-not-requested
        // extra measures count towards to the maximum number of time series measures per request (10).  Information
        // returned by this method can be used to detect if this maximum limit will be exceeded, and to warn the user
        // accordingly.
        //
        // Args:-
        //   measures   - must be set to a non-empty array containing one or more user-requested measure identifiers;
        //                see https://revapi.statpro.com/v1/apidocs/measures/timeSeries;
        //   seriesType - "raw" or "cumulative" or "cumulativeIndexed" or "overallCustomPeriod" (without the quotes);
        //                if null/empty/undefined or unrecognised then the series type will be taken to be Raw.
        //
        // Returns null if no extra measures are required; otherwise returns an object whose properties are set
        // to the identifiers of the requested measures that require extra measures that aren't requested.  The
        // value of each property is an array of one or more required-but-not-requested extra measure identifiers.
        // For example:-
        // {
        //     "ECompoundC": [
        //         "ETotalMCA",         -- these two are required for ECompoundC compounding, but aren't requested
        //         "EAllocC"
        //     ],
        //     "RelR": [
        //         "Rb"                 -- this one is required for RelR compounding, but isn't requested
        //     ]
        // }
        //
        // NOTE 1: the measure identifiers in the returned object will be case-correct.
        //
        // NOTE 2: there may be overlap in the extra measures in the returned object; e.g. the same extra measure
        // (e.g. Rp) may be listed more than once (e.g. Rp may be required by both RelR and RelRGeom).
        //
        getExtraRequiredTimeSeriesMeasures: function (measures, seriesType) {
            var extraMeasuresInfo, upperMeasureIds, result;

            // Sanity check.
            if ((!measures) || (measures.length === 0)) {
                return null;
            }

            // Only Cumulative, CumulativeIndexed and OverallCustomPeriod series types have extra measures.
            if (!seriesType) {
                return null;
            }
            if ((seriesType.toUpperCase() !== "CUMULATIVE") && (seriesType.toUpperCase() !== "CUMULATIVEINDEXED") &&
                (seriesType.toUpperCase() !== "OVERALLCUSTOMPERIOD")) {
                return null;
            }

            // Get information on all of the extra measures for compounding.
            extraMeasuresInfo = this._getExtraTimeSeriesMeasuresForCompounding();

            // From the specified array of measure identifiers, derive an array with each identifier in upper case.
            upperMeasureIds = _.map(measures, function (mId) { return mId.toUpperCase(); });

            // Initialize the object to be returned.
            result = {};

            // For each measure that requires extra measures for compounding...
            _.each(extraMeasuresInfo, function (extraIds, measureId) {
                var upperMeasureId,
                    notRequested = [];

                // Sanity check.
                if (!extraMeasuresInfo.hasOwnProperty(measureId)) {
                    return;
                }

                // If this measure requested?  Return if not.
                upperMeasureId = measureId.toUpperCase();
                if (!_.find(upperMeasureIds, function (m) { return m === upperMeasureId; })) {
                    return;
                }

                // Are any of this measure's extra measures *not* requested?  If so, add the details to the 'result'
                // object.
                _.each(extraIds, function (extraId) {
                    var upperExtraId = extraId.toUpperCase();
                    if (!_.find(upperMeasureIds, function (m) { return m === upperExtraId; })) {
                        notRequested.push(extraId);
                    }
                });
                if (notRequested.length > 0) {
                    result[measureId] = notRequested;
                }
            });

            // Return.
            return (Object.getOwnPropertyNames(result).length === 0) ? null : result;
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
        },

        // Private
        // Gets an object that indicates the extra measures that are required when compounding certain time series
        // measures.  For example, measure Relative Return ("RelR") requires extra measures Portfolio Return ("Rp")
        // and Benchmark Return ("Rb").  For more information, see method 'getExtraRequiredTimeSeriesMeasures' above.
        _getExtraTimeSeriesMeasuresForCompounding: function () {
            return {
                "ECompoundC": [
                    "ETotalMCA",
                    "ETotalLocal",
                    "EAllocC",
                    "ETimingC"
                ],
                "ETotalC": [
                    "ETotalMCA",
                    "ETotalLocal"
                ],
                "RelR": [
                    "Rp",
                    "Rb"
                ],
                "RelRGeom": [
                    "Rp",
                    "Rb"
                ],
                "RelRGeomLocal": [
                    "RpLocal",
                    "RbLocal"
                ],
                "RelRlocal": [
                    "RpLocal",
                    "RbLocal"
                ]
            };
        }
    });

    return WebApiDataModel;
});
