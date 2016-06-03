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
  //size of the displayed portion:
  var width = svg.attr("width"),
      height = svg.attr("height");
  this.canvasSize=[width, height];
  //size of the entire tree page:
  var treeDim = [5000, 5000];

  // init svg, registers events:
  var outer = svg.append("svg:svg")
      .attr("pointer-events", "all");

  //visualized picture, moves with pan/zoom:
  //initialize the starting offset to center tree:
  var vis = outer
  .append('svg:g')
    .attr("transform", 
      "translate(" + [(width-treeDim[0])/2, (height-treeDim[1])/2] + ")")
    .call(d3.behavior.zoom().on("zoom", rescale))
    .on("dblclick.zoom", null)
  .append('svg:g');

// vis.attr("width",treeWidth)
//    .attr("height",treeHeight);
//    .attr("transform",
//        "translate(" + transl0 + ")");
vis.append('svg:rect')
    .attr('width', treeDim[0])
    .attr('height', treeDim[1])
    .attr('fill', 'white');


  // init force layout
  var force = d3.layout.force()
      .size(treeDim)
      // .nodes(nodeData)
      // .links(linkData)
      // .linkDistance(5)
      // .charge(-80)
      // .chargeDistance(250) //change with rescaling!
      .friction(0.9)
      .on("tick", tick)
      .on("end", function(){
          Meteor.call("updateCoord",force.nodes())
        });
    // console.log("chdist",force.chargeDistance());

  // var bckgnd = vis.append('svg:g');
  this.drag_line = vis.append('svg:g');

  //export local variables:
  this.force = force;
  this.vis = vis;
  var gui = new GUI(this);
  vis.on("mousemove", gui.mousemove)
    .on("mouseup", gui.mouseup, false)
    .on("dblclick", gui.dblclick, false);

  // get existing layout properties (enpty at start)
  var node = vis.selectAll(".node"),
      link = vis.selectAll(".link");

  
  // add keyboard callback
  d3.select(window)
      .on("keydown", gui.keydown);


  // pull data from server and redraw force layout
  this.redraw = function() {
    //store current node coordinates to restart from same position:
  if(force.nodes().length >0) Meteor.call("updateCoord",force.nodes())
  db.subscribe(function(){
    console.log("redrawing");
    var linkData=db.Links.find({}).fetch();
    var nodeData=db.Nodes.find({}).fetch();
    //replace node id-s in links with pointers to nodes
    linkData.forEach(function(lk, idx){
      lk.source = nodeData.find(function(nd){return nd._id == lk.source});
      lk.target = nodeData.find(function(nd){return nd._id == lk.target});
      if(!lk.source || !lk.target) console.error("orphaned link! ", lk._id);
      // console.log("lk", lk._id, lk.source, lk.target);
    });
    //initialize all node velocities to 0:
    nodeData.forEach(function(nd){
      nd.px=nd.x;
      nd.py=nd.y;
    });

    // console.log("links here", linkData)    

    //update data on d3 objects (SVGs), bind using _id:
    node = node.data(nodeData, function(d){return d._id});
        
    //create group for each node:
    var newNodes = node.enter().append("svg:g")
        .attr("class","node-outer")
        // .attr("id",function(d){return d._id}) //for selection
        .call(gui.nodeDrag);
    newNodes.append("circle")
        .attr("class", "node") //styling
        .on("mouseover", gui.nodeMouseover)
        .on("mouseout", gui.nodeMouseout)
        .on("mousedown",gui.nodeMousedown, false) //callbacks
        .on("mouseup", gui.nodeMouseup, false) //bubble event propagation
        .on("click", gui.nodeClick,false)
        .on("dblclick", gui.nodeDblClick,false)
        .transition()
        .duration(750)
        .ease("elastic")
        // using lookback/meteor-tooltips library:
        // .attr("data-tooltip", function(d){return d.title})
        // .attr("data-tooltip-top", function(d){
        //   return 10 + parseFloat(this.getAttribute("r"));
        // });
    // Add tooltip for each:-------
    //as SVG text and backgnd rect: - can't render MathJax
    // var newTT=newNodes.append("svg:g") 
    //         .attr("class",'tooltip1')
    //         .style("opacity", 0.5)
    // var text=newTT.append('text')
    //         .text(function(d){return d.title});      
    // text.each(function(d,idx){
    //   var bbox=this.getBBox();
    //   var padding=3;
    //   d3.select(this.parentNode)
    //       .insert("rect","text")
    //       .attr("x", bbox.x - padding)
    //       .attr("y", bbox.y - padding)
    //       .attr("width", bbox.width + (padding*2))
    //       .attr("height", bbox.height + (padding*2))
    //       .style("fill", "blueviolet");
    // })

    //Tooltips as foreignObject: (position in tick and rescale) 
    //problems rendering MathJax
    // newNodes.append("svg:foreignObject")
    //       // .attr("width",100)
    //       // .attr("height",100)
    //       .append("xhtml:div")
    //       .attr("class",'tooltip')
    //       .append("xhtml:span") 
    //       .attr("class",'inner');

    //Tooltips as divs in the body, with reference to node SVG:
    newNodes.each(function(d, idx){
      var newTT=d3.select('#allTooltips')
          .append("xhtml:div")
          .attr("class",'tooltip');
      newTT.datum(this)
          .append("xhtml:span") 
          .attr("class",'inner');
      this.tooltip=newTT; //newTT - d3 elt, this - DOM elt
    })

    d3.selectAll('.tooltip .inner')
          .text(function(d){return d3.select(d).datum().title});

    node.exit().each(function(){this.tooltip.remove();})
    node.exit().select('.node')
        .transition()
        .attr("r", 0);
    node.exit().remove();
    //Formatting interactions:
    node.select('.node')
        .attr("r", function(d){return d.importance}) //radius
    force.charge(function(d){return -Math.pow(d.importance/2,3)})

    //re-render all math - in the entire page!
    if(typeof MathJax !== 'undefined') MathJax.Hub.Queue(["Typeset", MathJax.Hub]); 
    Session.set('lastUpdate', new Date() );

    //For links-----------------------
    link = link.data(linkData, function(d){return d._id});
    //show new SVG-s for new links
    link.enter()
        .insert("line", ".node-outer")
        .attr("class", "link")
        .on("mouseover", gui.linkMouseover)
        .on("mouseout",gui.linkMouseout)
        .on("click", gui.linkMousedown,false)
        .on("dblclick", gui.linkDblClick,false);//bubble events
        // .each(function(d){
        //   console.log(d);
        //   d.source = d3.select("#"+d.source);
        //   d.target = d3.select("#"+d.target);
        // })
         
    //delete SVG-s for deleted links
    link.exit().remove();
    // console.log('link',gui.selected_link);
    // console.log('node',gui.selected_node);

    //style and behavrior according to datum:
    link.style({
      "stroke-width":function(d){
        return d.strength+'px';
      }
    })
    link.each(function(d){
      switch(d.type){
        case "theorem": break;
        case "conjecture": break;
        case "related": 
          $(this).css("stroke-dasharray",5); break;
        case "specialCase": break;
        default: console.error("unrecognized link type:", d.type, d);
      }
    })
    force.linkDistance(function(d){ //ensure that links are visible
      return (parseFloat(d.source.importance)+
        parseFloat(d.target.importance))*1.2;
    })
      .linkStrength(function(d){
        return d.strength/10;
      })

    //show the selection correctly:
    tree.updateSelection();

    if (d3.event) {
      // prevent browser's default behavior
      d3.event.preventDefault();
    }

    //Update the force graph:
    force.nodes(nodeData)
        .links(linkData);
    force.start();
    force.alpha(0.06);
  })
  }
    
  this.redraw();

  //Position tooltip divs next to their nodes:
  function positionTooltips(){
    d3.selectAll('.tooltip').each(function(d,idx){
      // var bbox=this.parentNode.parentNode.getBoundingClientRect();
      var bbox=d.getBoundingClientRect();
      this.style.left=(bbox.left+bbox.right-
        this.firstChild.offsetWidth)/2 -8
            +window.scrollX+'px';
      this.style.top=bbox.top
            +window.scrollY+'px';
        // this.firstChild.offsetHeight -16+'px';
    })
  }

  this.addLink = function(lk){
    // Modal.show('linkOptions',{
    //   link: {source: lk.source._id, target: lk.target._id},
    //   tree: tree
    // }); 
    gui.showEditor({source: lk.source._id, target: lk.target._id});
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
    // Modal.show('nodeOptions',{
    //   node: lk.target,
    //   sourceID: lk.source._id,
    //   tree: tree
    // }); 
    // lk.target.title='...';
    gui.showEditor(lk.target, lk.source._id);
  }
  this.addNode = function(nd){
    // Modal.show('nodeOptions',{
    //   node: nd,
    //   tree: tree
    // }); 
    // nd.title='...';
    gui.showEditor(nd);
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
    if(gui.selected){
      link
        .classed("link_selected", function(d) { 
          return d._id == gui.selected._id;
          });
      node.select('.node')
        .classed("node_selected", function(d) { 
          return d._id == gui.selected._id;
         });
    }
    else{
      link.classed("link_selected", false);
      node.select('.node').classed("node_selected", false);
    }
    if(gui.editPopup){
      var editID = Blaze.getData(gui.editPopup);
      if(editID.node) editID=editID.node._id;
      else editID=editID.link._id;
      // console.log(editID)
      link
        .classed("link_edited", function(d) { 
          return d._id == editID;
          });
      node.select('.node')
        .classed("node_edited", function(d) { 
          return d._id == editID;
         });
    }
    else{
      link.classed("link_edited", false);
      node.select('.node').classed("node_edited", false);
      }
  }

  // }); });

  function tick() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    //position the node group:
    node.attr("transform",function(d){
      return ("translate("+d.x+','+d.y+')')});
    // attr("x", function(d) { return d.x; })
    //     .attr("y", function(d) { return d.y; });
    positionTooltips();
  }

  // rescale g
  function rescale() {
    var transl=d3.event.translate;
    var scale = d3.event.scale;
    // console.log("translate", transl, [transl[0]+transl0[0],transl[1]+transl0[1]]);
    vis.attr("transform",
        "translate(" + transl + ")"
        + " scale(" + scale + ")");
    positionTooltips();
  }

}