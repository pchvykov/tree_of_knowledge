// Write your package code here!
ToK = function(svg) {
  var color = d3.scale.category20();
	var force = d3.layout.force()
        .charge(-80)
        .linkDistance(15)
        .size([svg.attr("width"), svg.attr("height")]); //Create the force-graph layout

  var Nodes = new Meteor.Collection("nodeColl");
  var Links = new Meteor.Collection("linkColl");

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


      //Drag behavior (default + some modifications):
      var drag = force.drag()
        .on("dragstart", dragstart)
        .on("drag", dragtick)
        .on("dragend", dragend);

      var start_drag;
      function dragstart(){
        console.log(force.nodes())
        if (d3.event.sourceEvent.ctrlKey) {
          var point = d3.mouse(this),
            start_drag = {x: point[0], y: point[1]},
          n = nodes.push(node);
          console.log("ctrl-drag: from ", start_drag);
        }
      }
      function dragtick(){

      }
      function dragend(){

      }

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
          .call(drag)
          .on("mouseover", function(){d3.select(this).style({stroke: "red"});})
          .on("mouseout",  function(){d3.select(this).style({stroke: "white"});});

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

      });

      force.alpha(0.02);

      //Store the final graph configuration back to db:
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