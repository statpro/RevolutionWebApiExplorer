/* global define: false */

// The Paged Table - a cut down version of the FuelUX Datagrid (at v2.3.0) that solves some of the latter's problems,
// especially wrt the page selector dropdown/select control.  The Paged Table works with a pre-rendered table, whose
// columns at least must be already defined and labelled.  It has two-stage creation: instantiate; then call the
// 'create' method.  Afterwards call the 'load' method to load the first page.
// The Paged Table expects to find spans, buttons, inputs, selects with specific class names; see the 'create'
// method for details.

define([
    "LibRefs/Underscore",
    "LibRefs/jQuery"
],
function (_, $) {
    "use strict";

    // Constructor.
    //
    // The config object must contain the following:-
    //    {
    //        tableId: <identifier of the table to be controlled by this instance of PagedTable>
    //        columns: <array defining the columns; each item should be the name of the property in the objects
    //                  that supply that column with data>
    //        numRows: <number of rows in the table>
    //        loadFn:  <function to call to get a page of data; this function must take a 1-based page number, then
    //                  search text, then a function to call back when the requested page has been loaded.
    //                  Like with FuelUX datagrid, the callback takes an object in the following form:-
    //                      {
    //                          data: <array of row data>,
    //                          start: <number of the starting item in this page>,
    //                          end: <number of last item in this page>,
    //                          count: <total number of items across all pages>,
    //                          pages: <total number of pages>,
    //                          page: <1-based number of this page>
    //                      }>
    //        searchTextValidationFn: <the caller's search text validation function; takes user-entered search text,
    //                                 and returns a validated version>
    //        title: <title of the table, displayed in the header>
    //        items: <what items are displayed in the table, e.g. "portfolios">
    //    }
    //
    var PagedTable = function (config) {
        this.tableId = config.tableId;
        this.columns = config.columns;
        this.numRows = config.numRows;
        this.loadFn = config.loadFn;
        this.searchTextValidationFn = config.searchTextValidationFn;
        this.title = config.title;
        this.items = config.items;
        this.loadedData = null;
        this.searchText = "";
        this.emptyRow = "<tr>" + _.reduce(config.columns, function (memo) { return memo + "<td></td>"; }, "") + "</tr>";
    };

    _.extend(PagedTable.prototype, {
        // create method; call after construction.
        create: function () {
            var elTable = $("#" + this.tableId);

            // Get the elements in the table that we deal with.
            this.elTable = elTable;
            this.elTableBody = elTable.find("tbody");
            this.elSearchTextInput = elTable.find(".pagedTableSearchText");
            this.elSearchBtn = elTable.find(".pagedTableSearchBtn");
            this.elStartItemSpan = elTable.find(".pagedTableStartItem");
            this.elEndItemSpan = elTable.find(".pagedTableEndItem");
            this.elItemsCountSpan = elTable.find(".pagedTableItemsCount");
            this.elPrevPageBtn = elTable.find(".pagedTablePreviousPage");
            this.elPageSelect = elTable.find(".pagedTablePageSelect");
            this.elPagesCountSpan = elTable.find(".pagedTablePagesCount");
            this.elNextPageBtn = elTable.find(".pagedTableNextPage");
            this.elTitle = elTable.find(".pagedTableTitle");
            this.elItems = elTable.find(".pagedTableItems");

            // Write out the title, and what the items are.
            this.elTitle.html(_.escape(this.title));
            this.elItems.html(_.escape(this.items));

            // Set up handlers for the Search, Previous Page, Next Page and Page Select controls.
            this.elSearchBtn.click($.proxy(function () {
                var text;
                if (this.loadedData) {
                    text = $.trim(this.elSearchTextInput.val());
                    if (this.searchTextValidationFn) {
                        text = this.searchTextValidationFn(text);
                    }
                    this.elSearchTextInput.val(text);
                    if (this.searchText !== text) {
                        this.searchText = text;
                        this._loadPage(1);
                    }
                }
            }, this));

            this.elSearchTextInput.keypress($.proxy(function (e) {
                if (e.which === 13) {
                    this.elSearchBtn.trigger('click');
                }
            }, this));

            this.elPrevPageBtn.click($.proxy(function () {
                if (this.loadedData && (this.loadedData.page > 1)) {
                    this._loadPage(this.loadedData.page - 1);
                }
            }, this));

            this.elNextPageBtn.click($.proxy(function () {
                if (this.loadedData && (this.loadedData.page !== 0) &&
                    (this.loadedData.page < this.loadedData.pages)) {
                    this._loadPage(this.loadedData.page + 1);
                }
            }, this));

            this.elPageSelect.change($.proxy(function () {
                var pageNum = parseInt(this.elPageSelect.val(), 10);
                if (this.loadedData && (pageNum > 0) && (this.loadedData.page !== pageNum)) {
                    this._loadPage(pageNum);
                }
            }, this));
        },

        // Loads the first page of data.  After this, further page loads are triggered by the user clicking on the
        // page controls in the table's footer.
        load: function () {
            this._loadPage(1);
        },

        // Clears the table of data.
        clear: function () {
            var i,
                rows = "",
                zero = "0";

            this.loadedData = null;
            this.searchText = "";

            for (i = 0; i < this.numRows; i = i + 1) {
                rows += this.emptyRow;
            }
            this.elTableBody.html(rows);

            this.elSearchTextInput.val(this.searchText);
            this.elStartItemSpan.html(zero);
            this.elEndItemSpan.html(zero);
            this.elItemsCountSpan.html(zero);
            this.elPagesCountSpan.html(zero);
            this.elPageSelect.html("<option value='0'>0</option>");
        },

        // Removes the event handlers that were set up by the 'create' method.
        removeHandlers: function () {
            this.elSearchBtn.off("click");
            this.elSearchTextInput.off("keypress");
            this.elPrevPageBtn.off("click");
            this.elNextPageBtn.off("click");
            this.elPageSelect.off("change");
        },

        // Private.
        // Initiates the loading of the specified 1-based page number.
        _loadPage: function (pageNum) {
            // Restore the current search text to the <input> in case the user changed it before selecting to go to
            // a new page (a new search is only started by clicking on the Search button).
            this.elSearchTextInput.val(this.searchText);

            // Load.
            this.loadFn(pageNum, this.searchText, $.proxy(this._onPageLoaded, this));
        },

        // Private.
        // Called back by the specified load function when the requested page's data is available.
        // See above for a description of the 'data' object.
        _onPageLoaded: function (data) {
            var i, tableRows, numExtra, extraRows, selectOptions, val,
                columns = this.columns;

            if (!data) {
                return;
            }

            // Retain the specified data.
            this.loadedData = data;

            // Get the markup for the table rows from the specified data.
            tableRows = _.reduce(data.data, function (memo, row) {
                var rowData = _.reduce(columns, function (memo1, colName) {
                    return memo1 + "<td>" + row[colName] + "</td>";
                }, "");

                return memo + "<tr>" + rowData + "</tr>";
            }, "");

            // Add extra, blank rows for the last page.
            extraRows = "";
            numExtra = this.numRows - data.data.length;
            for (i = 0; i < numExtra; i = i + 1) {
                extraRows += this.emptyRow;
            }

            // Render out the table rows.
            this.elTableBody.html(tableRows + extraRows);


            // Update the displayed data re. the items and the pages.
            this.elStartItemSpan.html(data.start.toString());
            this.elEndItemSpan.html(data.end.toString());
            this.elItemsCountSpan.html(data.count.toString());
            this.elPagesCountSpan.html(data.pages.toString());

            // Update the page select control.
            selectOptions = "";
            if (data.pages === 0) {
                selectOptions = "<option value='0'>0</option>";
            } else {
                for (i = 1; i <= data.pages; i = i + 1) {
                    val = i.toString();
                    selectOptions += "<option value='" + val + "'>" + val + "</option>";
                }
            }
            this.elPageSelect.html(selectOptions);
            this.elPageSelect.val(data.page);
        }
    });

    return PagedTable;
});
