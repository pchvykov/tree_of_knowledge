// Minimal edits: avoid server-side synchronous cursor ops in `visNodes` and
// add defensive checks in `phantNodes`. The changes are intentionally small:
// - `visNodes` no longer calls `.fetch()`/`.map()` on server cursors; it returns
//   the node cursor and a conservative links cursor filtered by graph and the
//   appropriate strength field.
// - `phantNodes` returns empty cursors immediately when `visNdID` is missing or
//   empty, and otherwise returns a links cursor built with `$in/$nin` (no server-side
//   fetch/map). The client should filter links to visible nodes as needed.

const d3 = require("d3");
const saveAs = require("file-saver");

// expose as legacy globals so non-module code can continue to use them
if (typeof globalThis !== "undefined") {
  globalThis.d3 = globalThis.d3 || d3;
  globalThis.saveAs = globalThis.saveAs || saveAs;
} else if (typeof global !== "undefined") {
  global.d3 = global.d3 || d3;
  global.saveAs = global.saveAs || saveAs;
}

// var Graphs = new Mongo.Collection("graphList"); //available graphs
// Client and server globals - create collections so they are available application-wide.
if (typeof Nodes === "undefined") {
  Nodes = new Mongo.Collection("all_Nodes");
}
if (typeof Links === "undefined") {
  Links = new Mongo.Collection("all_Links");
}
if (typeof Backup === "undefined") {
  Backup = new Mongo.Collection("backups");
}
// factor by which each zoom step rescales the graph
// legacy-style globals used throughout app:
ZoomStep = 1.5;
VisNNodes = [20, 50];
// Delay creating the treeData-based DB object until Meteor startup so that
// collection definitions and package initialization are complete.
var db = null;
var graph;
var svg;
var currGraph;
// expose notify as a legacy global so non-module code can call it
notify = function (text) {
  //notification messages
  if (typeof document !== "undefined") {
    var el =
      document.getElementById("notifications") ||
      document.querySelector("#notifications");
    if (el) {
      el.textContent = text;
      try {
        el.classList.remove("notify");
      } catch (e) {}
      // reflow setTimeout to re-add animation class
      setTimeout(function () {
        try {
          el.classList.add("notify");
        } catch (e) {}
      }, 1);
    }
  }
};
// Server-side code:============================
if (Meteor.isServer) {
  Meteor.startup(async function () {
    console.log("=== SERVER STARTUP DEBUG START ===");
    // Initialize the treeData wrapper now that server-side collections exist.
    // This delays creation until Meteor startup to avoid ordering issues.
    console.log("Creating treeData instance on server...");
    db = new treeData();
    console.log("treeData instance created on server");

    // var allCollections = function () { //return all collections
    //     var Future = Npm.require('fibers/future'),
    //         future = new Future(),
    //         db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

    //     db.collectionNames(
    //         function(error, results) {
    //             if (error) throw new Meteor.Error(500, "failed");
    //             future.return(results);
    //         }
    //     );
    //     return future.wait();
    // };
    // var collList=allCollections();
    // console.log("Collections:", collList);

    //direct DB manipulations:
    // db.loadJSON(JSON.parse(Assets.getText("miserables.json")));
    // db.clear();
    // Nodes.insert({x: 0.0, y: 0.0});
    // console.log("updated #",
    //   Nodes.update({}, {$set: {graph:"test0"}}, {multi:true}),
    //   Links.update({}, {$set: {graph:"test0"}}, {multi:true}));
    // Nodes.update({importance: {$in:["",null,10]}},
    //   {$set: {importance:10}}, {multi:true}));
    // Links.update({strength: {$in:["",null,10]}},
    //   {$set: {strength:5}}, {multi:true});
    // Links.update({type: {$in:["connection"]}},
    //   {$set: {type:"related"}}, {multi:true});
    // Nodes.update({$and: [{x: NaN}, {graph: "ClassMech"}]},
    //   {$set: {x:1000}}, {multi:true}),
    // Nodes.update({$and: [{y: NaN}, {graph: "ClassMech"}]},
    //   {$set: {y:1000}}, {multi:true}),
    // Nodes.find({graph:"ClassMech"}).fetch() )
    // Nodes.update({graph:"test1"},{$set:{zoomLvl:0}},{multi:true})
    // return;
    // Graphs.remove({});
    // console.log(
    //   Nodes.remove({graph:{$exists:false}}),
    //   Links.remove({graph:{$exists:false}}))
    // console.log('all',
    //   Nodes.find().fetch(),
    //   Links.find().fetch())
    // console.log(
    //   Nodes.remove({graph:'MetaMath'}),
    //   Links.remove({graph:'MetaMath'}))
    // Nodes.update({graph:'MetaMath'},{$set:{x:2345,y:2345}},{multi:true})
    var metaZoomsRaw = Nodes.find({ graph: "MetaMath" }).fetch();
    var metaZooms = Array.isArray(metaZoomsRaw)
      ? metaZoomsRaw
          .map(function (nd) {
            return nd && nd.zoomLvl;
          })
          .filter(function (v) {
            return typeof v === "number" && !isNaN(v);
          })
      : [];
    var mxZm = metaZooms.length > 0 ? Math.max.apply(null, metaZooms) : 0;
    await Nodes.updateAsync(
      { graph: "MetaMath", zoomLvl: mxZm },
      { $set: { x: 2346, y: 2346 } },
      { multi: true },
    );

    // console.log(
    //   Nodes.remove({graph:'test1'}),
    //   Links.remove({graph:'test1'}))
    await Nodes.updateAsync(
      { graph: "test" },
      { $set: { x: 2345, y: 2345 } },
      { multi: true },
    );
    // Links.find({}).forEach(lk => Links.update(lk._id,
    //   {$set: {strength:parseFloat(lk.strength)}}));
    console.log(
      await Nodes.updateAsync(
        { x: NaN },
        { $set: { x: 1000 } },
        { multi: true },
      ),
      await Nodes.updateAsync(
        { y: NaN },
        { $set: { y: 1000 } },
        { multi: true },
      ),
    );

    console.log("About to define publications directly...");

    // Define publications directly instead of calling db.publish()
    //publish entire current graph:
    Meteor.publish("allNodes", function (name, tmp, tm) {
      console.log("allNodes publication called for graph:", name);
      return [
        Nodes.find({ graph: name }),
        Links.find({ graph: name, strength: { $exists: true } }),
      ];
    });
    console.log("allNodes publication defined");

    var tmpZmLvl; //store current zoom level temporarily on server

    //publish visible portion of the graph (simplified and fast)
    Meteor.publish("visNodes", function (Gname, visWindow, zmLvl) {
      console.log(
        "visNodes simple publication called:",
        Gname,
        visWindow,
        zmLvl,
      );
      // minimal, fast selection based on the supplied window and zoom level
      var tmpZm = typeof zmLvl === "number" ? zmLvl : 0;
      var nodeSelector = {
        graph: Gname,
        zoomLvl: { $gte: tmpZm },
        x: { $gt: visWindow[0], $lt: visWindow[2], $ne: 2345 },
        y: { $gt: visWindow[1], $lt: visWindow[3], $ne: 2345 },
      };

      // Return node cursor directly and avoid server-side fetch/map on cursors.
      var visNodes = Nodes.find(nodeSelector);

      // Build a conservative link selector filtered by graph and strength field only.
      var linkSelector = {
        graph: Gname,
      };
      linkSelector["strength" + (tmpZm === 0 ? "" : tmpZm)] = { $exists: true };
      var visLinks = Links.find(linkSelector);

      // Store tmp zoom level so phantNodes can use it if needed.
      tmpZmLvl = tmpZm;

      console.log("visNodes simple returning cursors for graph:", Gname);

      return [visNodes, visLinks];
    });
    console.log("visNodes publication defined");

    Meteor.publish(
      "phantNodes",
      function (Gname, visWindow, visNdID, phChConst) {
        console.log("phantNodes publication called with:", {
          Gname,
          visWindow,
          visNdID: visNdID ? visNdID.length : 0,
          phChConst,
        });

        try {
          // Defensive: if visNdID is not an array or is empty, return empty cursors immediately.
          if (!Array.isArray(visNdID) || visNdID.length === 0) {
            console.log("phantNodes: empty visNdID - returning empty cursors");
            return [
              Nodes.find({ _id: { $in: [] } }),
              Links.find({ _id: { $in: [] } }),
            ];
          }

          // Select phantom links that touch visible nodes on one side.
          var srt = {};
          srt["strength" + (typeof tmpZmLvl === "number" ? tmpZmLvl : 0)] = -1;

          // Build a single query that finds links where one endpoint is in visNdID
          // and the other endpoint is not. This avoids per-id cursor.map()/fetch() on server.
          var phLinkSelector = {
            graph: Gname,
            $or: [
              { source: { $in: visNdID }, target: { $nin: visNdID } },
              { target: { $in: visNdID }, source: { $nin: visNdID } },
            ],
          };

          var connLk = Links.find(phLinkSelector, { sort: srt, limit: 200 });

          // To avoid server-side cursor transformations, return an empty nodes cursor
          // (client can request/compute the exact phantom nodes from the returned links).
          var fixNodes = Nodes.find(
            { _id: { $in: [] } },
            { fields: { text: 0 } },
          );

          console.log("phantNodes returning cursors (links only)");

          return [fixNodes, connLk];
        } catch (err) {
          console.error("phantNodes publication failed with error:", err);
          // Ensure the client subscription's ready callback fires
          this.ready();
          return [];
        }
      },
    );
    console.log("phantNodes publication defined");

    Meteor.publish("srvBckup", function () {
      return Backup.find();
    });
    console.log("srvBckup publication defined");
    console.log("=== SERVER STARTUP DEBUG END ===");
  });

  Meteor.methods({
    listGraphs: async function () {
      //list all available graphs
      // Use fetch() to get an array and then map to the graph field
      var nodesData = await Nodes.find(
        {},
        { fields: { graph: true }, sort: { graph: 1 } },
      ).fetch();
      var graphsArr = nodesData.map(function (x) {
        return x.graph;
      });
      var graphs = _.uniq(graphsArr, true);
      return graphs;
    },
    maxZoomLvl: async function (graphName) {
      // Find the maximum zoom level for the given graph
      const nodes = await Nodes.find({ graph: graphName }).fetch();
      if (nodes.length === 0) {
        return 0; // Default zoom level if no nodes
      }
      const zoomLevels = nodes.map((node) => node.zoomLvl || 0);
      return Math.max(...zoomLevels);
    },
    renameGraph: async function (oldName, newName) {
      await Nodes.updateAsync(
        { graph: oldName },
        { $set: { graph: newName } },
        { multi: true },
      );
      await Links.updateAsync(
        { graph: oldName },
        { $set: { graph: newName } },
        { multi: true },
      );
    },
    deleteGraph: async function (name) {
      await Links.removeAsync({ graph: name });
      await Nodes.removeAsync({ graph: name });
    },
    backupGraph: async function (name, note, srv) {
      var bck = {
        nodes: await Nodes.find({ graph: name }).fetch(),
        links: await Links.find({ graph: name }).fetch(),
        date: new Date(),
        graph: name,
        note: note,
        nodeCount: await Nodes.find({ graph: name }).countAsync(),
        linkCount: await Links.find({ graph: name }).countAsync(),
        graphNumber: (await Backup.find().countAsync()) + 1,
      };
      if (srv)
        return await Backup.insertAsync(bck); //server backup
      else return bck; //client backup
    },
    restoreGraph: async function (bckCnt, srv) {
      var grObj;
      if (srv)
        grObj = await Backup.find({ graphNumber: bckCnt }).fetch(); //server restore
      else grObj = [bckCnt]; //client restore
      if (grObj.length == 0) {
        return false;
      }
      var grList = Meteor.call("listGraphs");
      var name = grObj[0].graph;
      //Create new name for the graph:
      while (grList.indexOf(name) > -1) {
        name += "~";
      }
      //Insert all nodes and links into their Collections:
      //note: must update link source/target with new node IDs
      var newId = {};
      for (var i = 0; i < grObj[0].nodes.length; i++) {
        var nd = grObj[0].nodes[i];
        nd.graph = name;
        var oldID = nd._id;
        delete nd._id;
        newId[oldID] = await Nodes.insertAsync(nd);
      }
      for (var j = 0; j < grObj[0].links.length; j++) {
        var lk = grObj[0].links[j];
        lk.graph = name;
        lk.source = newId[lk.source];
        lk.target = newId[lk.target];
        delete lk._id;
        await Links.insertAsync(lk);
      }
      return name;
    },
  });
}

//Client-side code:============================
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.onRendered(function () {
    //Dropdown for available graphs:
    console.log("Template.graph.onRendered called");
    console.log("Checking global dependencies:");
    console.log("d3:", typeof d3, d3);
    console.log("jQuery:", typeof $, $);
    console.log("Meteor:", typeof Meteor, Meteor);
    console.log("Session:", typeof Session, Session);
    console.log("Blaze:", typeof Blaze, Blaze);

    Meteor.call("listGraphs", function (err, list) {
      console.log("listGraphs result:", err, list);
      $.each(list, function (i, item) {
        $("#availGraphs").append(
          $("<option>", {
            value: item,
            text: item,
          }),
        );
      });

      // If no graphs exist, create a default one
      if (list.length === 0) {
        console.log("No graphs found, creating default graph");
        currGraph = "default";
        $("#availGraphs").append(
          $("<option>", {
            value: currGraph,
            text: currGraph,
            selected: "selected",
          }),
        );
        // Add a sample node to the default graph
        console.log("Adding welcome node to default graph");
        Meteor.call(
          "updateNode",
          {
            title: "Welcome Node",
            type: "concept",
            importance: 3,
            text: "This is your first node. Double-click to edit, or Ctrl+drag to create new nodes and links.",
            x: 2500,
            y: 2500,
            graph: currGraph,
          },
          function (err, result) {
            if (err) console.error("Error creating welcome node:", err);
            else console.log("Welcome node created:", result);
          },
        );
      } else {
        console.log("Found", list.length, "graphs, selecting first:", list[0]);
        currGraph = list[0]; //First graph to show
        $("#availGraphs").val(currGraph);
      }

      //Create canvas:
      Session.set("lastUpdate", new Date());
      var width = $(window).innerWidth() - 35, //$("body").prop("clientWidth"),
        height = 500; //$(window).height(); //SVG size
      console.log("width: ", width);

      svg = d3.select("#graphSVG").attr("width", width).attr("height", height); //Set SVG attributes
      $(".canvas").width(width);

      // showGraph("test0");
      console.log("Creating new ToK instance");
      // Ensure db is initialized
      if (!db) {
        console.log("Initializing db with new treeData()");
        db = new treeData();
      }
      graph = new ToK(svg, db);
      console.log("ToK instance created, calling showGraph with:", currGraph);
      showGraph(currGraph);
    });
  });

  Template.graph.helpers({
    lastUpdate() {
      return Session.get("lastUpdate");
    },
  });

  Template.graph.events({
    "change #availGraphs": function (e) {
      if (!graph) return;
      if (graph.gui.editPopup) {
        notify("finish editing first");
        return;
      }
      var newValue = $("#availGraphs").val();
      var oldValue = Session.get("currGraph");
      if (newValue != oldValue) {
        // value changed, let's do something
        showGraph(newValue);
      }
    },
    "click #new": function (e) {
      console.log("NEW button clicked");
      if (!graph) {
        console.log("Graph not initialized, returning");
        return;
      }
      if (graph.gui.editPopup) {
        notify("finish editing first");
        return;
      }
      var name = prompt("New graph name (no spaces)", "test1");
      console.log("User entered name:", name);
      var newFl = true; //check if name already exists:
      $("#availGraphs option").each(function (d) {
        newFl = newFl && name != $(this).val();
      });
      console.log("Name is new:", newFl);
      if (name) {
        if (newFl) {
          console.log("Creating new graph:", name);
          $("#availGraphs").append(
            $("<option>", {
              value: name,
              text: name,
              selected: "selected",
            }),
          );
          showGraph(name);
          notify("created new graph");
        } else {
          console.log("Switching to existing graph:", name);
          $("#availGraphs").val(name);
          showGraph(name);
        }
      }
    },
    "click #rename": function (e) {
      if (!graph) return;
      if (graph.gui.editPopup) {
        notify("finish editing first");
        return;
      }
      var newName = prompt("Enter new graph name:", Session.get("currGraph"));
      Meteor.call("listGraphs", function (err, list) {
        if (list.indexOf(newName) > -1) {
          notify("name already exists");
          return;
        }
        Meteor.call(
          "renameGraph",
          Session.get("currGraph"),
          newName,
          function () {
            notify("Graph renamed, refresh the page to finish");
            Session.set("currGraph", newName);
          },
        );
      });
    },
    "click #delete": function (e) {
      if (!graph) return;
      var result = confirm("Delete the entire current graph?");
      if (result) {
        Meteor.call("deleteGraph", Session.get("currGraph"));
        notify("graph deleted - switch to another graph");
      }
    },
    "click #srvBckup": function (e) {
      e.preventDefault();
      if (!graph) return;
      var note = prompt("Backup note:");
      if (!note) {
        notify("backup cancelled");
        return;
      }
      Meteor.call("backupGraph", Session.get("currGraph"), note, true);
    },
    "click #srvRestore": function (e) {
      e.preventDefault();
      if (!graph) return;
      if (graph.gui.editPopup) {
        notify("finish editing first");
        return;
      }
      Meteor.subscribe("srvBckup", function () {
        //backup DB
        //show the backup collection and and
        //ask user for graphNumber in Backup collection:
        console.log("Backups collection:", Backup.find().fetch());
        var list = Backup.find(
          {},
          {
            fields: {
              graph: true,
              date: true,
              note: true,
              graphNumber: true,
              nodeCount: true,
              _id: false, //, linkCount:true
            },
          },
        ).fetch();
        var restID = prompt(
          JSON.stringify(list, null, 2) +
            "\n enter graphNumber of graph to restore:",
        );
        if (!restID) return;
        // "Backup ID of graph to restore (check console for list)");
        //copy backup into Nodes and Links collections and show:
        Meteor.call("restoreGraph", Number(restID), true, function (err, name) {
          if (!name) {
            alert("Invalid backup number");
            return;
          }
          $("#availGraphs").append(
            $("<option>", {
              value: name,
              text: name,
              selected: "selected",
            }),
          );
          showGraph(name);
          notify("restored graph " + name);
        });
      });
    },
    "click #cltBckup": function (e) {
      e.preventDefault();
      if (!graph) return;
      var note = prompt("Backup note (included in filename):");
      if (!note) {
        notify("backup cancelled");
        return;
      }
      Meteor.call(
        "backupGraph",
        Session.get("currGraph"),
        note,
        false,
        function (err, bckObj) {
          var date = new Date();
          var file = new File(
            [JSON.stringify(bckObj, null, 2)],
            date.getFullYear().toString() +
              (date.getMonth() + 1) +
              date.getDate() +
              "-" +
              date.getHours() +
              ";" +
              date.getMinutes() +
              ";" +
              date.getSeconds() +
              "-" +
              bckObj.graph +
              "-" +
              bckObj.note,
            { type: "application/json" },
          ); //"text/plain;charset=utf-8"});
          saveAs(file);
        },
      );
    },
    "change #cltRestore": function (event) {
      // var tmppath = URL.createObjectURL(event.target.files[0]);
      // console.log(tmppath, event.target.files);
      // $("img").fadeIn("fast").attr('src',tmppath);
      if (!graph) return;
      if (graph.gui.editPopup) {
        notify("finish editing first");
        return;
      }
      var r = new FileReader();
      //register callback on file load:
      r.onload = function (e) {
        var bckObj = JSON.parse(e.target.result);
        // console.log(bckObj);
        Meteor.call("restoreGraph", bckObj, false, function (err, name) {
          if (!name) {
            alert("Invalid file chosen");
            return;
          }
          $("#availGraphs").append(
            $("<option>", {
              value: name,
              text: name,
              selected: "selected",
            }),
          );
          showGraph(name);
          notify("restored graph " + name);
        });
      };
      //trigger file load:
      r.readAsText(event.target.files[0]);
    },
    "change #loadMetamath": function (event) {
      if (!graph) return;
      //trigger file load:
      parseMetamath(event.target.files[0]);
    },
    "click #resetCrds": function (e) {
      e.preventDefault();
      if (!graph) return;

      // Get current graph name from session
      const currentGraph = Session.get("currGraph");

      // Call the server method
      Meteor.call("resetNodeCoords", currentGraph, function (error) {
        if (error) {
          notify("Error resetting coordinates: " + error.reason);
        } else {
          notify("Node coordinates reset");
          graph.redraw(); // Refresh the visualization
        }
      });
    },
  });

  function showGraph(name) {
    console.log("showGraph called with name:", name);
    Session.set("currGraph", name);
    if (graph.gui.contentPopup) {
      Blaze.remove(graph.gui.contentPopup);
      graph.gui.contentPopup = null;
    }
    console.log("Calling maxZoomLvl for graph:", name);
    Meteor.call("maxZoomLvl", name, function (err, res) {
      if (err) {
        console.error("Error getting maxZoomLvl:", err);
      } else {
        console.log("Max zoom level result:", res);
      }
      Session.set("currZmLvl", res); //Set zoom level
      console.log("About to call graph.redraw()");
      graph.redraw(); //subscribe to and show the "currGraph"
    });
  }
}
