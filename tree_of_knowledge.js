var Graphs = new Meteor.Collection("graphList");
Nodes = new Meteor.Collection("nodeColl");
Links = new Meteor.Collection("linkColl");
//var Nodes = db.getCollection("nodeColl");
//var Links = db.getCollection("linkColl");
var db = new treeData(Nodes, Links); var graph; var svg;
notify = function(text){ //notification messages
  // console.log("notify: ",text);
  $('#notifications').text(text);
  // $('#notifications').css({"animation-name":"notify","animation-duration":"6s"})
  $('#notifications').removeClass('notify');
  setTimeout(function() {
      $('#notifications').addClass('notify');
  },1);
}
// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    var allCollections = function () {
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
    console.log(allCollections());

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

    db.publish()
  })
}


//Client-side code:
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


    // db.subscribe(function(){
    graph = new ToK(svg, db);
    // });
    
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
      var name=prompt("New graph name (no spaces)", "Elect_Mag");
      if (name) {
          console.log("create new");
          Meteor.call("newCollection",name);
      }
    },
    'click #delete': function(e){
      var result = confirm("Delete current tree?");
      if (result) {
          //Logic to delete the item
      }
    }
  });

};

function showGraph(name){
  db=null;
  db = new treeData(Nodes, Links);
  if (Meteor.isServer){
    db.publish();
  }
  if (Meteor.isClient) {
    Session.set('lastUpdate', new Date() );
    var myNode = document.getElementById("graphSVG");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
    graph = new ToK(svg, db);    
    notify("ready!");
  }
}

Meteor.methods({
  newCollection: function(name){
    Graphs.insert({'title': name});
    setTimeout(function() {
      Nodes = new Meteor.Collection(name+"Nodes");
      Links = new Meteor.Collection(name+"Links");
      // Nodes.insert({x: 0.0, y: 0.0});
      showGraph(name);
    },0)
  }
})
