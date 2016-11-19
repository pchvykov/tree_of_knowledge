//This part handles user interaction functions

GUI = function(tree){

var gui = this;
gui.tree=tree;
this.contentPopup=null;
this.editPopup=null;
this.selected = null;

Session.set('clipBoard',null);
// mouse event vars
var mousedown_link = null,
    mousedown_node = null,
    mousedown_node_DOM = null,
    mouseup_node = null,
    clickTimer=null;

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

var resetMouseVars = function() {
  // console.log("resetting mouse");
  mousedown_node = null;
  mousedown_node_DOM = null;
  mouseup_node = null;
  mousedown_link = null;
}

//delete content popup window:
this.hideContent = function(){
  if(gui.contentPopup){
    Blaze.remove(gui.contentPopup); 
    gui.contentPopup=null;
  }
}
//Show object content in a popup:
this.showContent = function(d){
  //delete existing popup window
  gui.hideContent();
  //show node info about gui.selected_node in a popup:
  gui.selected = d; 
  if(d.source){
    gui.contentPopup=Blaze.renderWithData(Template.linkContent, 
    gui, tree.svg.node().parentNode);
  }
  else {
    gui.contentPopup=Blaze.renderWithData(Template.nodeContent, 
    gui, tree.svg.node().parentNode);
  }
  var offset = tree.svg.node().getBoundingClientRect();
  $('#contentPopup').offset({
    top:offset.top+5+window.scrollY, 
    left:offset.left+5+window.scrollX
  })
  if(gui.editPopup){
    $('#contentPopup').height(Math.round(tree.canvasSize[1]/3))
  }

  //update which nodes/links show up as selected:
  tree.updateSelection(); 
}

//Edit object content in a popup:
//see popups.js for calls to updating DB
this.showEditor = function(d, srcID){
  if(gui.editPopup) return;
  if(d.source){ //if a link is selected... edit
    if(srcID) console.error("wrong inputs for showEditor");
    gui.editPopup=Blaze.renderWithData(Template.linkOptions, 
      {
        link:d,
        gui:gui
      }, tree.svg.node().parentNode);
  }
  else{
    gui.editPopup=Blaze.renderWithData(Template.nodeOptions, 
      {
        node:d,
        sourceID: srcID,
        gui:gui
      }, tree.svg.node().parentNode);
  }
  var offset = tree.svg.node().getBoundingClientRect();
  $('#editPopup').offset({
    top:offset.top+Math.round(tree.canvasSize[1]/3)+30+window.scrollY, 
    left:offset.left+5+window.scrollX
  })
  $('#editPopup').css({"max-height": 
    (Math.round(tree.canvasSize[1]*2/3)-40)+'px'});
  //make text-area resize automatically (2nd argument to keep scrollbar in check:)
  autoSizeTextarea(document.getElementById('content'), 
    $('#editPopup'));
  gui.showContent(d);
}
//Mouse actions - set to bubble up form deepest-level SVGs
//node events executed first:
this.nodeClick = function(d){
  //manual double click implementation:
  if(!clickTimer){ clickTimer= setTimeout(function(){
    //Single click callback
    clickTimer=null;
    if (d == gui.selected) { //if un-selecting
      gui.hideContent();
      gui.selected = null;
      //update which nodes/links show up as selected:
      tree.updateSelection(); 
    }
    else {
      gui.showContent(d);
    }
    console.log("selected node:", gui.selected);  
    }, 300);}
  else{ //if double-clicking
    clearTimeout(clickTimer); clickTimer=null;
    gui.showEditor(d); 
  }
}
// this.nodeDblClick = function(d){
//   // Modal.show('nodeOptions',{
//   //   node: d,
//   //   tree: tree
//   // });
//   console.log("dblclick!!!");
//   clearTimeout(clickTimer); clickTimer=null;
//   gui.showEditor(d);  
// }
this.linkMousedown = function(d) { //easier to catch than Click
  if(!clickTimer){ clickTimer= setTimeout(function(){
    clickTimer=null;
  if (d == gui.selected) {
    gui.hideContent();
    gui.selected = null;
    //update which nodes/links show up as selected:
    tree.updateSelection(); 
  }
  else {
    gui.showContent(d);
  }
  console.log("selected link:", gui.selected);
  }, 300)};
}
this.linkDblClick = function(d){
  d3.event.stopPropagation();
  clearTimeout(clickTimer); clickTimer=null;
  var lk={};
  for(var attr in d) lk[attr] = d[attr];
  lk.source = lk.source._id;
  lk.target = lk.target._id;
  // Modal.show('linkOptions',{
  //   link: lk,
  //   tree: tree
  // });
  gui.showEditor(lk);
}
this.nodeMousedown = function (d) { 
  d3.event.preventDefault();
    // console.log("node mouse down");
  if (d3.event.ctrlKey && !gui.editPopup) { 
  //Creating new node or link:
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
      if( tree.force.links().every(lk => 
        !((lk.source===mousedown_node || lk.target===mousedown_node) &&
        (lk.source===mouseup_node || lk.target===mouseup_node)))){
          tree.addLink({source: mousedown_node, target: mouseup_node});
        }
      else{
        alert("Can't have double links!");
        drag_line.attr("class", "drag_line_hidden");
      }
    }
    // enable zoom and drag:
    // tree.vis.call(zoom);
    d3.select(mousedown_node_DOM).call(nodeDrag);
    // console.log(gui.selected_node, gui.selected_link);
  }
  d.dragging=false;
  // drag_line.attr("class", "drag_line_hidden");
  resetMouseVars(); 
};
//fix links/nodes on hover to make them easier to select:
this.nodeMouseover = function(d){
  if(!d.dragging){
    d3.select(this)
        .classed("fixed",d.fixed=true);
    if(this.parentNode.tooltip) 
      this.parentNode.tooltip.classed("show",true);
  }
}

this.nodeMouseout = function(d){
  if(!d.dragging){
    d3.select(this)
        .classed("fixed",d.fixed=false);
    if(this.parentNode.tooltip) 
      this.parentNode.tooltip.classed("show",false);
  }

}
this.linkMouseover=function(d){
  if(!(d.source.dragging || d.target.dragging)){
    d.source.fixed=true;
    d.target.fixed=true;
    d3.select(this).classed("fixed",true);
  }
}
this.linkMouseout=function(d){
  if(!(d.source.dragging || d.target.dragging)){
    d.source.fixed=false;
    d.target.fixed=false;
    d3.select(this).classed("fixed",false);
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
  // // hide drag line
  // drag_line.attr("class", "drag_line_hidden");
  // clear mouse event vars
  resetMouseVars();
}

this.dblclick = function(){
  if(!mousedown_node && !gui.editPopup){
    var point = d3.mouse(this),
          node = {x: point[0], y: point[1]};
    tree.addNode(node);
  }
  resetMouseVars();
}


this.keydown = function() {
  if (!gui.selected) return;
  switch (d3.event.keyCode) {
    case 8: // backspace
    case 46: { // delete
      if(d3.event.ctrlKey){
        //use "source" attribute to determine 
        //whether "selected" is a link:
        if (gui.selected.source) {
          tree.deleteLink(gui.selected);
        }
        else {
          tree.deleteNode(gui.selected);
        }
        gui.selected = null;
        gui.hideContent();
        // tree.redraw();
      }break}
    case 67: { if(d3.event.ctrlKey){//Ctrl+C - copy object data
        var obj={};
        for(var attr in gui.selected) { //copy all but these prop-s:
          if(["source","target","_id","x","y","px","py","index"].indexOf(attr)<0){
            obj[attr] = gui.selected[attr];
          }
        }
        console.log(obj);
        Session.set('clipBoard',obj);
      }break}
    case 86: { if(d3.event.ctrlKey){//Ctrl+V - paste obj data, not saved to DB!!
        var obj=Session.get('clipBoard');
        for(var attr in obj) gui.selected[attr]=obj[attr];
        notify("Double-click to save");
      }break}
  }
}

//Export some local variables and functions:
this.nodeDrag = nodeDrag;
this.drag_line=drag_line;
}