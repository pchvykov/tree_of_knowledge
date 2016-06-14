var Graphs = new Meteor.Collection("graphList"); //available graphs
Nodes=0, Links=0; //Client and server Globals
var db; var graph; var svg;
var currColl="test0";
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
    var allCollections = function () { //return all collections
        var Future = Npm.require('fibers/future'),
            future = new Future(),
            db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

        db.collectionNames( 
            function(error, results) {
                if (error) throw new Meteor.Error(500, "failed");
                future.return(results);
            }
        );
        return future.wait();
    };
    var collList=allCollections();
    console.log("Collections:", collList);

    // db.loadJSON(JSON.parse(Assets.getText("miserables.json")));
    // db.clear(); 
    // Nodes.insert({x: 0.0, y: 0.0});
    // console.log("updated #",
    // Nodes.update({importance: {$in:["",null,10]}}, 
    //   {$set: {importance:10}}, {multi:true}));
    // Links.update({strength: {$in:["",null,10]}}, 
    //   {$set: {strength:5}}, {multi:true});
    // Links.update({type: {$in:["connection"]}}, 
    //   {$set: {type:"related"}}, {multi:true});
    Graphs.remove({});


    // db.publish()
    // Fiber = Npm.require('fibers');
  })

  Meteor.methods({
    createCollection: function(name){
      Graphs.insert({'title': name});
      // console.log(Graphs.find().fetch())
      // Fiber(function(){
      // Meteor.defer(function() {
      Nodes = new Meteor.Collection(name+"_Nodes");
      Links = new Meteor.Collection(name+"_Links");
       // Nodes.insert({x: 0.0, y: 0.0});
      db = new treeData();
      db.publish();
      // })
    // }).run();
    },
    deleteCollection: function(){
      // Nodes.rawCollection().drop();
      // Links.rawCollection().drop();
    }
  })
}


//Client-side code:============================
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.onRendered(function(){
    // $("#nodeOptions").dialog({
    //     autoOpen: false
    // });
    Session.set('lastUpdate', new Date() );
    var width = $(window).width(),
    height = 700;//$(window).height(); //SVG size

    svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes
    $(".canvas").width(width);

    showGraph(currColl);
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
      console.log("new");
      currColl=prompt("New graph name (no spaces)", "test");
      showGraph(currColl);
    },
    'click #delete': function(e){
      var result = confirm("Delete current tree?");
      if (result) {
          Meteor.call('deleteCollection')
      }
    }
  });

  function showGraph(name){
    if (name) {
      Meteor.call("createCollection",name, function(){
        Nodes = new Meteor.Collection(name+"_Nodes");
        Links = new Meteor.Collection(name+"_Links");
          
        db = new treeData();
        Session.set('lastUpdate', new Date() );
        //Clear old DOM:
        var myNode = document.getElementById("graphSVG");
        while (myNode.firstChild) {
            myNode.removeChild(myNode.firstChild);
        }
        myNode = document.getElementById("allTooltips");
        while (myNode.firstChild) {
            myNode.removeChild(myNode.firstChild);
        }
        graph = new ToK(svg, db);    
        notify("ready!");
        });
        // showGraph(name);
    }
  }

};