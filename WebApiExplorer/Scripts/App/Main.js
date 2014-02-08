/* global require: false, confirm: false */

// Contains the application's entry-point JavaScript function.
//
// Relies on the following libraries, which must have been included on the page in the following order:-
//    json2.js
//    jQuery
//    Twitter Bootstrap
//    jquery.blockUI
//    Underscore.js
//    Backbone.js
//    jStorage.js
//
// Defined by the server:-
//   revWebApi as global object (i.e. window.revWebApi, accessed through the "Instances/RevWebApi" module)
//
//   revWebApi.userInfo = {
//       isLoggedOn: true|false,
//       displayName: "<name, or empty if not logged on>",
//       preferredLanguage: "<culture name, e.g. en-US>"
//   };
//
//   revWebApi.actionUris = {
//       logOnOff: "<uri>",
//       getWebApiResource: "<uri>",
//       getSegmentsTreeNodeMeasures: "<uri>",
//       getTimeSeriesMeasures: "<uri>",
//       exportSegmentsTreeNodeAsCsv: "<uri>",
//       exportTimeSeriesAsCsv: "<uri>",
//       getExportCultures: "<uri>"
//   };
//

require([
    "LibRefs/jQuery",
    "Helpers/GetWebApiResource",
    "Instances/WebApiData",
    "Instances/RevWebApi",
    "Instances/LocallyStoredData",
    "Collections/CultureCollection",
    "Models/PortfoliosInfoModel",
    "Models/AnalysisModel",
    "Models/SegmentsTreeResultsModel",
    "Models/TimeSeriesResultsModel",
    "Models/MeasuresInfoModel",
    "Views/LogOnOffView",
    "Views/TabsView",
    "Views/PortfoliosGridView",
    "Views/AnalysisView",
    "Views/SegmentsTreeView",
    "Views/TimeSeriesView"
],
function ($, getWebApiResource, webApiData, revWebApi, locallyStoredData, CultureCollection, PortfoliosInfoModel,
    AnalysisModel, SegmentsTreeResultsModel, TimeSeriesResultsModel, MeasuresInfoModel, LogOnOffView, TabsView,
    PortfoliosGridView, AnalysisView, SegmentsTreeView, TimeSeriesView) {
    "use strict";

    // On document ready...
    $(document).ready(function () {
        var logOnOffView, tabsView;

        // iframe buster (note that the server also sets the X-Frame-Options response header to "DENY").
        if (window.top !== window.self) {
            window.top.location.replace(window.self.location.href);
        }

        // BlockUI overrides.
        $.blockUI.defaults.fadeIn = 0;
        $.blockUI.defaults.fadeOut = 0;
        $.blockUI.defaults.message = "<h4>Please wait...</h4>";
        $.blockUI.defaults.css.border = '1px solid #aaa';

        // Create and render the initial views.
        logOnOffView = new LogOnOffView();
        logOnOffView.render();
        tabsView = new TabsView();
        tabsView.render();

        // Nothing more we can do until the user's logged on.
        if (webApiData.get("isUserLoggedOn") === false) {
            return;
        }

        // Load in the locally-stored data.
        locallyStoredData.load();

        // Get the Service resource.
        getWebApiResource(null, function (data) {
            var numPortfolios, result, portfoliosInfo, portfoliosGridView, analysis, analysisView,
                segmentsTreeView, segmentsTreeResults, timeSeriesView, timeSeriesResults, exportCultures;

            // Update the Web API data model with the user's total number of available portfolios, plus the href
            // of the portfolios query link.
            numPortfolios = data.jsObject.service.portfolios.total;
            webApiData.set("numPortfolios", numPortfolios);
            webApiData.set("portfoliosQueryHref", data.jsObject.service.portfolios.links.portfoliosQuery.href);

            // If the user has no portfolios...
            if (numPortfolios === 0) {
                // Warn the user and prompt to redirect to main Revolution website.
                result = confirm("You do not have any portfolios.  Redirect to the Revolution website in order to " +
                    "create one?");

                // Log the user off from the web server.  Afterwards, redirect to the Revolution website if the
                // user wants to go there.
                logOnOffView.logUserOnOrOff(null, function () {
                    if (result === true) {
                        window.location.href = "https://revolution.statpro.com";
                    }
                });

                return;
            }


            /* Create models */

            // Create and add a blank portfolios info model to the Web API data model.  It will be populated with
            // data when we get back the first set of portfolios from the server.
            portfoliosInfo = new PortfoliosInfoModel();
            webApiData.set("portfoliosInfo", portfoliosInfo);

            // Create and add a blank current-analysis model to the Web API data model.  It will be populated with
            // data when we get back the first portfolio analysis from the server.
            analysis = new AnalysisModel();
            webApiData.set("analysis", analysis);

            // Create and add a blank segments tree results model to the Web API data model.  It will be populated with
            // data when we get back the first segments tree results from the server.
            segmentsTreeResults = new SegmentsTreeResultsModel();
            webApiData.set("segmentsTreeResults", segmentsTreeResults);

            // Create and add a blank time series results model to the Web API data model.  It will be populated
            // with data when we get back the first time series results from the server.
            timeSeriesResults = new TimeSeriesResultsModel();
            webApiData.set("timeSeriesResults", timeSeriesResults);

            // Create an empty measures info model for Segments Tree Node measures, and add it to the Web API
            // data model.
            webApiData.set("segmentsTreeMeasuresInfo", new MeasuresInfoModel());

            // Create an empty measures info model for Time Series measures, and add it to the Web API data model.
            webApiData.set("timeSeriesMeasuresInfo", new MeasuresInfoModel());

            // Create an empty collection of export cultures, and add it to the Web API data model.
            exportCultures = new CultureCollection();
            webApiData.set("exportCultures", exportCultures);


            /* Create views */

            // Create, set up, render the portfolios grid view.
            portfoliosGridView = new PortfoliosGridView({
                model: portfoliosInfo,
                tabsView: tabsView
            });
            portfoliosGridView.render();

            // Attach a function to our global object (window.revWebApi) that will be called when the user clicks a
            // button in the portfolios grid to view a specific portfolio's default analysis.  We forward the request
            // to the portfolios grid view.
            revWebApi.viewAnalysis = function (portfolioId) {
                portfoliosGridView.viewAnalysis.call(portfoliosGridView, portfolioId);
            };

            // Create, set up and render the analysis view.
            analysisView = new AnalysisView({
                model: analysis,
                tabsView: tabsView
            });
            analysisView.render();

            // Create, set up and render the segments tree view.
            segmentsTreeView = new SegmentsTreeView({
                model: analysis
            });
            segmentsTreeView.render();

            // Create, set up and render the time series view.
            timeSeriesView = new TimeSeriesView({
                model: analysis
            });
            timeSeriesView.render();


            /* Kick things off */

            // Load the available export cultures.  When done, load the user's portfolios.
            exportCultures.load(revWebApi.actionUris.getExportCultures, function () {
                // Tell the portfolios info model to get the first page of portolios.  When loaded they'll be rendered
                // in the portfolios grid view.
                portfoliosInfo.getPage(1);
            });
        });
    });
});
