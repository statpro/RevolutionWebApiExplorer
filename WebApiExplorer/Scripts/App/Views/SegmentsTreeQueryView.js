/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Instances/RevWebApi",
    "Instances/LocallyStoredData",
    "Models/MeasureLayoutModel",
    "Views/SelectMeasuresModalView"
],
function (Backbone, _, $, webApiData, revWebApi, locallyStoredData, MeasureLayoutModel, SelectMeasuresModalView) {
    "use strict";

    // Segments Tree Query view; represents the Segments Tree Query form.
    var SegmentsTreeQueryView = Backbone.View.extend({
        el: $("#segmentsTreeQueryForm"),
        tagName: "form",
        model: null,                // specify instance of AnalysisModel when creating
        selectMeasuresView: null,   // our contained Select Measures Modal view
        measureLayouts: null,       // Segments Tree measure layouts; instance of MeasureLayoutCollection
        currentMeasureLayout: null, // currently-selected measure layout; its measures will be used in the query
        measureLayoutsAddedOrRemoved: false,  // flag used to detect if the user added or removed a measure layout

        events: {
            "click #segmentsTreeQueryMeasuresBtnGroup .measureLayout": "_onMeasureLayoutSelected",
            "click #segmentsTreeQueryEditMeasures": "_onEditMeasures",
            "change #segmentsTreeQueryIncludeChildSegments": "_onIncludeChange",
            "change #segmentsTreeQueryIncludeSecurities": "_onIncludeChange",
            "change #segmentsTreeQueryIncludeNone": "_onIncludeChange",
            "submit": "_onFormSubmit"
        },

        initialize: function () {
            var defaultLayout, layoutName;

            // Get the Segments Tree measure layouts.  If it doesn't yet exist, create the "Default" layout,
            // and ensure the user can't delete it.
            this.measureLayouts = locallyStoredData.get("segmentsTreeMeasureLayouts");
            defaultLayout = this.measureLayouts.getLayout("Default");
            if (!defaultLayout) {
                defaultLayout = new MeasureLayoutModel({ name: "Default", canDelete: false });
                this.measureLayouts.add(defaultLayout);
                this._persistAllMeasureLayouts();
            }

            // Get the current measure layout, whose name is persisted locally.  If not found, use the
            // "Default" layout.
            layoutName = locallyStoredData.get("segmentsTreeMeasureLayoutName");
            this.currentMeasureLayout = this.measureLayouts.getLayout(layoutName);
            if (!this.currentMeasureLayout) {
                this.currentMeasureLayout = defaultLayout;
                locallyStoredData.set("segmentsTreeMeasureLayoutName", defaultLayout.get("name"));
            }

            // Create and set up the Select Measures Modal view.
            this.selectMeasuresView = new SelectMeasuresModalView({
                el: $("#segmentsTreeMeasuresModal"),
                collection: this.measureLayouts,
                model: webApiData.get("segmentsTreeMeasuresInfo")   // the data may not be loaded yet
            });

            // Due to the nature of modals, these events must be wired-up dynamically.
            $('#segmentsTreeMeasuresModal').on('shown', $.proxy(this._onSelectMeasuresModalShown, this))
                                           .on('hidden', $.proxy(this._onSelectMeasuresModalHidden, this));
        },

        // Rendering this view resets the form.
        render: function () {
            var status = this.model.get("status"),
                elTimePeriodsCntr = this.$("#segmentsTreeTimePeriodsCntr"),
                elMeasuresBtn = this.$("#segmentsTreeQueryMeasuresBtn");

            // Remove the analysis-specific data from the form.
            elTimePeriodsCntr.html("");

            // Do nothing if there are no analysis results; our container view will hide the form in this case.
            if (webApiData.get("isUserLoggedOn") === false) {
                return this;
            }
            if ((status !== "Finished") && (status !== "FinishedWithMessages")) {
                return this;
            }

            // Allow the user to select which time periods to get.
            elTimePeriodsCntr.html(this._getTimePeriodsHtml());

            // Enable the tooltips for the time periods' labels.
            elTimePeriodsCntr.tooltip({
                selector: "[data-toggle=tooltip]"
            });

            // Set up the Measures button (to indicate the currently selected measure layout).
            elMeasuresBtn.html(this._getMeasuresButtonHtml());

            // List the available measure layouts so that the user can select one when clicking on the
            // Measures button's dropdown.
            this._listAvailableMeasureLayouts();
            
            // Set up the form's submit button.
            this._setupSubmitButton();

            return this;
        },

        // --------------------------------------------------------------------------------------------- 
        //
        // Private methods.
        // In all cases, 'this' must be set to this view instance.
        //

        // Must be called when any of the 'Include' radio buttons changes state.
        _onIncludeChange: function () {
            this._setupSubmitButton();
        },

        // Sets up the display of the form's submit button, depending on the current state of the 'Include'
        // radio buttons.
        _setupSubmitButton: function () {
            var include,
                elChildSegments = this.$("#segmentsTreeQueryIncludeChildSegments"),
                elSecurities = this.$("#segmentsTreeQueryIncludeSecurities");

            if (elChildSegments.is(':checked')) {
                include = "childsegments";
            } else if (elSecurities.is(':checked')) {
                include = "securities";
            } else {
                include = "none";
            }

            this.$("#segmentsTreeQuerySubmit").html(this._getSubmitButtonText(include));
        },

        // Gets the display text for the form's submit button, based on the value of 'include', which must be
        // one of:-
        //    "childsegments"
        //    "securities"
        //    "" or "none"
        _getSubmitButtonText: function (include) {
            if (include === "childsegments") {
                return "Get Total Segment and Child Segments";
            }

            if (include === "securities") {
                return "Get Total Segment and Securities";
            }

            return "Get Total Segment";
        },

        // Gets the HTML for the #segmentsTreeTimePeriodsCntr div, which is the container for the inline checkboxes
        // that allow the user to choose which time periods to include in the results data.  The name of each
        // <input> takes the form:   "segmentsTreeTimePeriod_" + <time period code>
        // E.g.   segmentsTreeTimePeriod_1Y
        _getTimePeriodsHtml: function () {
            var timePeriods = this.model.get("timePeriods"),
                templ = '<label class="checkbox inline">' +
                        '<input type="checkbox" name="{tpName}" value="{tpValue}" />' +
                        '<span data-toggle="tooltip" title="{tpTooltip}">{tpLabel}</span>' +
                        '</label>';

            return _.reduce(timePeriods, function (memo, tp) {
                return memo + templ.replace("{tpName}", "segmentsTreeTimePeriod_" + tp.code)
                                   .replace("{tpValue}", tp.code)
                                   .replace("{tpTooltip}", tp.name)
                                   .replace("{tpLabel}", tp.code);
            }, "");
        },

        // Gets the HTML for the #segmentsTreeQueryMeasuresBtn button, which indicates which measure layout
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
                elList = this.$("#segmentsTreeQueryMeasuresBtnGroup ul"),
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
                    this.$("#segmentsTreeQueryMeasuresBtn").html(this._getMeasuresButtonHtml());
                    locallyStoredData.set("segmentsTreeMeasureLayoutName", layout.get("name"));
                }
            }
        },

        // Must be called when the user clicks to edit the measures.
        _onEditMeasures: function (e) {
            var measuresInfo = webApiData.get("segmentsTreeMeasuresInfo");

            e.preventDefault();

            // Ensure that info about all the requestable Segments Tree Node measures is loaded into the appropriate
            // model.  When done, show the modal (= dialog) that allows the user to edit the measures used in this
            // form.
            measuresInfo.load(revWebApi.actionUris.getSegmentsTreeNodeMeasures, function () {
                $("#segmentsTreeMeasuresModal").modal();
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
            this.$("#segmentsTreeQueryMeasuresBtn").html(this._getMeasuresButtonHtml());

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
            locallyStoredData.writeSegmentsTreeMeasureLayouts();
        },

        // Persists only those measure layouts that have been modified (their "measuresChanged" attribute is
        // true) to local storage.
        _persistModifiedMeasureLayouts: function () {
            this.measureLayouts.each(function (layout) {
                if (layout.get("measuresChanged") === true) {
                    locallyStoredData.writeSegmentsTreeMeasureLayouts(layout);
                }
            });
        },

        // Must be called when the form is submitted.
        _onFormSubmit: function () {
            var uri,
                measuresInfo = webApiData.get("segmentsTreeMeasuresInfo"),
                queryHref = this.model.get("segmentsTreeRootNodeQueryHref"),
                timePeriods = [],
                include = "",
                measures = [],
                includeMeasuresFor = [];

            // Parse the submitted form values.
            _.each(this.$el.serializeArray(), function (input) {
                var name = input.name,
                    value = input.value;

                // Push selected time period codes onto the 'timePeriods' array.
                if (name.indexOf("segmentsTreeTimePeriod_") === 0) {
                    timePeriods.push(value);
                }

                // Record the value of the checked "Include" radio button.
                else if (name === "includeRadios") {
                    include = value;
                }

                // Record which parts to include measures for.
                else if (name === "includeForSegment") {
                    includeMeasuresFor.push("segment");
                }
                else if (name === "includeForChildSegments") {
                    includeMeasuresFor.push("childSegments");
                }
                else if (name === "includeForSecurities") {
                    includeMeasuresFor.push("securities");
                }

                else {
                }
            }, this);

            // Get the ids of the measures that exist in the current/active measure layout.
            // Sort this array, otherwise the order is random and unpredictable.
            measures = this.currentMeasureLayout.getMeasureIds();
            measures.sort();

            // Get the URI that queries for the Total segment using the user-selected values.
            // At the moment we're not filtering, ordering or slicing the included children.
            uri = webApiData.getSegmentTreeNodeQueryUri(queryHref, timePeriods, include, measures, includeMeasuresFor,
                "", "", "", "");

            // Ensure that info about all the requestable Segments Tree Node measures is loaded into the appropriate
            // model (this info is going to be needed when we display STN results).  When done, tell the segments
            // tree results model to load the root node from the above URI. 
            measuresInfo.load(revWebApi.actionUris.getSegmentsTreeNodeMeasures, function () {
                webApiData.get("segmentsTreeResults").loadRootNode(uri);
            });

            return false;
        }
    });

    return SegmentsTreeQueryView;
});
