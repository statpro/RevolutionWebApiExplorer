/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/jQuery",
    "Instances/WebApiData",
    "Components/PagedTable"
],
function (Backbone, $, webApiData, PagedTable) {
    "use strict";

    // Portfolios Grid view.
    var PortfoliosGridView = Backbone.View.extend({
        // specify instance of TabsView when creating, as the 'tabsView' option (accessed thru this.options.tabsView)
        el: $("#portfoliosGridView"),
        model: null,                   // specify instance of PortfoliosInfoModel when creating
        tagName: "div",
        tableColumns: ["name", "code", "owner", "id", "analysisBtn"],
        pagedTable: null,
        searchText: "",
        initialize: function () {
            this.listenTo(webApiData, "change:isUserLoggedOn", this.render);
            this.listenTo(this.model, "firstLoad", this.render); // render when portfolios are first loaded after logon
        },
        render: function () {
            var portfolios;

            // If not yet created, create the portfolios' Paged Table.
            if (!this.pagedTable) {
                this.pagedTable = new PagedTable({
                    tableId: "portfoliosPagedTable",
                    columns: this.tableColumns,
                    numRows: this.model.get("pageSize"),
                    loadFn: $.proxy(this._loadTablePortfolios, this),
                    searchTextValidationFn: this._searchTextValidation,
                    title: "Portfolios",
                    items: "portfolios"
                });
                this.pagedTable.create();
            }

            // If the user is logged on and we have a PortfoliosInfoModel model that contains zero or more
            // portfolios, then load the portfolios' Paged Table with the first page (or an empty 'page').
            if ((webApiData.get("isUserLoggedOn") === true) && this.model) {
                portfolios = this.model.get("portfolios");
                if (portfolios) {
                    // The portfolios tab should be visible when this happens (especially on the first render).
                    this.options.tabsView.goToTab("portfolios");

                    // Tell the table to load the first page of portfolios.
                    this.pagedTable.load();

                    return this;
                }
            }

            // The default case (e.g. if user not logged on) is to clear the Paged Table.
            this.pagedTable.clear();

            return this;
        },

        // Called when the user clicks on a "View" button to view the default analysis for the specified portfolio
        // (which is currently displayed in the grid).
        viewAnalysis: function (portfolioId) {
            var info = this.model,
                portfolios, portfolio;

            // Check the arg, and check that our model has porfolios loaded.
            if (!portfolioId || !info) {
                return;
            }
            portfolios = info.get("portfolios");
            if (!portfolios) {
                return;
            }

            // Find the specified portfolio.
            portfolio = portfolios.find(function (p) { return p.get("id") === portfolioId; });
            if (!portfolio) {
                return;
            }

            // Load the current-analysis model with the default analysis data of the specified portfolio.
            webApiData.get("analysis").load(portfolio.get("defaultAnalysisHref"));
        },

        // Private
        // Validates the search text that the user enters in the portfolios' Paged Table.
        // Note: before calling, the caller should trim the text of leading and trailing whitespace.
        _searchTextValidation: function (text) {
            // We use the user's search text like this:-
            //        startswith(Name,'user text')
            // Ergo we don't allow single-quote characters, and remove them.

            if (!text) { return ""; }
            
            // Remove single quotes; then trim again in case doing so reveals leading/trailing whitespace.
            return $.trim(text.split("'").join(""));
        },

        // Private
        // Called by the portfolios' Paged Table to load a page of portfolios.
        // 'requestedPageNumber' is the 1-based page number.
        // 'searchText' = user-entered search text to apply to this load (if a new search is begun, the caller is
        // expected to set the requested page number to 1).
        // 'callback' must be called with an object describing the data, once the page has been loaded.  See
        // the Paged Table component's script for full details of this object.
        _loadTablePortfolios: function (requestedPageNumber, searchText, callback) {
            var info = this.model,
                isPaged = info.get("isPaged"),
                totalCount, pageSize, pageNumber, pageCount, data, start, end;


            // If new search text has been specified, then remove all the portfolios from the Portfolios Info
            // model, and start again with a new search for portfolios at page 1.  In this case this method
            // will NOT invoke the 'callback' function.  Instead the Portfolios Info model will raise the 'firstLoad'
            // event when portfolios are loaded, will which cause our 'render' method (see above) to render the
            // portfolios anew.
            if (!searchText) { searchText = ""; }
            if (this.searchText !== searchText) {
                this.searchText = searchText;
                info.removePortfolios();
                info.getPage(1, searchText);
                return;
            }


            // From here on... the currently-loaded portfolios haven't been invalidated by new search text.
            // So we load up either portfolios that are already loaded (the non-paged scenario), or we invoke
            // our model's 'getPage' method to load up a new page (paged scenario).


            /* Non-paged scenario. */

            if (!isPaged) {
                data = info.get("portfolios").getDataForPagedTable();

                if (data.length === 0) {
                    callback({
                        data: [],
                        start: 0,
                        end: 0,
                        count: 0,
                        pages: 0,
                        page: 0
                    });
                } else {
                    callback({
                        data: data,
                        start: 1,
                        end: data.length,
                        count: data.length,
                        pages: 1,
                        page: 1
                    });
                }

                return;
            }


            /* Paged scenario. */

            // Ensure that the requested page of portfolios is loaded from the Web API.  When successful...
            info.getPage(requestedPageNumber, searchText, function () {
                // Get the currently loaded portfolios as an array of data that's suitable for the Paged Table.
                // Note the assumption here that the number of currently loaded portfolios always equals the
                // grid page size (except on the last page).
                data = info.get("portfolios").getDataForPagedTable();

                // Get paging information.
                totalCount = info.get("filteredCount");
                pageSize = info.get("pageSize");
                pageNumber = info.get("pageNumber");
                pageCount = info.get("pageCount");

                // Compute the portfolios' 1-based start and end numbers.
                start = ((pageNumber - 1) * pageSize) + 1;
                end = start + data.length - 1;

                // Provide information to the paged table.
                callback({
                    data: data,
                    start: start,
                    end: end,
                    count: totalCount,
                    pages: pageCount,
                    page: pageNumber
                });
            },
            this);
        }
    });

    return PortfoliosGridView;
});
