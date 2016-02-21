var Nodes = new Meteor.Collection("nodeColl");
var Links = new Meteor.Collection("linkColl");

// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    if (Nodes.find({}).count() === 0){
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
  })
}


//Client-side code:
if (Meteor.isClient) {
  Template.graph.events({

  });

  Template.graph.rendered = function(){
    var width = 450,
    height = 300;

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-80)
        .linkDistance(15)
        .size([width, height]);

    var svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height);
    //console.log("happy kitten", Nodes.find({}).count())



    Tracker.autorun(function(){
      var linkData=Links.find({}).fetch();
      var nodeData=Nodes.find({}).fetch();
      if (linkData.length < 254) return;

      force
        .nodes(nodeData)
        .links(linkData)
        .start();
      console.log("I have:", linkData.length, "links")

      

      var link = svg.selectAll(".link")
          .data(linkData)
        .enter().append("line")
          .attr("class", "link")
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });
      
      var node = svg.selectAll(".node")
          .data(nodeData)
        .enter().append("circle")
          .attr("class", "node")
          .attr("r", 5)
          .style("fill", function(d) { return color(d.group); })
          .call(force.drag);
          
      node.append("title")
          .text(function(d) { return d.name; });

      force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
      });
    });
  }
};

