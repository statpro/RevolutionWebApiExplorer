/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery"
],
function (Backbone, _, $) {
    "use strict";

    // Tabs view.
    var TabsView = Backbone.View.extend({
        el: $("#tabs"),
        tagName: "div",

        tabNamesIds: {
            "portfolios": "#portfoliosPaneBtn",
            "analysis": "#analysisPaneBtn",
            "segmentsTree": "#segmentsTreePaneBtn",
            "timeSeries": "#timeSeriesPaneBtn"
        },

        render: function () {
            return this;
        },

        // Goes to (makes visible) the specified tab, which must be one of:-
        //   portfolios
        //   analysis
        //   segmentsTree
        //   timeSeries
        // Optionally specify a delay in milliseconds.
        goToTab: function (tabName, delay) {
            var paneBtnId,
                thisView = this;

            if (!tabName) {
                return;
            }
            paneBtnId = this.tabNamesIds[tabName];
            if (!paneBtnId) {
                return;
            }

            if (_.isNumber(delay)) {
                setTimeout(function () {
                    thisView.$(paneBtnId).trigger('click');
                }, delay);
            } else {
                thisView.$(paneBtnId).trigger('click');
            }
        }
    });

    return TabsView;
});
