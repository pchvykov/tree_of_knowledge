// Write your package code here!
ToK = function(svg) {
  
  var tree=this;

  var color = d3.scale.category20();
  var width = svg.attr("width"),
      height = svg.attr("height");

  var Nodes = new Meteor.Collection("nodeColl");
  var Links = new Meteor.Collection("linkColl");


    //Run the following when the databases have loaded:
    Meteor.subscribe("allLinks",function(){
    Meteor.subscribe("allNodes",function(){

      var linkData=Links.find({}).fetch();
      var nodeData=Nodes.find({}).fetch();

      

      // init svg
      var outer = svg.append("svg:svg")
          .attr("pointer-events", "all");

      //visualized picture:
      var vis = outer
        .append('svg:g')
          .on("dblclick.zoom", null)
        .append('svg:g');
          

      // init force layout
      var force = d3.layout.force()
          .size([width, height])
          .nodes(nodeData) 
          .links(linkData)
          .linkDistance(15)
          .charge(-80)
          .on("tick", tick);

      //Need this to get the layering correctly:
      var bckgnd = vis.append('g');
      this.drag_line = vis.append('g');

      //export local variables:
      this.force = force;
      this.vis = vis;
      var gui = new GUI(this);

      vis.on("mousemove", gui.mousemove)
          .on("mousedown", gui.mousedown)
          .on("mouseup", gui.mouseup)
          .call(d3.behavior.zoom().on("zoom", gui.rescale));
      bckgnd.append('svg:rect')
          .attr('width', width)
          .attr('height', height)
          .attr('fill', 'white');

      // get layout properties
      var node = vis.selectAll(".node"),
          link = vis.selectAll(".link");

      
      // add keyboard callback
      d3.select(window)
          .on("keydown", gui.keydown);

      

      function tick() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
      }

      
      // redraw force layout
      this.redraw = function() {

        link = link.data(gui.links);

        link.enter().insert("line", ".node")
            .attr("class", "link")
            .on("mousedown", gui.linkMousedown)

        link.exit().remove();
        // console.log('link',gui.selected_link);
        // console.log('node',gui.selected_node);
        link
          .classed("link_selected", function(d) { 
            return d === gui.selected_link; 
            });

        node = node.data(gui.nodes);

        
        node.enter().insert("circle")
            .attr("class", "node")
            //.attr("r", 5)
            .on("mousedown",gui.nodeMousedown)
            .on("mouseup", gui.nodeMouseup)
            .on("mouseover", gui.nodeMouseover)
            .on("mouseout", gui.nodeMouseout)
            .call(gui.nodeDrag)
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("r", 6.5);

        node.exit().transition()
            .attr("r", 0)
          .remove();

        node
          .classed("node_selected", function(d) { 
            return d === gui.selected_node; });

        

        if (d3.event) {
          // prevent browser's default behavior
          d3.event.preventDefault();
        }

        force.start();

      }

      

   /*

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

      });*/
      this.redraw();

    }); });



}