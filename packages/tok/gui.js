GUI = function(tree){

var gui = this;
this.selected_node = null;
this.selected_link = null;

// mouse event vars
var mousedown_link = null,
    mousedown_node = null,
    mousedown_node_DOM = null,
    mouseup_node = null;

// line displayed when dragging new nodes
var drag_line = tree.drag_line.append("line")
    .attr("class", "drag_line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 0);

var nodeDrag = tree.force.drag()
      .on("dragstart",function(d){d.dragging=true})
      .on("dragend",function(d){d.dragging=false});
var zoom = d3.behavior.zoom()
      .on("zoom", rescale);
tree.vis.call(zoom)
    .on("dblclick.zoom", null)
    .append('svg:g');

var resetMouseVars = function() {
  // console.log("resetting mouse");
  mousedown_node = null;
  mousedown_node_DOM = null;
  mouseup_node = null;
  mousedown_link = null;
}

//Mouse actions when not dragging nodes
//(zoom and pan):
this.mousedown = function() {
  // if (!mousedown_node && !mousedown_link) {
  //   // allow panning if nothing is selected
  //   // tree.vis.call(d3.behavior.zoom().on("zoom", rescale));
  //   // console.log("mousedown");
  //   // tree.vis.call(zoom)
  //   //   .on("dblclick.zoom", null)
  //   //   .append('svg:g');
  //   d3.event.preventDefault();
  //   return;
  // }
}

this.mousemove = function() {
  if (!mousedown_node) {return};

  // update drag line
  drag_line
      .attr("class", "drag_line")
      .attr("x1", mousedown_node.x)
      .attr("y1", mousedown_node.y)
      .attr("x2", d3.mouse(this)[0])
      .attr("y2", d3.mouse(this)[1]);

}

this.mouseup = function() {
  // hide drag line
  drag_line.attr("class", "drag_line_hidden");
  if (mousedown_node) {
    //enable drag:
    d3.select(mousedown_node_DOM).call(nodeDrag);

    if (!mouseup_node) {
      // add node
      var point = d3.mouse(this),
        node = {x: point[0], y: point[1]};
      tree.addNode(node);     

      // select new node
      gui.selected_node = node;
      gui.selected_link = null;
      
      // add link to mousedown node
      // var link={source: mousedown_node, target: node};
      tree.addLink({source: mousedown_node, target: node});
      // Meteor.call("addLink",link);
    }

    tree.redraw();
  }
  // clear mouse event vars
  resetMouseVars();
}

this.nodeMousedown = function (d) { 
    // console.log("node mouse down");
  mousedown_node = d;
  mousedown_node_DOM = this;
  if (mousedown_node == gui.selected_node) gui.selected_node = null;
  else gui.selected_node = mousedown_node; 
  gui.selected_link = null; 

  if (d3.event.ctrlKey) {
    console.log("Ctrl+drag!!");
    d3.event.stopPropagation();
    // disable zoom and drag:
    // tree.vis.call(d3.behavior.zoom().on("zoom"), null);
    // tree.vis.call(d3.behavior.zoom().on("zoom", null));
    // tree.vis.on(".zoom",null);
    d3.select(this).on(".drag",null);

    // reposition drag line
    drag_line
        .attr("x1", mousedown_node.x)
        .attr("y1", mousedown_node.y)
        .attr("x2", mousedown_node.x)
        .attr("y2", mousedown_node.y);
  }
  else resetMouseVars();
  tree.redraw(); 
};
this.nodeMouseup = function(d) { 
  drag_line.attr("class", "drag_line_hidden");
  d.dragging=false;
  if (mousedown_node) {
    
    mouseup_node = d; 

    if (mouseup_node != mousedown_node) { 
      // add link
      var link = {source: mousedown_node, target: mouseup_node};
      tree.addLink(link);

      // select new link
      gui.selected_link = link;
      gui.selected_node = null;
    }
    // enable zoom and drag:
    // tree.vis.call(zoom);
    d3.select(mousedown_node_DOM).call(nodeDrag);
    // console.log(gui.selected_node, gui.selected_link);
    tree.redraw();
  }
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

this.linkMousedown = function(d) { 
  mousedown_link = d; 
  if (mousedown_link == gui.selected_link) gui.selected_link = null;
  else gui.selected_link = mousedown_link; 
  gui.selected_node = null; 
  tree.redraw(); 
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
      tree.redraw();
      break;
    }
  }
}

// rescale g
function rescale() {
  var transl=d3.event.translate;
  var scale = d3.event.scale;
  // console.log("translate", transl);
  tree.vis.attr("transform",
      "translate(" + transl + ")"
      + " scale(" + scale + ")");
}

//Export some local variables and functions:
this.nodeDrag = nodeDrag;
this.zoom = zoom;

}