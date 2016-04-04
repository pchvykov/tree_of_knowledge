//This bit handles all the tree operations with d3
//d3.force is their force-directed graph
//Links and Nodes are database arrays
//links and nodes are arrays in the d3.force
//and link and node are visualized d3 object arrays (almost SVGs)

  //Hierarchy of objects:
  //svg > outer > vis > bckgnd,drag_line,node,link


ToK = function(svg, db) {

  var tree=this;
  this.svg=svg;

  var color = d3.scale.category20();
  var width = svg.attr("width"),
      height = svg.attr("height");

  // init svg, registers events:
  var outer = svg.append("svg:svg")
      .attr("pointer-events", "all");

  //visualized picture, moves with pan/zoom:
  var vis = outer
  .append('svg:g')
    .call(d3.behavior.zoom().on("zoom", rescale))
    .on("dblclick.zoom", null)
  .append('svg:g');

vis.append('svg:rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'white');


  // init force layout
  var force = d3.layout.force()
      .size([width, height])
      // .nodes(nodeData)
      // .links(linkData)
      .linkDistance(15)
      .charge(-80)
      .on("tick", tick)
      .on("end", function(){
          Meteor.call("updateCoord",force.nodes())
        });

  // var bckgnd = vis.append('svg:g');
  this.drag_line = vis.append('svg:g');

  //export local variables:
  this.force = force;
  this.vis = vis;
  var gui = new GUI(this);
  vis.on("mousemove", gui.mousemove)
    .on("mouseup", gui.mouseup, false)
    .on("dblclick", gui.dblclick, false);

  // get layout properties
  var node = vis.selectAll(".node"),
      link = vis.selectAll(".link");

  
  // add keyboard callback
  d3.select(window)
      .on("keydown", gui.keydown);


  // pull data from server and redraw force layout
  this.redraw = function() {
  db.subscribe(function(){
    console.log("redrawing");
    var linkData=db.Links.find({}).fetch();
    var nodeData=db.Nodes.find({}).fetch();
    //replace node id-s in links with indexes (slow?)
    linkData.forEach(function(lk, idx){
      lk.source = nodeData.findIndex(function(nd){return nd._id == lk.source});
      lk.target = nodeData.findIndex(function(nd){return nd._id == lk.target});
    });
    // console.log("links here", linkData);
    //Update the force graph:
    force.nodes(nodeData)
        .links(linkData);

    //update data on d3 objects (SVGs), bind using _id:
    node = node.data(nodeData, function(d){return d._id});
        
    node.enter().insert("circle")
        .attr("class", "node") //styling
        .attr("r", 6.5) //radius
        // .attr("id",function(d){return d._id}) //for selection
        .on("mousedown",gui.nodeMousedown, false) //callbacks
        .on("mouseup", gui.nodeMouseup, false) //bubble event propagation
        .on("mouseover", gui.nodeMouseover)
        .on("mouseout", gui.nodeMouseout)
        .on("click", gui.nodeClick)
        .on("dblclick", gui.nodeDblClick)
        .call(gui.nodeDrag)
        .transition()
        .duration(750)
        .ease("elastic");
    // node.append("title")
    //     .text(function(d){return d.title});
    node.attr("data-tooltip", function(d){return d.title})
        .attr("data-tooltip-top", function(d){
          return 15 + parseFloat(this.getAttribute("r"));
        });

    node.exit().transition()
        .attr("r", 0)
      .remove();

    //For links-----------------------
    link = link.data(linkData, function(d){return d._id});
    //show new SVG-s for new links
    link.enter()
        .insert("line", ".node")
        .attr("class", "link")
        .on("mousedown", gui.linkMousedown)
        .on("dblclick", gui.linkDblClick);
        // .each(function(d){
        //   console.log(d);
        //   d.source = d3.select("#"+d.source);
        //   d.target = d3.select("#"+d.target);
        // })
         
    //delete SVG-s for deleted links
    link.exit().remove();
    // console.log('link',gui.selected_link);
    // console.log('node',gui.selected_node);
    

    //show the selection correctly:
    // tree.updateSelection();

    if (d3.event) {
      // prevent browser's default behavior
      d3.event.preventDefault();
    }

    force.start();
    force.alpha(0.05);
  })
  }
  
    
  this.redraw();


  this.addLink = function(lk){
    Modal.show('linkOptions',{
      link: {source: lk.source._id, target: lk.target._id},
      tree: tree
    }); 
    //   function(error, result){
    //   if(error){
    //     console.log(error.reason);
    //     return;
    //   }
    //   newId=result;
    //   //Assign the DB id to the link 
    //   links[links.length-1]._id = newId;
    //   console.log("added link ID:", links[links.length-1]._id);
    // })
    // console.log("added link:", lk);
  }
  this.addLinkedNode = function(lk){
    Modal.show('nodeOptions',{
      node: lk.target,
      sourceID: lk.source._id,
      tree: tree
    }); 
  }
  this.addNode = function(nd){
    Modal.show('nodeOptions',{
      node: nd,
      tree: tree
    }); 
  }
  this.deleteNode = function(nd){
    Meteor.call("deleteNode",nd._id);
    // spliceLinksForNode(nd);
    tree.redraw();
  }
  this.deleteLink = function(lk){
    // links.splice(links.indexOf(lk), 1);
    Meteor.call("deleteLink",lk._id);
    tree.redraw();
  }
  this.updateSelection = function(){
    link
      .classed("link_selected", function(d) { 
        return d === gui.selected_link; 
        });
    node
      .classed("node_selected", function(d) { 
        return d === gui.selected_node; });
  }

  // }); });

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  }

  // rescale g
  function rescale() {
    var transl=d3.event.translate;
    var scale = d3.event.scale;
    // console.log("translate", transl);
    vis.attr("transform",
        "translate(" + transl + ")"
        + " scale(" + scale + ")");
  }

}