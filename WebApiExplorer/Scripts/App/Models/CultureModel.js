/* global define: false */

define([
    "LibRefs/Backbone"
],
function (Backbone) {
    "use strict";

    // Culture model.
    var CultureModel = Backbone.Model.extend({
        // attributes:-
        //   name          (e.g. "EN-US"; must be stored in upper case)
        //   displayName
    });

    return CultureModel;
});
