/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Instances/RevWebApi",
    "Helpers/GetWebApiResource",
    "Helpers/Functions",
    "Models/MeasureModel",
    "Views/ExportCulturesSelectView"
],
function (Backbone, _, $, webApiData, revWebApi, getWebApiResource, helperFns, MeasureModel,
    ExportCulturesSelectView) {
    "use strict";

    // Segments Tree Results view.
    var SegmentsTreeResultsView = Backbone.View.extend({
        // specify instance of AnalysisModel when creating, as the 'analysisModel' option
        // specify instance of MeasuresInfoModel when creating, as the 'allSegmentsTreeMeasures' option
        el: $("#segmentsTreeResults"),
        model: null,                     // specify instance of SegmentsTreeResultsModel when creating
        exportCulturesSelectView: null,  // our contained Export Cultures Select view
        tagName: "div",
        currentNode: null,               // instance of SegmentsTreeNodeModel
        breadcrumbData: [],              // each item has 'text' and 'node' properties
        elExportCntr: null,
        elBreadcrumbBar: null,
        elTableCntr: null,
        segmentsTreeResultsTableTemplate: _.template($("#segmentsTreeResultsTableTemplate").html()),

        events: {
            "click #segmentsTreeResultsBreadcrumb": "_onBreadcrumbBarClicked"
        },

        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "change", this.render);

            this.elExportCntr = this.$("#segmentsTreeResultsExportCntr");
            this.elBreadcrumbBar = this.$("#segmentsTreeResultsBreadcrumb");
            this.elTableCntr = this.$("#segmentsTreeResultsTableCntr");
        },

        render: function () {
            var results,
                exportCultures = webApiData.get("exportCultures");

            // If the user isn't logged on...
            if (webApiData.get("isUserLoggedOn") === false) {
                this.clear();
                return this;
            }

            // If no segments tree results have been loaded into our model...
            if (!this.model.get("rootHref")) {
                this.clear();
                return this;
            }

            // Generate and write out the HTML for the CSV Export controls.
            this.elExportCntr.html(this._getCsvExportHtml(exportCultures));

            // Wire up an event handler for when the "Export as CSV" button is clicked.
            this.$("#exportSegmentsTreeNodeCsvBtn").off("click").click($.proxy(this._exportAsCsv, this));

            // If the server has provided one or more export cultures, create and render the view that represents the
            // select element that allows the user to choose the export culture.
            if (exportCultures && exportCultures.length > 0) {
                this.exportCulturesSelectView = new ExportCulturesSelectView({
                    el: this.$("#exportSegmentsTreeNodeCsvCultureSelect")
                });
                this.exportCulturesSelectView.render();
            }

            // If there is no current node, start with the root node (equates to the "TOTAL" segment).
            if (!this.currentNode) {
                this.currentNode = this.model.getRootNode();
                this.breadcrumbData = [];
                this._addNodeToBreadcrumb("TOTAL", this.currentNode);
            }

            // Generate and write out the HTML for the results table.
            results = this._getTabularResults();
            this.elTableCntr.html(this.segmentsTreeResultsTableTemplate({
                title: this._getTableTitle(),
                header: results[0],
                tooltips: results[1],
                segment: results[2],
                children: _.rest(results, 3)
            }));

            // Fix for IE9 table rendering bug.
            // http://blog.endpoint.com/2013/02/ghost-table-cells-in-ie9.html
            this.elTableCntr.html(function (i, el) {
                return el.replace(/>\s*</g, '><');
            });

            // Enable the tooltips in the results table.
            this.$('#segmentsTreeResultsTable').tooltip({
                selector: "[data-toggle=tooltip]"
            });

            // Disable the tooltips' links.
            this.$("#segmentsTreeResultsTable thead [href=#]").off("click").click(function (e) {
                e.preventDefault();
            });

            // When the user clicks on a link in the table body...
            this.$("#segmentsTreeResultsTable tbody [href=#]").off("click").click(
                $.proxy(this._onTableBodyLinkClick, this)
            );

            // After rendering, scroll down so that the user can view the results.
            setTimeout(function () {
                $('html, body').animate({
                    scrollTop: $("#segmentsTreeResults").offset().top
                }, 500);
            }, 500);

            return this;
        },

        // Clears the view of data.
        clear: function () {
            this.currentNode = null;
            this.breadcrumbData = [];
            this.elExportCntr.html("");
            this.elBreadcrumbBar.html("");
            this.elTableCntr.html("");
        },

        // --------------------------------------------------------------------------------------------- 
        //
        // Private methods.
        // In all cases, 'this' must be set to this view instance.
        //


        // Returns the HTML that contains controls for exporting the current segments tree node as CSV.
        _getCsvExportHtml: function (exportCultures) {
            var exportHtml;

            if (exportCultures && exportCultures.length > 0) {
                exportHtml = "<form class='form-inline'>" +
                    "<button id='exportSegmentsTreeNodeCsvBtn' class='btn btn-primary' type='button'>Export as CSV</button> " +
                    "<label for='exportSegmentsTreeNodeCsvCultureSelect'>Export culture:</label> " +
                    "<select id='exportSegmentsTreeNodeCsvCultureSelect' name='exportCulture'></select>" +
                    "</form>";
            } else {
                exportHtml = "<p><button id='exportSegmentsTreeNodeCsvBtn' class='btn btn-primary' type='button'>Export as CSV</button>";
            }

            return exportHtml;
        },

        // Appends a new item to the breadcrumb data and breadcrumb bar.
        _addNodeToBreadcrumb: function (text, node) {
            if (node) {
                this.breadcrumbData.push({ text: text || "", node: node });
                this._redisplayBreadcrumbBar();
            }
        },

        // Re-displays the breadcrumb bar, based on the current contents of 'this.breadcrumbData'.
        _redisplayBreadcrumbBar: function () {
            var list,
                data = this.breadcrumbData,
                numItems = data.length;

            list = _.reduce(data, function (memo, item, index) {
                var text = _.escape(item.text);
                if (index === (numItems - 1)) {
                    return memo + "<li class='active'>" + text + "</li>";
                } else {
                    return memo + "<li><a href='#' data-breadcrumb-idx='" + index + "'>" + text +
                        "</a> <span class='divider'>/</span></li>";
                }
            }, "");

            this.elBreadcrumbBar.html(list);
        },

        // Must be called when the user clicks on the breadcrumb bar.
        _onBreadcrumbBarClicked: function (e) {
            var index, node,
                breadcrumbIndex = $(e.target).attr("data-breadcrumb-idx");

            e.preventDefault();

            if (!breadcrumbIndex) {
                return;
            }

            // Get a reference to the clicked-on node.
            index = parseInt(breadcrumbIndex, 10);
            node = this.breadcrumbData[index].node;

            // Display this node (it should already be loaded into memory), and adjust the breadcrumb data and bar
            // accordingly.
            this.model.loadNode(node.getHref(), function (node) {
                this.breadcrumbData = _.first(this.breadcrumbData, index + 1);
                this._redisplayBreadcrumbBar();
                this.currentNode = node;
                this.render();
            }, this);
        },

        // Must be called when the user clicks on a link in the table body.  (We expect this to be a link that
        // decorates the name of a child segment, and which drills down to the next level in the tree.)
        _onTableBodyLinkClick: function (e) {
            var index, children, href, classifier,
                childSegmentIndex = $(e.target).attr("data-childsegment-idx");

            e.preventDefault();

            if (!childSegmentIndex) {
                return;
            }

            // Get the href of the segments tree node resource for the clicked-on child segment.
            index = parseInt(childSegmentIndex, 10);
            children = this.currentNode.getChildrenObjects();
            href = children[index].links.self.href;

            // The child segments' classifier for the current node is what we display in the breadcrumb to
            // represent the next level down.
            classifier = this.currentNode.getChildSegmentsClassifier();

            // Load this node.  When loaded (or retrieved from the nodes collection if already loaded), re-render
            // this view with the new node set as the current node.
            this.model.loadNode(href, function (node) {
                this.currentNode = node;
                this._addNodeToBreadcrumb(classifier, node);
                this.render();
            }, this);
        },

        // Gets the title of the results table.
        _getTableTitle: function () {
            var title = this.currentNode.getSegmentName() + " segment",
                childItems = this._getTableChildItemsText();

            if (childItems) {
                return title += " and " + childItems;
            } else {
                return title;
            }
        },

        // Gets text saying what the current node's child items are; will be one of the following, and depends
        // on the node's contents:-
        //    ""
        //    "child segments"
        //    "securities"
        _getTableChildItemsText: function () {
            if (this.currentNode.hasChildSegments()) {
                return "child segments";
            } else if (this.currentNode.hasSecurities()) {
                return "securities";
            } else {
                return "";
            }
        },

        // Returns the current node's results data (segment + children + time periods + measure values) as an
        // N * M table or matrix (actually an array of arrays) that is suitable for display in an HTML table.
        // More specifically, the method returns an array of N items where:-
        //    - each item is an array of strings
        //    - all items have the same length
        //    - the first item contains the column headers (without the <th></th> tags)
        //    - the second item contains the column headers' tooltip text
        //    - the third item contains data about the node's segment (without the <td></td> tags)
        //    - subsequent items (if any) contain data about the node's children (ditto)
        //    - all of the node's measures and all of the node's time periods are included in the returned
        //      array.
        // This method ensures that all display data is correctly escaped (HTML-encoded).
        _getTabularResults: function () {
            var row,
                results = [],
                cn = this.currentNode,
                segmentName = cn.getSegmentName(),
                segmentMeasures = cn.getSegmentMeasures() || [],
                children = cn.getChildrenObjects() || [],
                allTimePeriodCodes = cn.getAllTimePeriods(),
                allMeasureIds = cn.getAllMeasureIds(),
                analysis = this.options.analysisModel,
                currency = analysis.get("currency"),
                statsFrequency = analysis.get("statsFrequency");

            // Add the column headers (= name; all measures * all time periods).
            // e.g. "Name", "Rp - 1Y", "Rp - 2Y", "Wb - 1Y", "Wb - 2Y"
            row = ["Name"];
            _.each(allMeasureIds, function (mid) {
                _.each(allTimePeriodCodes, function (tp) {
                    row.push(_.escape(mid) + "&nbsp;-&nbsp;" + _.escape(tp));
                });
            });
            results.push(row);

            // Add the column headers' tooltip text.
            row = [""];
            _.each(allMeasureIds, function (mid) {
                _.each(allTimePeriodCodes, function (tp) {
                    row.push(_.escape(MeasureModel.getMeasureDisplayName(
                        this.options.allSegmentsTreeMeasures.getMeasureName(mid), currency, statsFrequency) +
                        " - " +
                        analysis.getTimePeriodName(tp)));
                }, this);
            }, this);
            results.push(row);

            // Add the segment's data.
            row = [_.escape(segmentName).split(' ').join('&nbsp;')];
            _.each(allMeasureIds, function (mid) {
                _.each(allTimePeriodCodes, function (tp) {
                    row.push(_.escape(this._getMeasureValueAsText(segmentMeasures, mid, tp)));
                }, this);
            }, this);
            results.push(row);

            // Add the children's data.
            _.each(children, function (child, index) {
                var name = _.escape(child.name).split(' ').join('&nbsp;');

                if (child.links) {
                    row = ["<a href='#' data-childsegment-idx='" + index + "'>" + name + "</a>"];
                } else {
                    row = [name];
                }

                _.each(allMeasureIds, function (mid) {
                    _.each(allTimePeriodCodes, function (tp) {
                        if (!child.measures) {
                            row.push("");
                        } else {
                            row.push(_.escape(this._getMeasureValueAsText(child.measures, mid, tp)));
                        }
                    }, this);
                }, this);

                results.push(row);
            }, this);

            return results;
        },

        // Gets a measure value in string form.  The desired value is specified by measure id and
        // time period code, and exists in the specified measures array.
        //
        // Args:-
        // 'measures' must be an array that contains objects with the following properties:-
        //    tp       - time period code (e.g. "3M")
        //    measures - array of measure objects that contain the following properties:-
        //          id    - the measure's identifier, e.g. "Rp"
        //          ty    - the measure's type: "r" (real number), "i" (integer), "s" (string)
        //          val   - the measure's value (may be null)
        // 'id' - the measure's identifier
        // 'tp' - the measure's time period code
        //
        // Returns the specified measure's value in string form - or the empty string if not found,
        // or if the value is null.  Note that comparison of the measure identifier and time period code
        // is done case sensitively.  If the value is a real number, then it's returned as a string with
        // five decimal places.
        //
        _getMeasureValueAsText: function (measures, id, tp) {
            var measureObj, measure;

            measureObj = _.find(measures, function (m) { return m.tp === tp; });
            if (!measureObj) { return ""; }

            measure = _.find(measureObj.measures, function (m) { return m.id === id; });
            if (!measure) { return ""; }
            if (measure.val === null) { return ""; }
            if (measure.ty === "r") { return measure.val.toFixed(5); }
            return measure.val.toString();
        },

        // Call this method when the user clicks on the button to export the current Segments Tree Node as CSV.
        _exportAsCsv: function () {
            var exportUri = revWebApi.actionUris.exportSegmentsTreeNodeAsCsv,
                analysis = webApiData.get("analysis"),
                portfolioName = analysis.get("name"),
                resultsTimestamp = analysis.get("resultsTimestamp"),
                currency = analysis.get("currency"),
                statsFrequency = analysis.get("statsFrequency"),
                culture;

            // Must have a current node.
            if (!this.currentNode) {
                return;
            }

            // Get the currently-selected export culture name.
            if (this.exportCulturesSelectView) {
                culture = this.exportCulturesSelectView.getSelectedCultureName();
            } else {
                culture = "EN-US";
            }

            // Tell the server to re-get the current Segments Tree Node, but this time cache in session state.
            // When successful, issue a GET to the Export Segments Tree Node As CSV endpoint, specifying the returned
            // cached resource id.  The server will respond with a CSV file download (+ will remove the cached
            // resource from session state).
            //
            // NOTE: ASP.NET does not allow colons in the path of a URI, even encoded as %3A.  So we replace the
            // colons with spaces.
            //
            getWebApiResource(this.currentNode.getHref(), function (data) {
                var uri = exportUri.replace("{cachedResourceId}", encodeURIComponent(data.cachedResourceId));
                uri = uri.replace("{portfolioName}", encodeURIComponent(helperFns.base64EncodeString(portfolioName)));
                uri = uri.replace("{resultsTimestamp}", encodeURIComponent(resultsTimestamp.split(':').join(' ')));
                uri = uri.replace("{currency}", encodeURIComponent(currency));
                uri = uri.replace("{statsFrequency}", encodeURIComponent(statsFrequency));
                uri = uri.replace("{culture}", encodeURIComponent(culture));
                window.location.href = uri;
            },
            this,   // scope
            false,  // don't ignore error status (i.e. report errors to the user)
            true);  // cache resource in session state
        }
    });

    return SegmentsTreeResultsView;
});
