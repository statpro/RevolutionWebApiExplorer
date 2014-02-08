/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Collections/MeasureLayoutCollection",
    "Models/MeasureLayoutModel",
    "Models/MeasureModel"
],
function (Backbone, _, $, MeasureLayoutCollection, MeasureLayoutModel, MeasureModel) {
    "use strict";

    // Select Measures Modal view; represents a modal/dialog that allows the user to create/edit/delete measure
    // layouts, and to select which measures are included in each layout.  The calling code should ensure that
    // the specified-on-view-construction collection of measure layouts includes at least one layout, and that this
    // layout can't be deleted by the user (i.e. a "Default" layout).
    //
    // The view must have the following elements and classes:-
    //    - <select> element for the layouts; class = selectModalLayoutsSelect
    //    - <a> elements for layout actions; classes = selectModalCreateLayoutAction, selectModalExportLayoutAction,
    //      selectModalImportLayoutAction, selectModalResetLayoutAction, selectModalDeleteLayoutAction
    //    - <div> element containing controls for creating/exporting/importing layouts;
    //      class = selectModalLayoutActionCntr; within this container:-
    //          <label> element; class = selectModalLayoutActionLabel
    //          <input> element; class = selectModalLayoutActionInput
    //          <button> element that will do the action; class = selectModalLayoutActionDo
    //          <button> element that will cancel the action; class = selectModalLayoutActionCancel
    //    - element containing the Measures section's Legend title; class = selectModalMeasuresLegendTitle
    //    - <select> element for the measure categories; class = selectModalCategoriesSelect
    //    - <div> element that will contain controls for selecting measures; class = selectModalMeasuresCntr
    //    - <button> element that will select all currently visible measures; class = selectModalSelectAllMeasures
    //    - <button> element that will deselect all currently visible measures; class = selectModalSelectNoMeasures
    //    - element containing text saying how many measures are listed/selected in the current category; class =
    //      selectModalMeasuresSelectionInfo
    //
    var SelectMeasuresModalView = Backbone.View.extend({
        el: null,                // the modal's div element, must be specified on construction
        tagName: "div",

        // collection of relevant measure layouts; instance of MeasureLayoutCollection; must be specified
        // on construction; this collection must have at least one non-deletable measure layout
        collection: null,

        // an alias for the above collection
        layouts: null,

        // flag saying whether or not the modal should provide a visual indication of (time series) measures being
        // compoundable; can be specified on construction; the default is false
        // NOTA BENE: this flag is available within the view via 'this.options.indicateCompoundableMeasures'.
        indicateCompoundableMeasures: false,

        // instance of MeasuresInfoModel that contains details of *all* the selectable measures;
        // must be specified on construction; must be loaded with data before our render
        // method is called
        model: null,

        // events
        events: {
            "change .selectModalLayoutsSelect": "_onLayoutSelected",
            "click .selectModalCreateLayoutAction": "_onCreateLayout",
            "click .selectModalExportLayoutAction": "_onExportLayout",
            "click .selectModalImportLayoutAction": "_onImportLayout",
            "click .selectModalResetLayoutAction": "_onResetLayout",
            "click .selectModalDeleteLayoutAction": "_onDeleteLayout",
            "keypress .selectModalLayoutActionInput": "_onLayoutActionInputKeypress",
            "keyup .selectModalLayoutActionInput": "_onLayoutActionInputKeyUp",
            "focus .selectModalLayoutActionInput": "_onLayoutActionInputGetFocus",
            "change .selectModalCategoriesSelect": "_onCategorySelected",
            "click .selectModalMeasuresCntr": "_onMeasuresClick",
            "click .selectModalSelectAllMeasures": "_onSelectAllClick",
            "click .selectModalSelectNoMeasures": "_onSelectNoneClick",
            "click .selectModalLayoutActionCancel": "_hideLayoutActionControls"
        },

        // the initial layout to display, an instance of MeasureLayoutModel
        initialLayout: null,

        // the currently selected layout, an instance of MeasureLayoutModel
        currentLayout: null,

        // set up when the view is initialized
        elLayoutsSelect: null,
        elLayoutActionCntr: null,
        elLayoutActionLabel: null,
        elLayoutActionInput: null,
        elLayoutActionDoBtn: null,
        elLayoutActionCancelBtn: null,
        elMeasuresLegend: null,
        elCategoriesSelect: null,
        elMeasuresCntr: null,
        elMeasuresSelectionInfo: null,

        // this data pertains to all selectable measures; set up when the view is first rendered (but not
        // before; the underlying model data may not be loaded when this view is initialized)
        categories: null,            // categories array
        allMeasures: null,           // array of each measure's attributes hash
        allMeasuresIds: null,        // hash of all measures; key = measure id, value = true
        measuresPerCategory: null,   // hash; measures' attributes hashes stored per-category

        // portfolio analysis data
        currency: "",                // e.g. "USD"
        statsFrequency: "",          // e.g. "Monthly"

        // flag indicating the Layout Action controls' visibility
        layoutActionCntrVisible: false,

        initialize: function () {
            // Create this alias.
            this.layouts = this.collection;

            // Get references to the controls we manipulate.
            this.elLayoutsSelect = this.$(".selectModalLayoutsSelect");
            this.elLayoutActionCntr = this.$(".selectModalLayoutActionCntr");
            this.elLayoutActionLabel = this.elLayoutActionCntr.find(".selectModalLayoutActionLabel");
            this.elLayoutActionInput = this.elLayoutActionCntr.find(".selectModalLayoutActionInput");
            this.elLayoutActionDoBtn = this.elLayoutActionCntr.find(".selectModalLayoutActionDo");
            this.elLayoutActionCancelBtn = this.elLayoutActionCntr.find(".selectModalLayoutActionCancel");
            this.elMeasuresLegend = this.$(".selectModalMeasuresLegendTitle");
            this.elCategoriesSelect = this.$(".selectModalCategoriesSelect");
            this.elMeasuresCntr = this.$(".selectModalMeasuresCntr");
            this.elMeasuresSelectionInfo = this.$(".selectModalMeasuresSelectionInfo");
        },

        // Call this method before rendering, and specify the portfolio analysis's currency (e.g. "USD") and
        // statistics frequency (e.g. "Monthly").
        setPortfolioData: function (currency, statsFrequency) {
            this.currency = currency;
            this.statsFrequency = statsFrequency;
        },

        // This method can be called before rendering to set the name of the measure layout that will be
        // shown (and which can be edited by the user) when this view is next displayed.  If not called, the
        // first layout in the layouts collection will be shown.
        setInitialLayoutName: function (name) {
            this.initialLayout = this.layouts.getLayout(name);
        },

        render: function () {
            var index;

            // Get data about all the selectable measures (once).
            if (!this.categories) {
                this.categories = this.model.get("categories");
                this.allMeasures = this.model.get("measures").map(function (m) { return m.attributes; });
                this.allMeasuresIds = {};
                _.each(this.allMeasures, function (m) { this.allMeasuresIds[m.id] = true; }, this);
                this.measuresPerCategory = {};
            }

            // Display all the available measure layouts.  Select the initial layout, and set this as the
            // currently selected layout.  Don't call '_onLayoutSelected' at this stage, as it will attempt
            // to re-display measures (which aren't set up yet).
            this.elLayoutsSelect.html(this._getLayoutsSelectHtml());
            index = 0;
            if (this.initialLayout) {
                index = this.layouts.indexOf(this.initialLayout);
                if (index === -1) { index = 0; }
                this.initialLayout = null;   // reset for next time; caller must explicitly set before each render
            }
            this.elLayoutsSelect.val(index);
            this.currentLayout = this.layouts.at(index);

            // Display all the available categories.  Select the first category, and ensure that its measures
            // are displayed.
            this.elCategoriesSelect.html(this._getCategoriesSelectHtml());
            this.elCategoriesSelect.val(0);
            this._onCategorySelected();

            // Ensure the Layout Action controls aren't visible.
            this._hideLayoutActionControls();

            return this;
        },

        // --------------------------------------------------------------------------------------------- 
        //
        // Private methods.
        // In all cases, 'this' must be set to this view instance.
        //

        // Gets the HTML for the Layouts select element.  The value for each option is the index into
        // the this.layouts collection.
        _getLayoutsSelectHtml: function () {
            return this.layouts.reduce(function (memo, layout, index) {
                return memo +
                    "<option value='" + index + "'>" + layout.get("name") + "</option>";
            }, "");
        },

        // Must be called when the user selects a layout.
        _onLayoutSelected: function () {
            // Get the new currently selected measure layout.
            var value = this.elLayoutsSelect.val();
            this.currentLayout = this.layouts.at(value);

            // Re-display the currently selected category's measures, to show if they're included in the
            // newly-selected measure layout or not.
            this._onCategorySelected();

            // Ensure the Layout Action controls aren't visible.
            this._hideLayoutActionControls();
        },

        // Must be called when the user clicks on the action link to create a new layout.
        _onCreateLayout: function (e) {
            var thisView = this;

            e.preventDefault();

            setTimeout(function () {
                // Ensure the Layout Action controls aren't visible.
                thisView._hideLayoutActionControls();

                // If the user already has the maximum number of layouts...
                if (MeasureLayoutCollection.getMaxNumLayouts() === thisView.layouts.length) {
                    alert("You currently have the maximum allowed number of measure layouts.");
                    return;
                }

                // Set up the modal so that the user can create a new layout.
                thisView._setupLayoutActionControls("Name:", MeasureLayoutModel.getMaxLengthName(), "",
                    "Create", "Cancel");

                // When the user clicks to create a layout...
                thisView.elLayoutActionDoBtn.off("click").click(function () {
                    var layout,
                        layouts = thisView.layouts,
                        input = thisView.elLayoutActionInput,
                        select = thisView.elLayoutsSelect,
                        name = $.trim(input.val());

                    input.val(name);
                    if (!name) {
                        return;
                    }

                    // Validate.
                    if (!MeasureLayoutModel.validateName(name)) {
                        alert("Please use only alphanumeric, space, hyphen and underscore characters.");
                        return;
                    }

                    // Check it doesn't already exist.
                    layout = layouts.getLayout(name);
                    if (layout) {
                        alert("A layout with this name already exists.");
                        return;
                    }

                    // Create, add, display, select.  (The Layout Action controls will be hidden automatically.)
                    layout = new MeasureLayoutModel({ name: name });
                    layouts.add(layout);
                    select.html(thisView._getLayoutsSelectHtml());
                    select.val(layouts.indexOf(layout).toString());
                    select.focus();
                    thisView._onLayoutSelected();
                });
            }, 100);
        },

        // Must be called when the user clicks on the action link to export the current layout.
        _onExportLayout: function (e) {
            var thisView = this;

            e.preventDefault();

            setTimeout(function () {
                var csv = thisView.currentLayout.getMeasureIdsAsCsv();

                // Ensure the Layout Action controls aren't visible.
                thisView._hideLayoutActionControls();

                // If no measures are included in the current layout...
                if (!csv) {
                    alert("No measures are selected for this layout, so there is nothing to export.");
                    return;
                }

                // Set up the modal so that the user can copy the CSV to the Clipboard.
                thisView._setupLayoutActionControls("Copy:", null, csv, "Info", "Close");

                // When the user clicks on the "Info" button...
                thisView.elLayoutActionDoBtn.off("click").click(function () {
                    alert("Select the displayed text, and copy it to the Clipboard manually (e.g. Ctrl+C).  " +
                        "It can then be imported into a different layout.");
                    thisView.elLayoutActionInput.focus();
                });
            }, 100);
        },

        // Must be called when the user clicks on the action link to import into the current layout.
        _onImportLayout: function (e) {
            var thisView = this;

            e.preventDefault();

            setTimeout(function () {
                // Ensure the Layout Action controls aren't visible.
                thisView._hideLayoutActionControls();

                // Set up the modal so that the user can type/paste in CSV text, and then import.
                thisView._setupLayoutActionControls("Paste:", null, "", "Import", "Cancel");

                // When the user clicks on the "Import" button...
                thisView.elLayoutActionDoBtn.off("click").click(function () {
                    var numImported,
                        input = thisView.elLayoutActionInput,
                        csv = $.trim(input.val());

                    input.val(csv);
                    if (!csv) {
                        return;
                    }

                    // Import.
                    numImported = thisView.currentLayout.addMeasureIdsFromCsv(csv, thisView.allMeasuresIds);

                    thisView._hideLayoutActionControls();

                    if (numImported === 0) {
                        alert("No new measures were added to the current layout.");
                        return;
                    }

                    // Re-display the currently selected category's measures.
                    thisView._onCategorySelected();

                    alert(numImported.toString() + " measures were added to the current layout.");
                });
            }, 100);
        },

        // Must be called when the user clicks on the action link to reset the current layout.
        _onResetLayout: function (e) {
            var thisView = this;

            e.preventDefault();

            setTimeout(function () {
                var ans;

                // Ensure the Layout Action controls aren't visible.
                thisView._hideLayoutActionControls();

                // Prompt the user to reset.
                ans = confirm("Remove all measures from the current layout?");
                if (ans === true) {
                    thisView.currentLayout.removeAllMeasures();
                    thisView._onCategorySelected();  //  re-display the currently selected category's measures
                }
            }, 100);
        },

        // Must be called when the user clicks on the action link to delete the current layout.
        _onDeleteLayout: function (e) {
            var thisView = this;

            e.preventDefault();

            setTimeout(function () {
                var ans, index,
                    select = thisView.elLayoutsSelect,
                    layouts = thisView.layouts;

                // Ensure the Layout Action controls aren't visible.
                thisView._hideLayoutActionControls();

                // Some layouts can't be deleted.
                if (thisView.currentLayout.get("canDelete") !== true) {
                    alert("The current layout cannot be deleted.");
                    return;
                }

                // Prompt the user to delete.
                ans = confirm("Really delete the current layout?");
                if (ans === true) {
                    // Remove, re-display, and select the next layout in the collection.
                    index = layouts.indexOf(thisView.currentLayout);
                    layouts.remove(thisView.currentLayout);
                    if (index >= layouts.length) {
                        index = layouts.length - 1;
                    }
                    thisView.currentLayout = layouts.at(index);
                    select.html(thisView._getLayoutsSelectHtml());
                    select.val(index.toString());
                    select.focus();
                    thisView._onLayoutSelected();
                }
            }, 100);
        },

        // Can be called when the user presses a key when the Layout Action's input control has the input focus.
        _onLayoutActionInputKeypress: function (e) {
            // If the user hit the Enter key, prevent the default (whatever that might be) and instead trigger
            // a click on the 'Do' button (which might be set up to be the "Create" button).
            if (e.which === 13) {
                e.preventDefault();
                this.elLayoutActionDoBtn.click();
            }
        },

        // Can be called when the user presses and releases a key when the Layout Action's input control has
        // the input focus.
        _onLayoutActionInputKeyUp: function (e) {
            // If the user hit the Esc key, prevent the default and then propagation (which would close the modal),
            // and instead hide the Layout Action controls.  (Getting the Esc key is better done on keyup rather
            // than keypress.)
            if (e.which === 27) {
                e.preventDefault();
                e.stopPropagation();
                this._hideLayoutActionControls();

                // Ensure another control has focus, otherwise further Esc keyups might be swallowed by this
                // event handler.
                this.elCategoriesSelect.focus();   
            }
        },

        // Can be called when the Layout Action's input control gets the input focus.
        _onLayoutActionInputGetFocus: function () {
            this.elLayoutActionInput.select();
        },

        // Sets up the Layout Action controls with the specified values, and then shows the controls.
        _setupLayoutActionControls: function (labelText, inputMaxLength, inputValue, doBtnText, cancelBtnText) {
            // Set up the controls.
            this.elLayoutActionLabel.html(labelText);
            if (inputMaxLength) {
                this.elLayoutActionInput.attr("maxlength", inputMaxLength);
            } else {
                this.elLayoutActionInput.removeAttr("maxlength");
            }
            this.elLayoutActionInput.val(inputValue ? inputValue : "");
            this.elLayoutActionDoBtn.html(doBtnText);
            this.elLayoutActionCancelBtn.html(cancelBtnText);

            // Show the controls, and give the <input> the input focus.
            this.elLayoutActionCntr.removeClass("invisible");
            this.layoutActionCntrVisible = true;
            this.elLayoutActionInput.focus();
        },

        // Hides Layout Action controls, if currently visible.
        _hideLayoutActionControls: function () {
            if (this.layoutActionCntrVisible) {
                this.elLayoutActionCntr.addClass("invisible");
                this.layoutActionCntrVisible = false;
            }
        },

        // Gets the HTML for the Categories select element.
        _getCategoriesSelectHtml: function () {
            return _.reduce(this.categories, function (memo, category, index) {
                return memo +
                    "<option value='" + index + "'>" + category + "</option>";
            }, "");
        },

        // Must be called when the user selects a category.  Can also be called when the view is rendered,
        // or when the user selects a new layout.
        _onCategorySelected: function () {
            // Display the measures for the selected category.
            var value = this.elCategoriesSelect.val();
            this.elMeasuresCntr.html(this._getMeasuresHtml(this.categories[value]));
            this._updateMeasuresSelectionInfo();

            // Ensure the Layout Action controls aren't visible.
            this._hideLayoutActionControls();
        },

        // Must be called when the user clicks on the measures container, or one of its contained controls
        // (i.e. a measure's checkbox).
        _onMeasuresClick: function (e) {
            var elTarget = $(e.target),
                measureId = elTarget.attr("data-measure-id"),
                measureIdsInLayout = this.currentLayout.get("measureIds");

            // Ensure the Layout Action controls aren't visible.
            this._hideLayoutActionControls();

            // If a measure's checkbox was checked/unchecked, record its current state in the currently selected
            // measure layout.  Then update the displayed selection count.
            if (measureId) {
                measureIdsInLayout[measureId] = elTarget.prop("checked") ? true : false;
                this.currentLayout.set("measuresChanged", true);  // notify the model that we changed it indirectly
                this._updateMeasuresSelectionInfo();
            }
        },

        // Must be called when the user clicks on the button to select all the currently visible measures.
        _onSelectAllClick: function () {
            this._selectAllMeasures(true);
        },

        // Must be called when the user clicks on the button to deselect all the currently visible measures.
        _onSelectNoneClick: function () {
            this._selectAllMeasures(false);
        },

        // Implementation for the two methods above; 'select' must be either true or false.
        _selectAllMeasures: function (select) {
            // Select/deselect all.
            var measureIdsInLayout = this.currentLayout.get("measureIds");
            this.elMeasuresCntr.find("input").each(function () {
                $(this).prop("checked", select);
                measureIdsInLayout[$(this).attr("data-measure-id")] = select;
            });
            this.currentLayout.set("measuresChanged", true);  // notify the model that we changed it indirectly
            this._updateMeasuresSelectionInfo();

            // Ensure the Layout Action controls aren't visible.
            this._hideLayoutActionControls();
        },

        // Gets the HTML for the Measures' container element, listing only those measures that belong to the
        // specified category.  The currently selected measure layout will be used to determine the
        // checked/unchecked state of each measure.
        _getMeasuresHtml: function (category) {
            var measures, measureIdsInLayout,
                checkBoxChecked = "checked='checked'",
                indicateCompoundable = this.options.indicateCompoundableMeasures;

            if (!category) {
                return "";
            }

            // Get the current layout's measure ids hash.  A measure is included in the layout if the value
            // stored against its id is true.
            measureIdsInLayout = this.currentLayout.get("measureIds");

            // Cached?
            measures = this.measuresPerCategory[category];
            if (!measures) {
                // Filter all measures by category, then cache.
                measures = _.filter(this.allMeasures, function (measure) {
                    return measure.category === category;
                });
                this.measuresPerCategory[category] = measures;
            }

            // Function to get the is-compoundable indicator (a string) for the specified measure.
            // Returns the empty string if there is no such indicator.
            function getCompoundableIndicator(measure) {
                if (indicateCompoundable && measure.compoundable) {
                    return " *";
                } else {
                    return "";
                }
            }

            // Reduce to HTML representing checkboxes.
            return _.reduce(measures, function (memo, measure) {
                var check = (measureIdsInLayout[measure.id] === true) ? checkBoxChecked : "";

                return memo +
                    "<label class='checkbox'>" +
                    "<input data-measure-id='" + measure.id + "' type='checkbox' " + check + "/>" +
                    this._getMeasureDisplayName(measure.name) + getCompoundableIndicator(measure) +
                    "</label>";
            }, "", this);
        },

        // Gets the full display name of a measure by replacing well-known text substitution parts in the specified
        // measure name with the portfolio analysis's currency and statistics frequency.
        _getMeasureDisplayName: function (measureName) {
            return MeasureModel.getMeasureDisplayName(measureName, this.currency, this.statsFrequency);
        },

        // Updates the element that says how many measures are currently displayed in the measures container, and
        // how many of them are currently selected (i.e. checked for inclusion in the currently selected measures
        // layout).  Call this method on initial render, when a different layout is selected, when a different
        // measures' category is selected, and when the user check/unchecks a measure's checkbox.
        _updateMeasuresSelectionInfo: function () {
            var measures,
                selected = 0,
                templ = "{0} measures; {1} selected";

            measures = this.elMeasuresCntr.find("input").each(function () {
                selected = selected + ($(this).prop("checked") ? 1 : 0);
            });

            this.elMeasuresSelectionInfo.html(templ.replace("{0}", measures.length.toString())
                                                   .replace("{1}", selected.toString()));
        }
    });

    return SelectMeasuresModalView;
});
