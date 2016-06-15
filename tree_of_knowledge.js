// var Graphs = new Meteor.Collection("graphList"); //available graphs
//Client and server Globals:
Nodes = new Meteor.Collection("all_Nodes"); //Server
Links = new Meteor.Collection("all_Links");
var db = new treeData();
var graph; var svg;
var currGraph="test0";
notify = function(text){ //notification messages
  // console.log("notify: ",text);
  $('#notifications').text(text);
  // $('#notifications').css({"animation-name":"notify","animation-duration":"6s"})
  $('#notifications').removeClass('notify');
  setTimeout(function() {
      $('#notifications').addClass('notify');
  },1);
}
// Server-side code:============================
if (Meteor.isServer){
  Meteor.startup(function(){
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
    // Graphs.remove({});

    // db.publish(currGraph);
  })

  Meteor.methods({
    // createCollection: function(name){
    //   // Graphs.insert({'title': name});
    //   if(name!=currColl){
    //     console.log("Loading new collection");
    //     Nodes = new Meteor.Collection(name+"_Nodes"); //Server
    //     Links = new Meteor.Collection(name+"_Links");
    //    // Nodes.insert({x: 0.0, y: 0.0});
    //     db = new treeData();
    //     db.publish(); //not necessary after first time
    //     currColl=name;
    //   }
    // },
    // deleteCollection: function(){
    //   Nodes.rawCollection().drop();
    //   Links.rawCollection().drop();
    //   //Nodes._dropCollection()
    // },
    listGraphs: function(){ //list all available graphs
      //console.log("graphs!!!",Nodes.rawCollection().distinct("graph"));
      //scan the Nodes collection for unique "graph" values:
      var graphs = _.uniq(Nodes
            .find({}, {fields: {graph: true}})
            .map(x => x.graph), true);
      return graphs;
    },
    publish: function(name){
      db.publish(name);
    }
  })
}


//Client-side code:============================
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.onRendered(function(){

    //Dropdown for available graphs:
    Meteor.call("listGraphs", function(err, res){
      $.each(res, function (i, item) {
          $('#availGraphs').append($('<option>', { 
              value: item,
              text : item 
          }));
      });
    });

    Session.set("currGraph",currGraph);
    $('#availGraphs').val(currGraph);
    Meteor.call('publish', currGraph);


    //Create canvas:
    Session.set('lastUpdate', new Date() );
    var width = $(window).width(),
    height = 700;//$(window).height(); //SVG size

    svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes
    $(".canvas").width(width);

    // showGraph("test0");
    graph = new ToK(svg, db);    
    notify("ready!");
  });

  Template.graph.helpers({
    lastUpdate(){return Session.get('lastUpdate');}
  });

  Template.graph.events({
    'click #bckup': function(e){
      e.preventDefault();
      db.saveJSON("");
      // var spawn = require('child_process').spawn;

      //   Nodes.insert(docs, {safe:true}, function(err, result) {
      //     var args = ['--db', 'mydb', '--collection', 'test']
      //       , mongodump = spawn('/usr/local/bin/mongodump', args);
      //     mongodump.stdout.on('data', function (data) {
      //       console.log('stdout: ' + data);
      //     });
      //     mongodump.stderr.on('data', function (data) {
      //       console.log('stderr: ' + data);
      //     });
      //     mongodump.on('exit', function (code) {
      //       console.log('mongodump exited with code ' + code);
      //     });
      //   });      
    },
    'click #new': function(e){
      var name=prompt("New graph name (no spaces)", "test1");
      if(name){
        notify("created new graph");
        Session.set("currGraph",name);
        $('#availGraphs').append($('<option>', {
            value: name,
            text: name,
            selected: 'selected'
        }));
        // //Clear old DOM:
        // var myNode = document.getElementById("graphSVG");
        // while (myNode.firstChild) {
        //     myNode.removeChild(myNode.firstChild);
        // }
        // myNode = document.getElementById("allTooltips");
        // while (myNode.firstChild) {
        //     myNode.removeChild(myNode.firstChild);
        // }
        Meteor.call('publish', name);
        graph.redraw();
      }
    },
    'click #delete': function(e){
      var result = confirm("Delete current tree?");
      if (result) {
          Meteor.call('deleteCollection')
      }
    }
  });

  // function showGraph(name){
  //   if (name) {
  //     Meteor.call("createCollection",name, function(){
  //       Nodes = new Meteor.Collection(name+"_Nodes"); //Client
  //       Links = new Meteor.Collection(name+"_Links");
  //       currColl=name;
          
  //       db = new treeData();
  //       Session.set('lastUpdate', new Date() );
  //       //Clear old DOM:
  //       var myNode = document.getElementById("graphSVG");
  //       while (myNode.firstChild) {
  //           myNode.removeChild(myNode.firstChild);
  //       }
  //       myNode = document.getElementById("allTooltips");
  //       while (myNode.firstChild) {
  //           myNode.removeChild(myNode.firstChild);
  //       }
  //       graph = new ToK(svg, db);    
  //       notify("ready!");
  //       });
  //       // showGraph(name);
  //   }
  // }

};