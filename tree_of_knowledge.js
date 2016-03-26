var Nodes = new Meteor.Collection("nodeColl");
var Links = new Meteor.Collection("linkColl");
//var Nodes = db.getCollection("nodeColl");
//var Links = db.getCollection("linkColl");

var db = new treeData(Nodes, Links);
// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    // db.loadJSON(JSON.parse(Assets.getText("miserables.json")));
    // db.clear();
    // Nodes.insert({x: 0.0, y: 0.0});
    db.publish();
  })
}


//Client-side code:
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.rendered = function(){
    // $("#nodeOptions").dialog({
    //     autoOpen: false
    // });
    var width = 450,
    height = 300; //SVG size


    var svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes

    // db.subscribe(function(){
    var graph = new ToK(svg, db);
    // });
  },
  Template.graph.events({
    'click #bckup': function(e){
      e.preventDefault();
      
    }
  })

};
