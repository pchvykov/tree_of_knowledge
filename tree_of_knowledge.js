var Nodes = new Meteor.Collection("nodeColl");
var Links = new Meteor.Collection("linkColl");
//var Nodes = db.getCollection("nodeColl");
//var Links = db.getCollection("linkColl");

// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    //Nodes.remove({}); Links.remove({});
    if (Nodes.find({}).count() ===0){
      console.log("loading collection from json")
      var graph = JSON.parse(Assets.getText("miserables.json"));
      graph.nodes.forEach(function (item, index, array) {
        Nodes.insert(item);
      });
      graph.links.forEach(function (item, index, array) {
        Links.insert(item);
      });
    };
    console.log("nodes count:", Nodes.find({}).count());
    console.log("links count:", Links.find({}).count());

    Meteor.publish("allNodes", function () {
      return Nodes.find();
    });
    Meteor.publish("allLinks", function () {
      return Links.find();
    });
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

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-80)
        .linkDistance(15)
        .size([width, height]); //Create the force-graph layout

    var svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes

    //Tracker.autorun(function(){

    //Run the following when the databases have loaded:
    Meteor.subscribe("allLinks",function(){
    Meteor.subscribe("allNodes",function(){

      var linkData=Links.find({}).fetch();
      var nodeData=Nodes.find({}).fetch();

      force
        .nodes(nodeData)
        .links(linkData)
        .start(); //Link the data into force layout
      console.log("I have:", linkData.length, "links")

      //Get all SVG link objects, and set attributes
      var link = svg.selectAll(".link")
          .data(linkData)
        .enter().append("line")
          .attr("class", "link")
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });
      
      //... SVG node objects
      var node = svg.selectAll(".node")
          .data(nodeData)
        .enter().append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .style("fill", function(d) { return color(d.group); })
          .call(force.drag);

      node.append("title")
          .text(function(d) { return d.name; });

      //On each simulation tick, assign new locations to the SVG objects:
      force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });

        node.each(function(d){collide(0.5, d.r)}); //Added 
      });

      //force.alpha(0.01);

      //Store the final graph configuration bac to db:
      force.on("end", function(){
        console.log("finished, storing node locations");

        node.each(function(d){
          //console.log(d._id, d.x);
          Nodes.update( { _id: d._id }, { $set: { 
            x: d.x,
            y: d.y 
          } } );
        });

      });
    }); });
  }
};

