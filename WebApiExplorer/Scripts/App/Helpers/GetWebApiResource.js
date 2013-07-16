/* global define: false, alert: false */

define([
    "LibRefs/jQuery",
    "Instances/RevWebApi",
    "Instances/WebApiData"
],
function ($, revWebApi, webApiData) {
    "use strict";

    // Asynchronously gets the specified Web API resource, and calls back the specified function when successful.
    // If 'scope' is defined and non-null, then it will be set as 'this' when the function is called back.
    // Does nothing if the user isn't logged in at the time of calling.  Reports failures to talk to the web server
    // directly to the user.  If the specified URI is null, empty or undefined then the Web API's entry-point URI 
    // is used; otherwise the URI must be a valid Web API resource identifier as provided by the Web API itself
    // (possibly with modified query string values).  Unless 'ignoreErrorStatus' is true, non-200 HTTP status codes
    // returned by the Web API cause the accompanying reason phrase (= error message) to be reported directly to
    // the user.  The specified success function is called back with a JavaScript object version of the
    // WebApiResourceResult C# DTO class, with the following features: -
    //      - the value of property 'isLoggedOn' will be true
    //      - the value of property 'success' will be true
    //      - the value of property 'httpStatus' will always be 200 if 'ignoreErrorStatus' is not true (in which
    //        case a non-200 status will be reported directly to the user)
    //      - if 'ignoreErrorStatus' is true then the value of property 'httpStatus' will be 200 if the request
    //        was fully successful, otherwise it is expected that it will contain an error status of 400 or higher
    //      - if present, the contents of the 'representation' property may be minified (e.g. all unnecessary
    //        whitespace removed)
    //      - if a JSON resource representation has been returned then new property 'jsObject' is added; this
    //        property will contain a parsed version of the JSON (i.e. a conversion to a JavaScript object).
    // (see the WebApiResourceResult class for more details).
    //
    // If the response indicates that the user has been logged off from the web server, then he/she is automatically
    // logged off on the client side.
    //
    // If 'cache' is true, then the server is asked to cache the resource in session state in addition to returning
    // it to the JavaScript.  In this case the JavaScript object version of the WebApiResourceResult C# DTO class
    // will contain an identifier for the cached resource in property 'cachedResourceId'.
    //
    return function (uri, successFn, scope, ignoreErrorStatus, cache) {
        // Do nothing if the user isn't logged on.
        if (!webApiData.get("isUserLoggedOn")) {
            return;
        }

        // Block the UI.
        $.blockUI();

        // POST to the getWebApiResource action, with the specified Web API URI, and requesting a JSON resource
        // representation.  The data that is returned is a JavaScript object version of the WebApiResourceResult
        // C# DTO class.
        $.post(revWebApi.actionUris.getWebApiResource,
            {
                uri: !uri ? null : uri,
                format: "json",
                cache: cache ? true : false,
                "__RequestVerificationToken": $("#aftForm input").val()  // include the anti-forgery token
            },
            function (data) {
                // Unblock the UI.
                $.unblockUI();

                // If no data...
                if (!data) {
                    alert("Failed to talk to the web server.");
                    return;
                }

                // If the user is no longer logged on at the web server...
                if (!data.isLoggedOn) {
                    alert("You have been logged off.  Please log on and re-try.");
                    webApiData.onUserLoggedOff();
                    return;
                }

                // If not successful...
                if (!data.success) {
                    if (data.failedMessage) {
                        alert(data.failedMessage);
                    } else {
                        alert("Failed to talk to the web server.");
                    }
                    return;
                }

                // If we're not ignoring error status codes, then report a non-200 status to the user.
                if (ignoreErrorStatus !== true) {
                    if (data.httpStatus !== 200) {
                        alert(data.reasonPhrase);
                        return;
                    }
                }

                // If we've got a JSON representation, parse it and store the resulting JavaScript object in
                // new property 'jsObject'.
                if ((data.httpStatus === 200) && (data.isJson)) {
                    data.jsObject = $.parseJSON(data.representation);
                }

                // Call back with the returned response.
                if (successFn) {
                    if (!scope) {
                        successFn(data);
                    } else {
                        successFn.call(scope, data);
                    }
                }
            },
            "json").fail(function (jqXHR, textStatus, errorThrown) {
                $.unblockUI();
                alert("Failed to talk to the web server.  " + errorThrown);
            });
    };
});
