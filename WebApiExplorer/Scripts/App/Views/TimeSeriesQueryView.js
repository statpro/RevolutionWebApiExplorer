/* global define: falsealert: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData"
],
function (Backbone, _, $, webApiData) {
    "use strict";

    // Time Series Query view; represents the Time Series Query form.
    var TimeSeriesQueryView = Backbone.View.extend({
        el: $("#timeSeriesQueryForm"),
        model: null,           // specify instance of AnalysisModel when creating
        tagName: "form",

        events: {
            "change #timeSeriesTypeSelect": "_onSeriesTypeChanged",
            "submit": "_onFormSubmit"
        },

        initialize: function () {
            this.$('#timeSeriesStartDatePicker').datetimepicker({
                pickTime: false
            });
            this.$('#timeSeriesEndDatePicker').datetimepicker({
                pickTime: false
            });

            this.listenTo(this.model, "change:timeSeriesSegmentQueries", this._onSegmentsQueriesAvailable);
        },

        // Rendering this view resets the form.
        render: function () {
            var status = this.model.get("status"),
                elSegmentsSelect = this.$("#timeSeriesSegmentSelect"),
                elMeasuresSelect = this.$("#timeSeriesMeasuresSelect");

            // Default: remove the lists of segments and measures from the form.
            elSegmentsSelect.html("");
            elMeasuresSelect.html("");

            // If there are no analysis results... (our container view will hide the form in this case)
            if (webApiData.get("isUserLoggedOn") === false) {
                return this;
            }
            if ((status !== "Finished") && (status !== "FinishedWithMessages")) {
                return this;
            }

            // Allow the user to choose from all the segments whose queries we know about.
            elSegmentsSelect.html(this._getSegmentSelectHtml());

            // Allow the user to select which measures to get.
            elMeasuresSelect.html(this._getMeasuresSelectHtml());

            // Ensure the Raw series type is selected.
            this.$("#timeSeriesTypeSelect").val("raw");

            // Ensure the measure options are correctly enabled/disabled according to the current series type
            // (raw or cumulative indexed).
            this._onSeriesTypeChanged();

            // Reset the start/end dates.
            this.$("#timeSeriesStartDateInput").val("").trigger("change");
            this.$("#timeSeriesEndDateInput").val("").trigger("change");

            return this;
        },

        // Private.
        // Gets the HTML for the #timeSeriesSegmentSelect select element, which lists the available per-segment
        // time series queries.  The values for the options (0, 1, 2...) index our Analysis model's
        // 'timeSeriesSegmentQueries' array.
        _getSegmentSelectHtml: function () {
            return _.reduce(this.model.get("timeSeriesSegmentQueries"), function (memo, query, index) {
                return memo +
                    "<option value='" + index + "'>" +
                    (!query.classifier ? "" : (_.escape(query.classifier) + " - ")) + _.escape(query.name) +
                    "</option>";
            }, "");
        },

        // Private.
        // Gets the HTML for the #timeSeriesMeasuresSelect select element, which lists the measures that can be
        // requested from the Web API in time series data.  The values for the options are the measure identifers
        // ("Rp", "Rb", etc.).
        _getMeasuresSelectHtml: function () {
            var measures = webApiData.timeSeriesMeasures,
                currency = this.model.get("currency");

            return _.reduce(measures, function (memo, measure) {
                return memo +
                    "<option value='" + measure.id + "'>" + measure.name.replace("[CUR]", currency) + "</option>";
            }, "");
        },

        // Private.
        // Must be called when our Analysis model's 'timeSeriesSegmentQueries' changes.  We use this event to
        // make more options available to the user in the #timeSeriesSegmentSelect select element.
        _onSegmentsQueriesAvailable: function () {
            var queries = this.model.get("timeSeriesSegmentQueries");

            // Ignore this attribute-change event until at least two segments' worth of queries have become
            // available ("Total" segment + one other).  We'll pick up the "Total" segment's query when the
            // view is first rendered for a newly-loaded portfolio analysis.
            if (!queries || queries.length < 2) {
                return;
            }

            // Update the select element.
            // TODO: get current selection, re-render, restore selection
            this.$("#timeSeriesSegmentSelect").html(this._getSegmentSelectHtml());
        },

        // Private.
        // Must be called when the user changes the time series type selection (raw or cumulative indexed) via the
        // #timeSeriesTypeSelect select element (which 'this' must reference).  If cumulative indexed is selected,
        // then all but the "Rp", "Rb" and "RelR" options in the measures select element are de-selected and disabled;
        // otherwise they are enabled.
        // 'this' must be set to this view instance.
        _onSeriesTypeChanged: function () {
            var enable = true,
                measureIds = ["Rp", "Rb", "RelR"];  // allowed for cumulative indexed

            if (this.$("#timeSeriesTypeSelect").val() === "cumulativeIndexed") {
                enable = false;
            }

            this.$("#timeSeriesMeasuresSelect option").each(function () {
                if (!_.contains(measureIds, this.value)) {
                    if (!enable) {
                        this.selected = false;
                    }
                    this.disabled = !enable;
                }
            });
        },

        // Private.
        // Must be called when the form is submitted.
        // 'this' must be set to this view instance.
        _onFormSubmit: function () {
            var uri, query, queryHref, classifier, seriesType,
                startDate = null, endDate = null,
                measures = [],
                timeSeriesSegmentQueries = this.model.get("timeSeriesSegmentQueries");

            // Sanity check: ensure that the format for the start and end dates, as used by the Bootstrap date/time
            // picker, is the ISO 8601 date format.
            if (this.$("#timeSeriesStartDateInput").attr("data-format") !== "yyyy-MM-dd") {
                alert("Error: data format for the #timeSeriesStartDateInput input must be 'yyyy-MM-dd'.");
                return false;
            }
            if (this.$("#timeSeriesEndDateInput").attr("data-format") !== "yyyy-MM-dd") {
                alert("Error: data format for the #timeSeriesEndDateInput input must be 'yyyy-MM-dd'.");
                return false;
            }

            // Default: no errors.
            this.$("#timeSeriesMeasuresControlGroup").removeClass("error");

            // Parse the submitted form values.
            _.each(this.$el.serializeArray(), function (input) {
                var name = input.name,
                    value = input.value;

                // Get the query and classifier href for the selected segment from our Analysis model's
                // '' array.
                if (name === "timeSeriesSegmentSelect") {
                    query = timeSeriesSegmentQueries[parseInt(value, 10)];
                    queryHref = query.href;
                    classifier = query.classifier;
                }

                // Get "raw" or "cumulativeIndexed", values that must be set up in the HTML definition of the form.
                else if (name === "timeSeriesTypeSelect") {
                    seriesType = value;
                }

                // Push the measure id onto the 'measures' array (there can be 0 or more of these).
                else if (name === "timeSeriesMeasuresSelect") {
                    measures.push(value);
                }

                // Get the start date (as a string in ISO 8601 date format, or empty).
                else if (name === "timeSeriesStartDateInput") {
                    startDate = value;
                }

                // Get the end date (as a string in ISO 8601 date format, or empty).
                else if (name === "timeSeriesEndDateInput") {
                    endDate = value;
                }

                else {
                }
            }, this);

            // Check that at least one measure has been selected.
            if (measures.length === 0) {
                this.$("#timeSeriesMeasuresControlGroup").addClass("error");
                this.$("#timeSeriesMeasuresSelect").focus();
                return false;
            }

            // Get the URI that queries for a time series using the user-selected values.
            uri = webApiData.getTimeSeriesQueryUri(queryHref, measures, startDate, endDate, seriesType);

            // Tell the time series results model to load a time series from this URI.  We tell the model which
            // classifier the segment belongs to; we don't have to tell the model what the segment name is as
            // the Web API will provide this.  We also tell the model what the analysis's currency is (e.g. "USD").
            webApiData.get("timeSeriesResults").load(uri, classifier, this.model.get("currency"));

            return false;
        }
    });

    return TimeSeriesQueryView;
});
