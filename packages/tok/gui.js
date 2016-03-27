//This part handles user interaction functions

GUI = function(tree){

var gui = this;
this.selected_node = null;
this.selected_link = null;

// mouse event vars
var mousedown_link = null,
    mousedown_node = null,
    mousedown_node_DOM = null,
    mouseup_node = null;

// line displayed when creating new nodes
var drag_line = tree.drag_line.append("line")
    .attr("class", "drag_line_hidden")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 0);

// drag behavior
var nodeDrag = tree.force.drag()
      .on("dragstart",function(d){d.dragging=true;})
      .on("dragend",function(d){d.dragging=false});

// tree.vis.call(zoom)
//     .on("dblclick.zoom", null)
//     .append('svg:g');

var resetMouseVars = function() {
  // console.log("resetting mouse");
  mousedown_node = null;
  mousedown_node_DOM = null;
  mouseup_node = null;
  mousedown_link = null;
}

//Mouse actions - set to bubble up form deepest-level SVGs
//node events executed first:
this.nodeClick = function(d){
  console.log("clicked node:", d);
  if (d == gui.selected_node) gui.selected_node = null;
  else gui.selected_node = d; 
  gui.selected_link = null; 
  tree.updateSelection(); 
}
this.nodeDblClick = function(d){
  Modal.show('nodeOptions',{
    node: d,
    tree: tree
  });
}
this.linkMousedown = function(d) { //easier to catch than Click
  console.log("clicked link:", d);
  if (d == gui.selected_link) gui.selected_link = null;
  else gui.selected_link = d
  gui.selected_node=null;
  tree.updateSelection(); 
}
this.linkDblClick = function(d){
  var lk={};
  for(var attr in d) lk[attr] = d[attr];
  lk.source = d.source._id;
  lk.target = d.target._id;
  Modal.show('linkOptions',{
    link: lk,
    tree: tree
  });
}
this.nodeMousedown = function (d) { 
    // console.log("node mouse down");
  if (d3.event.ctrlKey) { //Creating new node or link:
    mousedown_node = d;
    mousedown_node_DOM = this;
    // console.log("Ctrl+drag!!");223
    d3.event.stopPropagation(); //prevents panning
    // disable zoom and drag:
    // tree.vis.call(d3.behavior.zoom().on("zoom"), null);
    // tree.vis.call(d3.behavior.zoom().on("zoom", null));
    // tree.vis.on(".zoom",null);
    d3.select(this).on(".drag",null);

    // visualize and reposition drag line
    drag_line
        .attr("class", "drag_line")
        .attr("x1", mousedown_node.x)
        .attr("y1", mousedown_node.y)
        .attr("x2", mousedown_node.x)
        .attr("y2", mousedown_node.y);
  }
};
this.nodeMouseup = function(d) { //Create new link:
  if (mousedown_node) {
    
    mouseup_node = d; 

    if (mouseup_node != mousedown_node) { 
      d3.event.stopPropagation(); //prevent anything else from happening
      tree.addLink({source: mousedown_node, target: mouseup_node});
    }
    // enable zoom and drag:
    // tree.vis.call(zoom);
    d3.select(mousedown_node_DOM).call(nodeDrag);
    // console.log(gui.selected_node, gui.selected_link);
  }
  d.dragging=false;
  drag_line.attr("class", "drag_line_hidden");
  resetMouseVars(); 
};

this.nodeMouseover = function(d){
  d3.select(this)
      .classed("fixed",d.fixed=true);
}

this.nodeMouseout = function(d){
  if(!d.dragging){
    d3.select(this)
        .classed("fixed",d.fixed=false);
  }

}

this.mousemove = function() {
  if (!mousedown_node) {return};

  // update drag line
  drag_line
      .attr("x1", mousedown_node.x)
      .attr("y1", mousedown_node.y)
      .attr("x2", d3.mouse(this)[0])
      .attr("y2", d3.mouse(this)[1]);

}

this.mouseup = function() {
  if (mousedown_node) {//create new node:
    //enable drag:
    d3.select(mousedown_node_DOM).call(nodeDrag);

    if (!mouseup_node) {
      // add node
      var point = d3.mouse(this),
          node = {x: point[0], y: point[1]};
      tree.addLinkedNode({source: mousedown_node, target: node});
    }

  }
  // hide drag line
  drag_line.attr("class", "drag_line_hidden");
  // clear mouse event vars
  resetMouseVars();
}

this.dblclick = function(){
  if(!mousedown_node){
    var point = d3.mouse(this),
          node = {x: point[0], y: point[1]};
    tree.addNode(node);
  }
  resetMouseVars();
}


this.keydown = function() {
  if (!gui.selected_node && !gui.selected_link) return;
  switch (d3.event.keyCode) {
    case 8: // backspace
    case 46: { // delete
      if (gui.selected_node) {
        tree.deleteNode(gui.selected_node);
      }
      else if (gui.selected_link) {
        tree.deleteLink(gui.selected_link);
      }
      gui.selected_link = null;
      gui.selected_node = null;
      // tree.redraw();
      break;
    }
  }
}

//Export some local variables and functions:
this.nodeDrag = nodeDrag;

}