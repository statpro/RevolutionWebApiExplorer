/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Models/PortfolioModel"
],
function (Backbone, _, PortfolioModel) {
    "use strict";

    // Collection of PortfolioModel.
    var PortfolioCollection = Backbone.Collection.extend({
        model: PortfolioModel,

        // Returns the contents of the collection as an array that's suitable for passing as the raw data for
        // the portfolios' Paged Table.
        getDataForPagedTable: function () {
            return _.map(this.models, function (portfolio) {
                return {
                    name: portfolio.escape("name"),
                    id: portfolio.escape("id"),
                    code: portfolio.escape("code"),
                    owner: portfolio.escape("owner"),
                    defaultAnalysisHref: portfolio.get("defaultAnalysisHref"),
                    analysisBtn: portfolio.get("analysisBtn")
                };
            });
        }
    });

    return PortfolioCollection;
});
