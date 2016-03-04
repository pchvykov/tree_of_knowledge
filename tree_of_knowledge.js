// var Nodes = new Meteor.Collection("nodeColl");
// var Links = new Meteor.Collection("linkColl");
//var Nodes = db.getCollection("nodeColl");
//var Links = db.getCollection("linkColl");

// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    var data = new treeData();
    data.publish();
  })
}


//Client-side code:
if (Meteor.isClient) {
  Template.graph.events({

  });

  //Once the SVG is rendered:
  Template.graph.rendered = function(){
    var width = 450,
    height = 300; //SVG size


    var svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes

    var graph = new ToK(svg);

  }
};

