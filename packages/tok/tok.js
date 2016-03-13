//This bit handles all the tree operations with d3
//d3.force is their force-directed graph
//Links and Nodes are database arrays
//links and nodes are arrays in the d3.force
//and link and node are visualized d3 object arrays (almost SVGs)


ToK = function(svg, db) {

  var tree=this;

  var color = d3.scale.category20();
  var width = svg.attr("width"),
      height = svg.attr("height");

  //Define client-side temp MiniMongo collections:
  // var Nodes = new Meteor.Collection("nodeColl");
  // var Links = new Meteor.Collection("linkColl"); 

  // init svg
  var outer = svg.append("svg:svg")
      .attr("pointer-events", "all");

      
  //Run the following when the databases have loaded:
  // Meteor.subscribe("allLinks",function(){
  // Meteor.subscribe("allNodes",function(){

  var linkData=db.Links.find({}).fetch();
  var nodeData=db.Nodes.find({}).fetch();
  console.log("here be DB node", nodeData[1]);
  console.log("and a DB link", linkData[1]);

  // init force layout
  var force = d3.layout.force()
      .size([width, height])
      .nodes(nodeData)
      .links(linkData)
      .linkDistance(15)
      .charge(-80)
      .on("tick", tick)
      .on("end", function(){
          Meteor.call("updateCoord",force.nodes())
        });
  //visualized picture:
  var vis = outer;
  //Need this to get the layering correctly:
  var bckgnd = vis.append('svg:g');
  this.drag_line = vis.append('svg:g');

  //export local variables:
  this.force = force;
  this.vis = vis;
  var gui = new GUI(this);
  vis.on("mousemove", gui.mousemove)
    .on("mousedown", gui.mousedown)
    .on("mouseup", gui.mouseup);


  bckgnd.append('svg:rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'white');


  //Get pointers to graph elements: 
  var nodes = force.nodes(),
      links = force.links();

  // get layout properties
  var node = vis.selectAll(".node"),
      link = vis.selectAll(".link");

  
  // add keyboard callback
  d3.select(window)
      .on("keydown", gui.keydown);

  

  this.addNode = function(nd){
    //add the node to the force.nodes() array (nodes is a pointer)
    nodes.push(nd);
    //Add node to DB, return node ID in DB
    //Caution: the call is ASYNCHRONOUS!! 
    Meteor.call("addNode", nd, function(error, result){
      if(error){
        console.log(error.reason);
        return;
      }
      newId=result;
      //Assign the DB id to the nodes 
      nodes[nodes.length-1]._id = newId;
      console.log("added node ID:", nodes[nodes.length-1]._id);
    })
    console.log("added node:", nd)
  }
  this.addLink = function(lk){
    links.push(lk);
    Meteor.call("addLink", 
      {source: lk.source._id, target: lk.target._id}, 
      function(error, result){
      if(error){
        console.log(error.reason);
        return;
      }
      newId=result;
      //Assign the DB id to the nodes 
      links[links.length-1]._id = newId;
      console.log("added link ID:", links[links.length-1]._id);
    })
    console.log("added link:", lk);
  }
  this.deleteNode = function(nd){
    nodes.splice(nodes.indexOf(nd), 1);
    spliceLinksForNode(nd);
  }
  this.deleteLink = function(lk){
    links.splice(links.indexOf(lk), 1);
  }
  // redraw force layout
  this.redraw = function() {
    console.log("redrawing");
    //update data on d3 objects (SVGs)
    link = link.data(links); 
    //show new SVG-s for new links
    link.enter().insert("line", ".node")
        .attr("class", "link")
        .on("mousedown", gui.linkMousedown)
    //delete SVG-s for deleted links
    link.exit().remove();
    // console.log('link',gui.selected_link);
    // console.log('node',gui.selected_node);
    //style the selected link properly:
    link
      .classed("link_selected", function(d) { 
        return d === gui.selected_link; 
        });
    //Same for nodes:
    node = node.data(nodes);
        
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

  // }); });

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }

  function spliceLinksForNode(node) {
  toSplice = links.filter(
    function(l) { 
      return (l.source === node) || (l.target === node); });
  toSplice.map(
    function(l) {
      links.splice(links.indexOf(l), 1); });
}

}