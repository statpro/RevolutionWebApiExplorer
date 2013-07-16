/* global define: false */

define([
    "LibRefs/Backbone",
    "LibRefs/Underscore",
    "Helpers/GetWebApiResource",
    "Collections/SegmentsTreeNodeCollection",
    "Models/SegmentsTreeNodeModel"
],
function (Backbone, _, getWebApiResource, SegmentsTreeNodeCollection, SegmentsTreeNodeModel) {
    "use strict";

    // Segments Tree Results model.  This model contains the currently loaded collection of segments tree nodes,
    // each retrieved by a separate call to the Revolution Web API for segment / security analysis results.
    var SegmentsTreeResultsModel = Backbone.Model.extend({
        defaults: function () {
            return {
                rootHref: "",       // URI of the root node's segments tree results
                nodes: null         // instance of SegmentsTreeNodeCollection
            };
        },

        // Loads this model with segments tree root node results from the specified Web API URI.  The currently
        // loaded tree nodes are cleared from the model before the new data is loaded.  Potentially makes multiple
        // Web API requests to ensure that all of the root node's children (if any) end up in the single instance of
        // SegmentsTreeNodeModel that represents the root node.
        loadRootNode: function (segmentsTreeRootNodeQueryHref) {
            // Clear all current attributes; will fire a changed event.
            this.clear();

            if (!segmentsTreeRootNodeQueryHref) {
                return;
            }

            // Create and load the root (inc. *all* of this children, if children have been requested).
            this._createAndLoadNode(segmentsTreeRootNodeQueryHref, function (rootNode) {
                // Create a new Segments Tree Node collection, with initially just the root node.
                var nodes = new SegmentsTreeNodeCollection([rootNode]);

                // Set the root node URI and the nodes collection in this model; will fire a changed event.
                this.set({
                    "rootHref": rootNode.get("selfHref"),
                    "nodes": nodes
                });
            },
            this);
        },

        // Gets the root node, or null or undefined if it hasn't been loaded yet.
        getRootNode: function () {
            var nodes = this.get("nodes");

            if (!nodes) { return null; }
            return nodes.find(function (node) { return node.isRoot(); });
        },

        // Loads the node from the specified href (URI), adds it to the model, and invokes the 'onComplete' callback
        // (with 'scope' as its context, if specified) with a reference to the node.  If the node has already been
        // loaded then it is not re-loaded.  Note that href/URI matching is done case-sensitively.  This method will
        // do nothing if no nodes are currently loaded (i.e. 'loadRootNode' must have been called previously to
        // load the root node).
        loadNode: function (nodeHref, onComplete, scope) {
            var node,
                nodes = this.get("nodes");

            if (!nodes) {
                return;
            }

            node = nodes.find(function (n) { return n.getHref() === nodeHref; });

            function informCaller(node) {
                if (onComplete) {
                    if (!scope) {
                        onComplete(node);
                    } else {
                        onComplete.call(scope, node);
                    }
                }
            }

            if (node) {
                informCaller(node);
                return;
            }

            if (!node) {
                this._createAndLoadNode(nodeHref, function (node) {
                    nodes.add(node);
                    informCaller(node);
                }, scope);
            }
        },

        // Private
        // Creates a new instance of SegmentsTreeNodeModel, and loads it with data that's retrieved from the specified
        // Web API URI.  If specified, invokes the 'onComplete' callback (with 'scope' as its context, if specified)
        // when loading is complete, passing in a reference to the created-and-loaded SegmentsTreeNodeModel.
        //
        // Child Page Loading...  If the specified node has children (child segments or securities) that are spread
        // over multiple pages, this method will retrieve all of the pages from the Web API, and will ensure that the
        // children are all contained in the resulting SegmentsTreeNodeModel instance.
        //
        _createAndLoadNode: function (nodeHref, onComplete, scope) {
            var nodes = [];

            if (!nodeHref) {
                return;
            }

            // This inner function does all the work.  It calls itself recursively.
            function loadPage(pageHref) {
                getWebApiResource(pageHref, function (data) {
                    // Create and load a SegmentsTreeNodeModel; add it to the 'nodes' array.
                    var node = new SegmentsTreeNodeModel();
                    node.load(data.jsObject);
                    nodes.push(node);

                    // If the node has a 'next page' of children, load it up.  The resulting SegmentsTreeNodeModel
                    // instance will end up in the second, third, fourth slot in the 'nodes' array.
                    pageHref = node.getChildrenNextPageHref();
                    if (pageHref) {
                        loadPage(pageHref);
                        return;
                    }

                    // We're done loading pages of children (if there were any in the first place).

                    // Get a reference to the main SegmentsTreeNodeModel, and ensure that it contains all children.
                    node = nodes[0];
                    _.each(nodes, function (n, index) { if (index > 0) { node.addChildrenFromNode(n); } });
                    node.removePagingInfo();

                    // Inform the caller.
                    if (onComplete) {
                        if (!scope) {
                            onComplete(node);
                        } else {
                            onComplete.call(scope, node);
                        }
                    }
                });
            }

            // Kick things off.
            loadPage(nodeHref);
        }
    });

    return SegmentsTreeResultsModel;
});
