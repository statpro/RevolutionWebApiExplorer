/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Models/MeasureLayoutModel",
    "Collections/MeasureLayoutCollection"
],
function (Backbone, _, $, MeasureLayoutModel, MeasureLayoutCollection) {
    "use strict";

    // Locally Stored Data model.  Contains user data that is persisted to the user's local machine, either via
    // HTML 5's Local Storage, or via IE's userData mechanism.
    //
    // jStorage - https://github.com/andris9/jStorage
    //
    var LocallyStoredDataModel = Backbone.Model.extend({
        defaults: function () {
            return {
                exportCultureName: "",                    // e.g. "en-US"; empty if not yet set
                segmentsTreeMeasureLayoutName: "",
                segmentsTreeMeasureLayouts: null,         // instance of MeasureLayoutCollection
                timeSeriesMeasureLayoutName: "",
                timeSeriesMeasureLayouts: null            // instance of MeasureLayoutCollection
            };
        },

        initialize: function () {
            this.listenTo(this, "change:exportCultureName", this._writeExportCultureName);
            this.listenTo(this, "change:segmentsTreeMeasureLayoutName", this._writeSegmentsTreeLayoutName);
            this.listenTo(this, "change:timeSeriesMeasureLayoutName", this._writeTimeSeriesLayoutName);
        },

        // Explicitly loads all locally-stored data that the website uses into this model instance.
        // After this, data can be read from and written to the model's attributes as per normal.  Changes
        // to attributes are detected (with the exception of the Segments Tree and Time Series Measure
        // Layouts collections), and cause automatic saves to Local Storage.
        // Call this method once at app startup.
        load: function () {
            this._readExportCultureName();
            this._readSegmentsTreeLayoutName();
            this._readSegmentsTreeMeasureLayouts();
            this._readTimeSeriesLayoutName();
            this._readTimeSeriesMeasureLayouts();
        },

        // Writes either the specified Segments Tree measure layout or, if 'layout' is null/undefined, all
        // Segments Tree measure layouts (i.e. this model's "segmentsTreeMeasureLayouts" attribute) to
        // Local Storage.  Specify 'layout' as null if the collection has been modified (additions/removals).
        // Specify a particular layout for writing only if a) it's already been written to Local Storage and b)
        // it's only had its measures modified (i.e. which measures are included in the layout has changed).
        writeSegmentsTreeMeasureLayouts: function (layout) {
            if (layout) {
                this._writeSegmentsTreeMeasureLayout(layout, true);
            } else {
                this._removeAllSegmentsTreeMeasureLayouts();
                this.get("segmentsTreeMeasureLayouts").each(function (layout) {
                    this._writeSegmentsTreeMeasureLayout(layout, false);
                }, this);
            }
        },

        // Writes either the specified Time Series measure layout or, if 'layout' is null/undefined, all
        // Time Series measure layouts (i.e. this model's "timeSeriesMeasureLayouts" attribute) to
        // Local Storage.  Specify 'layout' as null if the collection has been modified (additions/removals).
        // Specify a particular layout for writing only if a) it's already been written to Local Storage and b)
        // it's only had its measures modified (i.e. which measures are included in the layout has changed).
        writeTimeSeriesMeasureLayouts: function (layout) {
            if (layout) {
                this._writeTimeSeriesMeasureLayout(layout, true);
            } else {
                this._removeAllTimeSeriesMeasureLayouts();
                this.get("timeSeriesMeasureLayouts").each(function (layout) {
                    this._writeTimeSeriesMeasureLayout(layout, false);
                }, this);
            }
        },

        // --------------------------------------------------------------------------------------------------------

        // Private.
        // Removes all Segments Tree measure layouts from Local Storage (but not from the 'segmentsTreeMeasureLayouts'
        // attribute).
        _removeAllSegmentsTreeMeasureLayouts: function () {
            _.each($.jStorage.index(), function (key) {
                if (key.indexOf("STML_") === 0) {
                    $.jStorage.deleteKey(key);
                }
            });
        },

        // Private.
        // Removes all Time Series measure layouts from Local Storage (but not from the 'timeSeriesMeasureLayouts'
        // attribute).
        _removeAllTimeSeriesMeasureLayouts: function () {
            _.each($.jStorage.index(), function (key) {
                if (key.indexOf("TS2ML_") === 0) {
                    $.jStorage.deleteKey(key);
                }
            });
        },

        // Private.
        // Writes the specified Segments Tree measure layout to Local Storage.  If 'mustExist' is true, but the layout
        // doesn't already exist in Local Storage, an exception is thrown.
        _writeSegmentsTreeMeasureLayout: function (layout, mustExist) {
            this._writeMeasureLayout("STML_", layout, mustExist);
        },

        // Private.
        // Writes the specified Time Series measure layout to Local Storage.  If 'mustExist' is true, but the layout
        // doesn't already exist in Local Storage, an exception is thrown.
        _writeTimeSeriesMeasureLayout: function (layout, mustExist) {
            this._writeMeasureLayout("TS2ML_", layout, mustExist);
        },

        // Private.
        // Called by '_writeSegmentsTreeMeasureLayout' and '_writeTimeSeriesMeasureLayout' above to write a layout.
        // Can also be called by '_readMeasureLayouts' below.
        _writeMeasureLayout: function (prefix, layout, mustExist) {
            var name, value;

            if (!layout) {
                return;
            }

            name = layout.get("name");

            if (mustExist) {
                value = $.jStorage.get(prefix + name, null);
                if (!value) {
                    throw "The contents of layout '" + name + "' can't be written to Local Storage " +
                          "because the layout hasn't been added to the stored collection of layouts.";
                }
            }

            value = {
                canDelete: layout.get("canDelete"),
                measureIds: layout.get("measureIds")
            };
            $.jStorage.set(prefix + name, value);
        },

        // Private.
        // Reads in all of the Segments Tree measure layouts from Local Storage.  Call at load time.
        // Ensures that the "Default" layout exists, is written to Local Storage, and that it can't be deleted
        // by the user.  Also ensures that no two layouts have the same name, that names are valid, and that
        // the maximum allowed number of layouts isn't exceeded.
        _readSegmentsTreeMeasureLayouts: function () {
            this.set("segmentsTreeMeasureLayouts", this._readMeasureLayouts("STML_"));
        },

        // Private.
        // Reads in all of the Time Series measure layouts from Local Storage.  Call at load time.
        // Ensures that the "Default" layout exists, is written to Local Storage, and that it can't be deleted
        // by the user.  Also ensures that no two layouts have the same name, that names are valid, and that
        // the maximum allowed number of layouts isn't exceeded.
        _readTimeSeriesMeasureLayouts: function () {
            this.set("timeSeriesMeasureLayouts", this._readMeasureLayouts("TS2ML_"));
        },

        // Private.
        // Called by '_readSegmentsTreeMeasureLayouts' and '_readTimeSeriesMeasureLayouts' above.
        _readMeasureLayouts: function (prefix) {
            var value, layout, measureIds, name, nameUpper,
                layouts = [],
                prefixLen = prefix.length,
                maxNumLayouts = MeasureLayoutCollection.getMaxNumLayouts();

            // Get the value that's stored for the "Default" layout.  If it doesn't exist, create it, add it,
            // and write it out to Local Storage.  If it does exist, validate its value and add it to the 'layouts'
            // array.  If the value is invalid, create a new one.
            value = $.jStorage.get(prefix + "Default", null);
            if (!value || !this._isStoredLayoutValid(value)) {
                measureIds = {};
            } else {
                measureIds = value.measureIds;
            }
            layout = new MeasureLayoutModel({
                name: "Default",
                canDelete: false,
                measureIds: measureIds
            });
            layouts.push(layout);
            this._writeMeasureLayout(prefix, layout, false);


            // Deal with the remaining layouts that may be stored in Local Storage.
            _.each($.jStorage.index(), function (key) {
                // Ignore if we've already got the maximum allowed number of layouts.
                if (layouts.length === maxNumLayouts) {
                    return;
                }

                // Ignore non-layout keys; ignore the "Default" layout (note that layout names are case-sensitive).
                if ((key.indexOf(prefix) !== 0) || (key.toUpperCase() === (prefix + "DEFAULT"))) {
                    return;
                }

                // Get the stored layout value.
                value = $.jStorage.get(key, null);

                // Ignore if the layout's value or name are invalid.
                if (!value || !this._isStoredLayoutValid(value, key, prefix)) {
                    return;
                }

                // Ignore if this layout's name isn't unique.
                name = key.slice(prefixLen);
                nameUpper = name.toUpperCase();
                layout = _.find(layouts, function (layout) {
                    return (layout.get("name").toUpperCase() === nameUpper);
                });
                if (layout) {
                    return;
                }

                // This one is ok.  Create a new model from the name and value, and add to the 'layouts' array.
                layout = new MeasureLayoutModel({
                    name: name,
                    canDelete: value.canDelete,
                    measureIds: value.measureIds
                });
                layouts.push(layout);
            }, this);


            // Create and return a new Measure Layouts collection, based on the 'layouts' array of models.
            return new MeasureLayoutCollection(layouts);
        },

        // Private.
        // Validates the specified stored layout value, which should be an object that contains a "canDelete"
        // boolean property and a "measureIds" hash.  Also validates the storage key, if specified, which
        // should be a string that starts with the specified prefix (e.g. "STML_") and ends with the name of
        // the layout (e.g. "STML_Default").
        // Returns true if valid, else false.
        _isStoredLayoutValid: function (value, key, prefix) {
            var name, prefixLen;

            if (value) {
                if (!_.has(value, "canDelete")) { return false; }
                if (!_.isBoolean(value.canDelete)) { return false; }
                if (!_.has(value, "measureIds")) { return false; }
                if (!_.isObject(value.measureIds)) { return false; }
                if (_.isArray(value.measureIds)) { return false; }
            }

            if (key) {
                prefixLen = prefix.length;
                if (key.indexOf(prefix) !== 0) { return false; }
                if (key.length === prefixLen) { return false; }
                name = key.slice(prefixLen);
                if (!MeasureLayoutModel.validateName(name)) { return false; }
            }

            return true;
        },

        // Private.
        // Writes/reads the export culture name to/from Local Storage.
        _writeExportCultureName: function () {
            $.jStorage.set("ExportCulture", this.get("exportCultureName"));
        },
        _readExportCultureName: function () {
            this.set("exportCultureName", $.jStorage.get("ExportCulture", ""), { silent: true });
        },

        // Private.
        // Writes/reads the Segments Tree layout name to/from Local Storage.
        _writeSegmentsTreeLayoutName: function () {
            $.jStorage.set("SegmentsTreeLayout", this.get("segmentsTreeMeasureLayoutName"));
        },
        _readSegmentsTreeLayoutName: function () {
            this.set("segmentsTreeMeasureLayoutName", $.jStorage.get("SegmentsTreeLayout", ""), { silent: true });
        },

        // Private.
        // Writes/reads the Time Series layout name to/from Local Storage.
        _writeTimeSeriesLayoutName: function () {
            $.jStorage.set("TimeSeriesLayout", this.get("timeSeriesMeasureLayoutName"));
        },
        _readTimeSeriesLayoutName: function () {
            this.set("timeSeriesMeasureLayoutName", $.jStorage.get("TimeSeriesLayout", ""), { silent: true });
        }
    });

    return LocallyStoredDataModel;
});
