/* global define: false */

define([
    "Instances/RevWebApi",
    "Models/WebApiDataModel"
],
function (revWebApi, WebApiDataModel) {
    "use strict";

    // Create and return an instance of the Web API Data model with information about the user.
    return new WebApiDataModel({
        isUserLoggedOn: revWebApi.userInfo.isLoggedOn,
        userDisplayName: revWebApi.userInfo.displayName,
        preferredLanguage: revWebApi.userInfo.preferredLanguage
    });
});
