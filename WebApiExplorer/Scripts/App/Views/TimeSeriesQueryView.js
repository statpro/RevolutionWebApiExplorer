/* global define: false, alert: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Instances/RevWebApi",
    "Instances/LocallyStoredData",
    "Models/MeasureLayoutModel",
    "Models/MeasureModel",
    "Views/SelectMeasuresModalView"
],
function (Backbone, _, $, webApiData, revWebApi, locallyStoredData, MeasureLayoutModel, MeasureModel,
    SelectMeasuresModalView) {
    "use strict";

    // Time Series Query view; represents the Time Series Query form.
    var TimeSeriesQueryView = Backbone.View.extend({
        el: $("#timeSeriesQueryForm"),
        tagName: "form",
        model: null,                // specify instance of AnalysisModel when creating
        selectMeasuresView: null,   // our contained Select Measures Modal view
        measureLayouts: null,       // Time Series measure layouts; instance of MeasureLayoutCollection
        currentMeasureLayout: null, // currently-selected measure layout; its measures will be used in the query
        measureLayoutsAddedOrRemoved: false,  // flag used to detect if the user added or removed a measure layout

        maxNumRequestableMeasures: 10,

        events: {
            "click #timeSeriesQueryMeasuresBtnGroup .measureLayout": "_onMeasureLayoutSelected",
            "click #timeSeriesQueryEditMeasures": "_onEditMeasures",
            "submit": "_onFormSubmit"
        },

        initialize: function () {
            var defaultLayout, layoutName;

            // Get the Time Series measure layouts.  If it doesn't yet exist, create the "Default" layout,
            // and ensure the user can't delete it.
            this.measureLayouts = locallyStoredData.get("timeSeriesMeasureLayouts");
            defaultLayout = this.measureLayouts.getLayout("Default");
            if (!defaultLayout) {
                defaultLayout = new MeasureLayoutModel({ name: "Default", canDelete: false });
                this.measureLayouts.add(defaultLayout);
                this._persistAllMeasureLayouts();
            }

            // Get the current measure layout, whose name is persisted locally.  If not found, use the
            // "Default" layout.
            layoutName = locallyStoredData.get("timeSeriesMeasureLayoutName");
            this.currentMeasureLayout = this.measureLayouts.getLayout(layoutName);
            if (!this.currentMeasureLayout) {
                this.currentMeasureLayout = defaultLayout;
                locallyStoredData.set("timeSeriesMeasureLayoutName", defaultLayout.get("name"));
            }

            // Create and set up the Select Measures Modal view.
            this.selectMeasuresView = new SelectMeasuresModalView({
                el: $("#timeSeriesMeasuresModal"),
                collection: this.measureLayouts,
                indicateCompoundableMeasures: true,               // provide visual indication of compoundable measures
                model: webApiData.get("timeSeriesMeasuresInfo")   // the data may not be loaded yet
            });

            // Due to the nature of modals, these events must be wired-up dynamically.
            $('#timeSeriesMeasuresModal').on('shown', $.proxy(this._onSelectMeasuresModalShown, this))
                                         .on('hidden', $.proxy(this._onSelectMeasuresModalHidden, this));

            // Set up the start date / end date pickers.
            this.$('#timeSeriesStartDatePicker').datetimepicker({
                pickTime: false
            });
            this.$('#timeSeriesEndDatePicker').datetimepicker({
                pickTime: false
            });

            // We'll get told when new time series segment queries become available (as the user traverses
            // the Segments Tree).
            this.listenTo(this.model, "change:timeSeriesSegmentQueries", this._onSegmentsQueriesAvailable);
        },

        // Rendering this view resets the form.
        render: function () {
            var status = this.model.get("status"),
                elSeriesTypeSelect = this.$("#timeSeriesTypeSelect"),
                elStartDateInput = this.$("#timeSeriesStartDateInput"),
                elEndDateInput = this.$("#timeSeriesEndDateInput"),
                elSegmentsSelect = this.$("#timeSeriesSegmentSelect"),
                elMeasuresBtn = this.$("#timeSeriesQueryMeasuresBtn");

            // Default: remove the list of segments from the form.
            elSegmentsSelect.html("");

            // If there are no analysis results... (our container view will hide the form in this case)
            if (webApiData.get("isUserLoggedOn") === false) {
                return this;
            }
            if ((status !== "Finished") && (status !== "FinishedWithMessages")) {
                return this;
            }

            // Allow the user to choose from all the segments whose queries we know about.
            elSegmentsSelect.html(this._getSegmentSelectHtml());

            // Ensure the Raw series type is selected.
            elSeriesTypeSelect.val("raw");

            // Reset the start/end dates.
            elStartDateInput.val("").trigger("change");
            elEndDateInput.val("").trigger("change");

            // Set up the Measures button (to indicate the currently selected measure layout).
            elMeasuresBtn.html(this._getMeasuresButtonHtml());

            // List the available measure layouts so that the user can select one when clicking on the
            // Measures button's dropdown.
            this._listAvailableMeasureLayouts();

            return this;
        },

        // --------------------------------------------------------------------------------------------- 
        //
        // Private methods.
        // In all cases, 'this' must be set to this view instance.
        //

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

        // Gets the HTML for the #timeSeriesQueryMeasuresBtn button, which indicates which measure layout
        // will be used for the query, and how many measures it includes.
        _getMeasuresButtonHtml: function () {
            return this._getMeasureLayoutDisplayText(this.currentMeasureLayout) + " <span class='caret'></span>";
        },

        // Sets up the dropdown list that's attached to the Measures button to list all the available measure
        // layouts, so that the user can select one.  Preserves other items (e.g. divider, and the "Edit..." item).
        // (The measure layouts are contained in <li> elements that have class "measureLayout" for identification.
        //  Also the <li> elements contain the names of the measure layouts in the "data-measure-name" attribute.)
        _listAvailableMeasureLayouts: function () {
            var html,
                elList = this.$("#timeSeriesQueryMeasuresBtnGroup ul"),
                templ = "<li class='measureLayout' data-measure-name='{0}'><a href='#'>{1}</a></li>";

            // Remove existing measure layout items (they're possibly out of date).
            elList.find("li.measureLayout").remove();

            // Get HTML for the items of the current measure layouts.
            html = this.measureLayouts.reduce(function (memo, layout) {
                return memo + templ.replace("{0}", layout.get("name"))
                                   .replace("{1}", this._getMeasureLayoutDisplayText(layout));
            }, "", this);

            // Prepend to the list (i.e. they come before the divider).
            elList.prepend(html);
        },

        // Gets the display text used in this form to represent the specified measure layout.
        _getMeasureLayoutDisplayText: function (layout) {
            var count,
                templ = "{0} Layout ({1} measure{2})";

            if (!layout) {
                return "";
            }

            count = layout.getMeasuresCount();
            return templ.replace("{0}", layout.get("name"))
                        .replace("{1}", count.toString())
                        .replace("{2}", (count === 1) ? "" : "s");
        },

        // Must be called when the user clicks on an item in the dropdown list that's attached to the Measures button
        // to select a measure layout (to become the currently-selected measure layout).
        _onMeasureLayoutSelected: function (e) {
            var layout,
                layoutName = $(e.target.parentNode).attr("data-measure-name");

            e.preventDefault();

            if (layoutName) {
                layout = this.measureLayouts.getLayout(layoutName);
                if (layout) {
                    this.currentMeasureLayout = layout;
                    this.$("#timeSeriesQueryMeasuresBtn").html(this._getMeasuresButtonHtml());
                    locallyStoredData.set("timeSeriesMeasureLayoutName", layout.get("name"));
                }
            }
        },

        // Must be called when the user clicks to edit the measures.
        _onEditMeasures: function (e) {
            var measuresInfo = webApiData.get("timeSeriesMeasuresInfo");

            e.preventDefault();

            // Ensure that info about all the requestable Time Series measures is loaded into the appropriate
            // model.  When done, show the modal (= dialog) that allows the user to edit the measures used in this
            // form.
            measuresInfo.load(revWebApi.actionUris.getTimeSeriesMeasures, function () {
                $("#timeSeriesMeasuresModal").modal();
            });
        },

        // Must be called when the Select Measures modal is shown.
        _onSelectMeasuresModalShown: function () {
            var view = this.selectMeasuresView;

            // Listen for changes to the measure layouts collection, and for changes to individual layouts.
            this.measureLayoutsAddedOrRemoved = false;
            this.measureLayouts.each(function (layout) { layout.set("measuresChanged", false); });
            this.listenTo(this.measureLayouts, "add", this._onMeasureLayoutAddedOrRemoved);
            this.listenTo(this.measureLayouts, "remove", this._onMeasureLayoutAddedOrRemoved);
            this.listenTo(this.measureLayouts, "change:measureIds", this._onMeasureLayoutChanged);
            this.listenTo(this.measureLayouts, "change:measuresChanged", this._onMeasureLayoutChanged);

            // Set up and render the Select Measures modal view.
            view.setPortfolioData(this.model.get("currency"), this.model.get("statsFrequency"));
            view.setInitialLayoutName(this.currentMeasureLayout.get("name"));
            view.render();
        },

        // Must be called when the Select Measures modal is hidden.
        _onSelectMeasuresModalHidden: function () {
            var layout,
                layouts = this.measureLayouts;

            // Stop listening for changes to the measure layouts collection.
            this.stopListening(this.measureLayouts, "add");
            this.stopListening(this.measureLayouts, "remove");
            this.stopListening(this.measureLayouts, "change:measureIds");
            this.stopListening(this.measureLayouts, "change:measuresChanged");

            // If the currently-selected measure layout no longer exists, make the "Default" layout (which can't
            // be deleted) be selected.
            layout = layouts.getLayout(this.currentMeasureLayout.get("name"));
            if (!layout) {
                this.currentMeasureLayout = layouts.getLayout("Default");
            }

            // Update the display of the Measures button.
            this.$("#timeSeriesQueryMeasuresBtn").html(this._getMeasuresButtonHtml());

            // Update the list of the available measure layouts.
            this._listAvailableMeasureLayouts();

            // Persist any changes to the measure layouts to local storage.
            if (this.measureLayoutsAddedOrRemoved) {
                this._persistAllMeasureLayouts();
            } else {
                this._persistModifiedMeasureLayouts();
            }
        },

        // Must be called when the user adds or removes a measure layout in the Select Measures modal.
        _onMeasureLayoutAddedOrRemoved: function () {
            this.measureLayoutsAddedOrRemoved = true;
        },

        // Must be called when the user modifies a measure layout in the Select Measures modal.
        _onMeasureLayoutChanged: function (layout) {
            if (layout) {
                // However the layout was changed, translate this into a set of its 'measuresChanged' to true.
                // This is enough for us to cause the layout to be persisted to local storage when the
                // Select Measures modal is hidden.
                layout.set("measuresChanged", true, { silent: true });
            }
        },

        // Persists all existing measure layouts to local storage.
        _persistAllMeasureLayouts: function () {
            locallyStoredData.writeTimeSeriesMeasureLayouts();
        },

        // Persists only those measure layouts that have been modified (their "measuresChanged" attribute is
        // true) to local storage.
        _persistModifiedMeasureLayouts: function () {
            this.measureLayouts.each(function (layout) {
                if (layout.get("measuresChanged") === true) {
                    locallyStoredData.writeTimeSeriesMeasureLayouts(layout);
                }
            });
        },

        // Must be called when the form is submitted.
        // 'this' must be set to this view instance.
        _onFormSubmit: function () {
            var uri, query, queryHref, classifier, seriesType, requiredExtrasObj, requiredExtraIds,
                thisView = this,
                currency = this.model.get("currency"),
                startDate = null, endDate = null,
                measures = [],
                measuresInfo = webApiData.get("timeSeriesMeasuresInfo"),
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

                // Get the query href and classifier for the selected segment from our Analysis model's
                // 'timeSeriesSegmentQueries' array.
                if (name === "timeSeriesSegmentSelect") {
                    query = timeSeriesSegmentQueries[parseInt(value, 10)];
                    queryHref = query.href;
                    classifier = query.classifier;
                }

                // Get "raw" or "cumulative" or "cumulativeIndexed" or "overallCustomPeriod", values that must
                // be set up in the HTML definition of the form.
                else if (name === "timeSeriesTypeSelect") {
                    seriesType = value;
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


            // Get the ids of the measures that exist in the current/active measure layout.
            measures = this.currentMeasureLayout.getMeasureIds();

            // Warn if no measures or too many measures are selected.
            if ((measures.length === 0) || (measures.length > this.maxNumRequestableMeasures)) {
                alert("Please select between 1 and 10 measures.");
                this.$("#timeSeriesMeasuresControlGroup").addClass("error");
                return false;
            }

            // If there are extra measures that are required for compounding certain selected measures
            // (e.g. compounding RelR requires Rp and Rb) but some or all of these extra measures *aren't* selected,
            // check that adding these measures (something the Web API will do automatically, although it won't
            // return data for these measures to the client) doesn't cause the max-num-measures-per-request
            // limit to be exceeded.
            requiredExtrasObj = webApiData.getExtraRequiredTimeSeriesMeasures(measures, seriesType);
            if (requiredExtrasObj) {
                // Get an array of distinct required-but-not-requested extra measure identifiers.
                requiredExtraIds = _.uniq(_.reduce(requiredExtrasObj, function (memo, val) {
                    return memo.concat(val);
                }, []));

                // If the number of explicitly + implicitly requested measures exceeds the maximum allowed per
                // request...
                if ((measures.length + requiredExtraIds.length) > this.maxNumRequestableMeasures) {
                    // Ensure that info about all the requestable Time Series measures is loaded into the
                    // appropriate model, and display an error message to the user.
                    measuresInfo.load(revWebApi.actionUris.getTimeSeriesMeasures, function () {
                        alert(thisView._getTooManyRequiredExtrasMsg(requiredExtraIds, measuresInfo, currency));
                    });

                    // Indicate an error.
                    this.$("#timeSeriesMeasuresControlGroup").addClass("error");
                    return false;
                }
            }

            // Sort the measure ids array, otherwise the order is random and unpredictable.
            measures.sort();


            // Get the URI that queries for a time series using the user-selected values.
            uri = webApiData.getTimeSeriesQueryUri(queryHref, measures, startDate, endDate, seriesType);

            // Ensure that info about all the requestable Time Series measures is loaded into the appropriate
            // model (this info is going to be needed when we display TS results).  When done, tell the time
            // series results model to load a time series from the generated URI.  We tell the model which
            // classifier the segment belongs to; we don't have to tell the model what the segment name is as
            // the Web API will provide this.  We also tell the model what the analysis's currency is (e.g. "USD").
            measuresInfo.load(revWebApi.actionUris.getTimeSeriesMeasures, function () {
                webApiData.get("timeSeriesResults").load(uri, classifier, currency);
            });

            return false;
        },

        // Returns the message to display in an alert if the number of explicitly + implicitly required measures
        // exceeds the allowed per-request maximum.
        _getTooManyRequiredExtrasMsg: function (requiredExtraIds, measuresInfo, currency) {
            var name, msg;

            msg = "The compounding of certain selected measures requires the use of extra measures.  The following " +
                "extra measures are required, but aren't explicitly selected:-\n\n";

            _.each(requiredExtraIds, function (id) {
                name = measuresInfo.getMeasureName(id);
                if (!name) {
                    name = id;
                } else {
                    name = MeasureModel.getMeasureDisplayName(name, currency);
                }
                msg += "  " + name + "\n";
            });
            msg += "\n";

            msg += "Normally this is not a problem, as the Web API will silently get and use data for these " +
                "measures.   However, currently the maximum number of explicitly + implicitly required measures " +
                "exceeds " + this.maxNumRequestableMeasures.toString() + " and so the request for time series data " +
                "will fail.  Please reduce the number of selected measures.  (For more details, please see the Web " +
                "API's documentation page on the time-series-query link relation.)";

            return msg;
        }
    });

    return TimeSeriesQueryView;
});
