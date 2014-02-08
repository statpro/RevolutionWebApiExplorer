/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "LibRefs/jQuery",
    "Instances/RevWebApi",
    "Instances/WebApiData"
],
function (Backbone, _, $, revWebApi, webApiData) {
    "use strict";

    // Log on/off view.
    var LogOnOffView = Backbone.View.extend({
        el: $("#logOnOffBtn"),
        tagName: "button",
        model: webApiData,
        events: {
            "click": "logUserOnOrOff"
        },
        initialize: function () {
            this.listenTo(this.model, "change:isUserLoggedOn", this.render);
        },
        render: function () {
            var el = this.$el,
                loggedOn = this.model.get("isUserLoggedOn");

            $("#userName").html(this.model.get("userDisplayName"));

            el.html(loggedOn ? "Log Off" : "Log On");

            if (loggedOn) {
                el.removeClass("btn-primary").addClass("btn-warning");
            } else {
                el.removeClass("btn-warning").addClass("btn-primary");
            }

            return this;
        },

        // Will be called when the click event is triggered to log the user on/off at the web server.  Can be
        // called directly instead, with the option of specifying a callback function that will be called when
        // the user is successfully logged off.
        logUserOnOrOff: function (e, onLogOffFn) {
            var self = this;

            // POST to the logOnOff action.  If the user's logged on, they'll be logged off at the server.
            // If logged off, we'll get back the URI to redirect to, in order to send an authorization
            // request to the StatPro Revolution OAuth2 Server.  See the LogOnOffResult C# DTO class for
            // more details.  Note that, by definition, when we get data back from the server, the user
            // is logged off.
            $.post(revWebApi.actionUris.logOnOff,
                {
                    "__RequestVerificationToken": $("#aftForm input").val()  // include the anti-forgery token
                },
                function (data) {
                    // By definition, the user is logged off.
                    self.model.onUserLoggedOff();

                    // If an authorization request URI is provided, redirect the browser to the URI; otherwise
                    // call the onLogOffFn if specified.
                    if (data && data.authorizationRequestUri) {
                        window.location.href = data.authorizationRequestUri;
                    } else {
                        if (onLogOffFn && _.isFunction(onLogOffFn)) {
                            onLogOffFn();
                        }
                    }
                },
                "json").fail(function (jqXHR) {
                    // Display the returned HTML page detailing the error.
                    document.write(jqXHR.responseText);  //ignore jslint
                });
        }
    });

    return LogOnOffView;
});
