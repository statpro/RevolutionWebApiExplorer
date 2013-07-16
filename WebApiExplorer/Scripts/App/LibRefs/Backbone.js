/* global define: false */

define(function () {
    "use strict";

    // Allow in-app global events.
    if (!Backbone.pubSub) {
        Backbone.pubSub = _.extend({}, Backbone.Events);
    }

    return Backbone;
});
