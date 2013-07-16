/* global define: false */

define([
    "LibRefs/Backbone"
],
function (Backbone) {
    "use strict";

    // Portfolio model.
    var PortfolioModel = Backbone.Model.extend({
        // attributes:-
        //   name
        //   id
        //   code
        //   owner
        //   defaultAnalysisHref
        //   analysisBtn (not strictly model data, but I've included the Analysis Button markup here for simplicity)
    });

    return PortfolioModel;
});
