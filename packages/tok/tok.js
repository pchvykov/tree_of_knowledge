//This bit handles all the tree operations with d3
//d3.force is their force-directed graph
//Links and Nodes are database arrays
//links and nodes are arrays in the d3.force
//and link and node are visualized d3 object arrays (almost SVGs)

//Globals: list of node and link types
nodeTypes={'assumption':'Assumption',
           'definition':'Definition',
           'statement':'Statement',
           'example':'Example',
           'empirical':'Empirical',
           'concept':'Concept',
           'derivation':'Derivation'};
linkTypes={'theorem':'Theorem',
           'conjecture':'Conjecture',
           'related':'Related',
           'specialCase':'Special Case'};

  //Hierarchy of objects:
  //svg > outer > vis > bckgnd,drag_line,node,link


ToK = function(svg, db) {

  var tree=this;
  this.svg=svg;

  var forceRun=false;
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
    .attr('fill', '#EEE'); //make slightly grey s.t. it's visible


  // init force layout
  var nodeData, linkData;
  var force = d3.layout.force()
      .size(treeDim)
      .gravity(0)
      // .nodes(nodeData)
      // .links(linkData)
      // .linkDistance(5)
      // .charge(-80)
      // .chargeDistance(250) //change with rescaling!
      .friction(0.9)
      .on("tick", tick)
      .on("end", function(){
          Meteor.call("updateCoord",force.nodes());
          notify('coordinates fixed');
        });

    // console.log("chdist",force.chargeDistance());

  // var bckgnd = vis.append('svg:g');
  this.drag_line = vis.append('svg:g');

/////// SVG shapes definitions //////////////
  //Arrowhead markers definition:
  svg.append("defs").append("marker")
    .attr("id", "arrowHead")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 1)
    .attr("refY", 5)
    .attr("markerWidth", 3)
    .attr("markerHeight", 3)
    .attr("orient", "auto")
  .append("path")
    .attr("d", "M 0 0 L 7 5 L 0 10 z")
    .attr("fill", "context-stroke")
    // .style("fill", "#999")
    .style("opacity", "0.5");

  svg.select("defs").append("circle")
      .attr("id", "circleNode")
      .attr("r",1)

  svg.select("defs").append("polygon")
      .attr("id", "andNode")
      .attr("points","-1,-0.2 0,0.8 1,-0.2")  

  //function to select node shape:
  var nodeShape = function(ndType){
    if(ndType=="derivation") 
      return "#andNode"
    else return "#circleNode"
  }
///////////////////////////////////////////////

  //export local variables:
  this.force = force;
  this.vis = vis;
  var gui = new GUI(this); this.gui=gui;
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
  this.redraw = function(postScript) { //execte postScrip() at the end
  //store current node coordinates to restart from same position:
  if(force.nodes().length >0) Meteor.call("updateCoord",force.nodes())
  if(db.ndSubscr){
    db.ndSubscr.stop();//clear client collections
    db.lkSubscr.stop();
  }
  db.subscribe(function(){
    console.log("redrawing");
    linkData=Links.find({}).fetch();
    nodeData=Nodes.find({}).fetch(); //contains only published data
    // console.log(nodeData.length);
    nodeData.forEach(function(nd){
      //initialize all node velocities to 0:
      // nd.x=treeDim[0]/2; nd.y=treeDim[1]/2;
      nd.px=nd.x;
      nd.py=nd.y;
      //indices of parent nodes in nodeData (for oriented links only)
      nd.parentsIx = linkData 
          .filter(lk => nd._id==lk.target && lk.oriented)
          .map(lk => 
            nodeData.findIndex(ndDat => ndDat._id==lk.source));
      nd.childrenIx = linkData 
          .filter(lk => nd._id==lk.source && lk.oriented)
          .map(lk => 
            nodeData.findIndex(ndDat => ndDat._id==lk.target));
    });

    //replace node id-s in links with pointers to nodes
    //note: link.source prop used to distinguish links and nodes
    linkData.forEach(function(lk, idx){
      lk.source = nodeData.find(function(nd){return nd._id == lk.source});
      lk.target = nodeData.find(function(nd){return nd._id == lk.target});
      if(!lk.source || !lk.target) console.error("orphaned link! ", lk._id);
      // console.log("lk", lk._id, lk.source, lk.target);
    });

    // console.log("links here", linkData)    

    //update data on d3 objects (SVGs), bind using _id:
    //node.enter() is a selection of all the new nodes
    node = node.data(nodeData, function(d){return d._id});
        
    //create group for each node:
    var newNodes = node.enter().append("svg:g")
        .attr("class","node-outer")
        // .attr("id",function(d){return d._id}) //for selection
        .call(gui.nodeDrag);

    //choose node shape:
    newNodes.append("use")//append("circle").attr("r",1)
        .attr("class", "node") //styling
        .on("mouseover", gui.nodeMouseover)
        .on("mouseout", gui.nodeMouseout)
        .on("mousedown",gui.nodeMousedown, false) //callbacks
        .on("mouseup", gui.nodeMouseup, false) //bubble event propagation
        .on("click", gui.nodeClick,false)
        .on("contextmenu", gui.nodeRightClick, false)
        // .on("dblclick", gui.nodeDblClick, false) //implemented in click callback
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
      if(d.type == "derivation") return; //no tooltips for derivations
      var newTT=d3.select('#allTooltips')
          .append("xhtml:div")
          .attr("class",'tooltipO');
      newTT.datum(this) //store node DOM el't in datum
          .append("xhtml:span") 
          .attr("class",'inner');
      this.tooltip=newTT; //newTT - d3 elt, this - DOM elt
    })

    d3.selectAll('.tooltipO .inner')
          .text(function(d){return d3.select(d).datum().title});

    node.exit().each(function(){if(this.tooltip) this.tooltip.remove();})
    node.exit().select('.node')
        .transition()
        .attr("transform","scale(0)")
        // .attr("r", 0);
    node.exit().remove();
    //Formatting interactions:
    node.select('.node')
        .attr("xlink:href", d => nodeShape(d.type))
        // .attr("width", d => d.importance)
        // .attr("height", d=> d.importance)
        .attr("transform", d => "scale("+d.importance*$('#sizeInput').val()+")")
        //work-around to keep stroke-width independent of size:
        .attr("stroke-width",d => 3/d.importance)
        // .attr("r", function(d){return d.importance}) //radius
    force.charge(function(d){return - $('#ChargeInput').val()/2*Math.pow(d.importance,2)})
    // force.chargeDistance($('#chrgDistInput').val())
  
    //re-render all math - in the entire page!
    if(typeof MathJax !== 'undefined') MathJax.Hub.Queue(["Typeset", MathJax.Hub]); 
    Session.set('lastUpdate', new Date() );

    //For links-----------------------

    link = link.data(linkData, function(d){return d._id});
    //show new SVG-s for new links
    link.enter()
        .insert("polyline", ".node-outer")
        .attr("class", "link")
        // .style("marker-mid",  "url(#arrowHead)")
        .on("mouseover", gui.linkMouseover)
        .on("mouseout",gui.linkMouseout)
        .on("mousedown", gui.linkMousedown)
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
        return d.strength*$('#sizeInput').val()+'px';
      },
      "marker-mid":function(d){
        return (d.oriented ?  "url(#arrowHead)" : null) //Arrow heads
      }
    })
    link.each(function(d){
      switch(d.type){
        //other line options: polyline coord to make double line;
        //polyline with many segments and different shape markers 
        //at each junction, then remove backgnd line;
        //polyline to make long narrow triangle line
        case "theorem": 
          $(this).css("stroke-dasharray","none");break;
        case "conjecture": 
          $(this).css("stroke-dasharray","10,3");break;
        case "related": 
          $(this).css("stroke-dasharray","3,7"); break;
        case "specialCase": break;
        default: console.error("unrecognized link type:", d.type, d);
      }
    })
    // force.linkDistance(function(d){ //ensure that links are visible
    //   return (parseFloat(d.source.importance)+
    //     parseFloat(d.target.importance))*1.2;
    // })
    //   .linkStrength(function(d){
    //     return 0;//d.strength/10;
    //   })
    linkData.forEach(function(lk){ //ensure that links are visible
      lk.minDist = (parseFloat(lk.source.importance)+
        parseFloat(lk.target.importance))*1.2;
      switch(lk.type){ //set the transition distances
        case 'theorem': lk.transDist=150; break;
        case 'conjecture': lk.transDist=100; break;
        case 'related': lk.transDist=70; break;
      }
    })

    //show the selection correctly:
    tree.updateSelection();

    if (d3.event) {
      // prevent browser's default behavior
      d3.event.preventDefault();
    }

    //Update the force graph:
    force.nodes(nodeData)
        // .links(linkData); //implemented by hand
    force.start();
    force.alpha(0.06);

    if(postScript){postScript();
      console.log('redraw passed postScript function');} //run the passed function
  })
  }

  this.redraw();

  //Make a "RUN" button (to keep relaxing the graph while held down):
  var runBt= svg.append('svg:g')
      .attr('id','runButton')
      .attr("transform",
        "translate("+(width-50)+','+2.5+')')
      .on('mousedown',()=>{
        forceRun=true;
        force.alpha(0.1);
        // force.restart();
      },true)
      .on('mouseup',()=>{forceRun=false;},true)
      // .attr("x",width-50).attr("y",10)
  runBt.append('rect')
      .attr("width",40).attr("height",30)
      
  runBt.append('svg:text').text('>>>')
      .attr('x',3).attr('y',"1em")

  //Position tooltip divs next to their nodes:
  function positionTooltips(){
    d3.selectAll('.tooltipO').each(function(d,idx){
      // var bbox=this.parentNode.parentNode.getBoundingClientRect();
      var bbox=d.getBoundingClientRect(); //node bbox
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
  this.updateSelection = function(){ //update the CSS classes appropriately
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

  $('#randomize').click(function(){
    nodeData.forEach(function(nd){
      nd.x=treeDim[0]/2 +Math.random()*100; 
      nd.y=treeDim[1]/2 +Math.random()*100;
    })
  })
  // }); });

  function tick(e) {
    //keep running while RUN is held down:
    if(forceRun) force.alpha(0.1);
    
    //create custom forces:
    var g = 30 * e.alpha; //e.alpha = 0.1 maximum
    nodeData.forEach(function(nd){
    

      //include gravity (charge-independent):
      var grav=0.01*$('#gravInput').val(); //strength of the centering gravity force
      nd.x -= grav*e.alpha*(nd.x-treeDim[0]/2);
      nd.y -= grav*e.alpha*(nd.y-treeDim[1]/2);

      //Add noise for annealing (quadratic s.t. dies faster than motion stops):
      nd.x +=g*g*(Math.random()-0.5)*nd.importance/100;
      nd.y +=g*g*(Math.random()-0.5)*nd.importance/100;
    })

    //Link forces:
    linkData.forEach(function(lk){
      //non-linear attraction:
      var delx=(lk.target.x - lk.source.x);
      var dely=(lk.target.y - lk.source.y);
      var len = Math.sqrt(delx*delx + dely*dely);

      var transDist = $('#linkDistInput').val();
      var lkStr= $('#linkStrInput').val();

      var scale=g/50 * Math.pow(lk.strength,2)*(len>transDist*lk.strength ? lk.strength*lkStr/len : $('#linkSStrInput').val())*
        (1 - lk.minDist / len);
      d3.selectAll('.link').filter(d => d._id==lk._id)
        .classed('long',len>transDist*lk.strength);
      var dx=delx*scale, dy=dely*scale;

      if(lk.oriented){ //orienting forces
        // var dy=g * Math.max(-2, Math.min(2,
        //   Math.exp((lk.source.y-lk.target.y)/100.)
        //   ));
        scale = - $('#linkOrtInput').val()*g*lk.strength/len*5*(Math.exp(-dely/len)-0.367879)*Math.sign(delx);
        dx -= dely*scale; dy += delx*scale;
      }
      var srcChrg=-force.charge()(lk.source), trgChrg=-force.charge()(lk.target);
      lk.source.x+=dx/srcChrg; lk.source.y+=dy/srcChrg; //divide by charge=mass to get acceleration
      lk.target.x-=dx/trgChrg; lk.target.y-=dy/trgChrg;
    })

    // link.attr("x1", function(d) { return d.source.x; })
    //     .attr("y1", function(d) { return d.source.y; })
    //     .attr("x2", function(d) { return d.target.x; })
    //     .attr("y2", function(d) { return d.target.y; });

    //Poistion all points on the links:
    link.attr("points", function(d){
      return d.source.x+','+d.source.y+' '+
          (d.source.x+d.target.x)/2+','+ //where to put the arrowhead
          (d.source.y+d.target.y)/2+' '+
             d.target.x+','+d.target.y;
    })

    //position the node group:
    node.attr("transform",function(d){
      //translate and Rotate the "derivation" triangles along the flow:
      if(d.type == "derivation" && d.parentsIx.length>0 && d.childrenIx.length>0){
        var rot = 180/Math.PI*Math.atan2((d.parentsIx.reduce((prev,idx) => 
          prev+nodeData[idx].x, 0.)/d.parentsIx.length - //average x of parents
        d.childrenIx.reduce((prev,idx) => 
          prev+nodeData[idx].x, 0.)/d.childrenIx.length), //average x of children
        -(d.parentsIx.reduce((prev,idx) => 
          prev+nodeData[idx].y, 0.)/d.parentsIx.length -
        d.childrenIx.reduce((prev,idx) => 
          prev+nodeData[idx].y, 0.)/d.childrenIx.length)) //y between parents and children c.o.m.
        // console.log(d._id,rot);
        return ("translate("+d.x+','+d.y+
          ') rotate('+rot+')')
      }
      //just translate everything else
      else  return ("translate("+d.x+','+d.y+')')
    });
    // attr("x", function(d) { return d.x; })
    //     .attr("y", function(d) { return d.y; });
    positionTooltips();

  }

  // var ctrlDn=false;
  // d3.select("body").on("keydown", function () {
  //     ctrlDn = d3.event.ctrlKey;
  // });

  // d3.select("body").on("keyup", function () {
  //     ctrlDn = false;
  // });

  // var zoomScale=1, prevScale=1;
  // rescale g (pan and zoom)
  function rescale() {
    var transl=d3.event.translate;
    var scale = d3.event.scale;
    // dScale=scale-prevScale; prevScale=scale;
    // console.log(scale, dScale)
    // //change node/link size instead if ctrl is held down:
    // //save to database on force.end, along with positions
    // if(ctrlDn && gui.selected){
    //   if(!gui.selected.source){//if not a link (so a node)
    //   gui.selected.importance=parseFloat(gui.selected.importance,10)*(1+dScale);
    //   console.log("importance",gui.selected.importance,dScale);
    //   node.select('.node_selected')
    //       //contingent on the size = importance field:
    //       .attr("transform", d => "scale("+gui.selected.importance+")")
    //       //work-around to keep stroke-width independent of size:
    //       .attr("stroke-width",d => 3/d.importance)
    //   force.charge(function(d){return -Math.pow(d.importance/2,3)})
    //   }
    //   else { //a link then

    //   }

    // }
    // else{ //else, zoom and pan:
      // zoomScale+=dScale;
      // console.log("zoomscale",zoomScale)
      vis.attr("transform",
          "translate(" + transl + ")"
          + " scale(" + scale + ")");
      positionTooltips();
    // }
  }

}