/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Helpers/GetWebApiResource",
    "Instances/WebApiData",
    "Models/PortfolioModel",
    "Collections/PortfolioCollection"
],
function (Backbone, _, getWebApiResource, webApiData, PortfolioModel, PortfolioCollection) {
    "use strict";

    // Portfolios Info model.  This model contains the currently loaded collection of portfolios, plus associated
    // metadata (e.g. current page number, total number of pages).
    var PortfoliosInfoModel = Backbone.Model.extend({
        defaults: function () {
            return {
                pageSize: 14,            // = the page size of the portfolios' Paged Table
                selfHref: null,
                filteredCount: 0,
                pageNumber: 0,
                pageCount: 0,
                isPaged: false,
                portfolios: null         // instance of PortfolioCollection
            };
        },

        // Removes all the portfolios from the model, and resets related attributes.  When the 'getPage' method
        // is next called, and it successfully loads portfolios, it will raise the 'firstLoad' event.
        removePortfolios: function () {
            var portfolios = this.get("portfolios");

            if (portfolios) {
                portfolios.reset();
                this.set("portfolios", null);
            }
            this.set("selfHref", null);
            this.set("filteredCount", 0);
            this.set("pageNumber", 0);
            this.set("pageCount", 0);
            this.set("isPaged", false);
        },

        // Loads the specified page of portfolios.  Page numbering starts at 1.  If 'searchText' is specified,
        // then the method applies a filter to yield only those portfolios whose name starts with this text.  If no
        // portfolios are currently loaded then the specified page number is ignored, and the first page is loaded.
        // When successful the 'successFn' function (if specified) is called back; 'scope' (if specified) is set as
        // its 'this'.
        getPage: function (pageNumber, searchText, successFn, scope) {
            var uri, filter,
                portfolios = this.get("portfolios"),
                pageSize = this.get("pageSize"),
                pageCount = this.get("pageCount");

            // Page number starts at 1.
            if (pageNumber <= 0) {
                pageNumber = 1;
            }

            // If there are no currently loaded portfolios, then load page 1.
            if (portfolios === null) {
                pageNumber = 1;
            }

            // Bounds check.
            if ((pageCount !== 0) && (pageNumber > pageCount)) {
                pageNumber = pageCount;
            }

            // Set up the portfolios' filter.
            filter = null;
            if (searchText) {
                filter = "startswith(Name,'" + searchText + "')";
            }

            // Get the URI that queries for the specified page (with potential filtering, but no ordering for now).
            uri = webApiData.getPortfoliosQueryUri(filter, null, (pageNumber - 1) * pageSize, pageSize);

            // No need to load again if we've already loaded the indicated portfolios.
            if (uri === this.get("selfHref")) {
                if (successFn) { if (!scope) { successFn(); } else { successFn.call(scope); } }
                return;
            }

            // Get portfolios from the Web API.
            getWebApiResource(uri, function (data) {
                var ptfsArray, portfolios,
                    portfoliosObj = data.jsObject.portfolios,
                    links = portfoliosObj.links,
                    analysisBtnTempl = '<a onclick="window.revWebApi.viewAnalysis({0})" class="btn btn-info btn-mini">View</a>';

                // Update these attributes in the model.
                this.set("selfHref", links.self.href);
                this.set("filteredCount", portfoliosObj.filteredCount);
                if (portfoliosObj.pageCount) {      // if paged...
                    this.set("isPaged", true);
                    this.set("pageNumber", portfoliosObj.pageNumber);
                    this.set("pageCount", portfoliosObj.pageCount);
                } else {                            // else not paged
                    this.set("isPaged", false);
                    if (portfoliosObj.filteredCount === 0) {
                        this.set("pageNumber", 0);
                        this.set("pageCount", 0);
                    } else {
                        this.set("pageNumber", 1);
                        this.set("pageCount", 1);
                    }
                }

                // Build up an array of portfolio models.
                ptfsArray = _.map(portfoliosObj.items, function (item) {
                    return new PortfolioModel({
                        name: item.name,
                        id: item.id,
                        code: item.code,
                        owner: item.owner,
                        defaultAnalysisHref: item.links.defaultAnalysis.href,
                        analysisBtn: analysisBtnTempl.replace("{0}", "'" + item.id + "'")
                    });
                });

                // Add a new collection of portfolios to this model based on the array, or replace the contents
                // of the current collection.  If adding a new collection (i.e. a page of portfolios has been
                // loaded for the first time) raise the "firstLoad" event.
                portfolios = this.get("portfolios");
                if (portfolios === null) {
                    this.set("portfolios", new PortfolioCollection(ptfsArray));
                    this.trigger("firstLoad");
                } else {
                    portfolios.reset(ptfsArray);
                }

                // Call back the success function.
                if (successFn) { if (!scope) { successFn(); } else { successFn.call(scope); } }
            },
            this);
        }
    });

    return PortfoliosInfoModel;
});
