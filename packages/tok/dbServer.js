treeData = function(){
  // this.Nodes=Nodes;
  // this.Links=Links;
	console.log("nodes count:", Nodes.find({}).count());
	console.log("links count:", Links.find({}).count());
  db=this;

  this.loadJSON = function(graph){
      console.log("loading collection from json")
      //Clear all entries in current collection:
      // Nodes.remove({});
      // Links.remove({});
      // var graph = JSON.parse(Assets.getText(fileName));
      graph.nodes.forEach(function (item, index, array) {
        Nodes.insert(item);
      });
      graph.links.forEach(function (item, index, array) {
        Links.insert(item);
      });
      console.log("nodes count:", Nodes.find({}).count());
      console.log("links count:", Links.find({}).count());
    };
  this.saveJSON = function(path){
    var bckup={
      nodes: Nodes.find().fetch(),
      links: Links.find().fetch()
    };
    console.log(bckup);
  }
  this.clear = function(){
    alert("deleting everything!")
    //Clear all entries in current collection:
    Nodes.remove({});
    Links.remove({});
  }

  this.publish = function(){
    //publish entire current graph:
  	Meteor.publish("allNodes", function (name,tmp,tm) {
      // console.log("publish", Nodes.find({graph:name}).count());
  	  return [Nodes.find({graph:name}), 
      Links.find({graph:name, strength:{$exists:true}})];
  	});
    var tmpZmLvl; //store current zoom level temporarily on server
    //publish visible portion of the graph:
    Meteor.publish("visNodes", function (Gname,visWindow,zmLvl) {
      // console.log("publish", Nodes.find({graph:Gname}).count());
      tmpZmLvl = zmLvl; 
      var visNodes, ndCount, ndCountLast=NaN, zmLvlLast=NaN;
      do{ //loop to set the appropriate zoom level
      if(zmLvlLast > tmpZmLvl) { //if zooming in, find the dominant subtrees connected to visible ones
        var visNodesNew = visNodes.map(nd=>nd._id), prevNodes=visNodesNew;
        do{ 
          var newNodes=[];
          prevNodes.forEach(function(visNd){ //for each node found last iteration
            // Links.find({$or:[{source:nd._id}, {target:nd._id}]})
            var coord=Nodes.find(visNd).map(nd => [nd.x,nd.y,nd.importance])[0];
            var srt={}; 
            if(tmpZmLvl==0) {srt['strength']=-1;}// exst['strength']={$exists:true}}
            else {srt['strength'+tmpZmLvl]=-1;}// exst['strength'+tmpZmLvl]={$exists:true}}}
            var chNodes = Links.find({source:visNd, target:{$nin:visNodesNew}}) 
            .map(lk=>lk.target) //find all the children not already selected
              .filter(chNd => //take only the children at the new zoom level
              Nodes.find(chNd).map(nd=>nd.zoomLvl)[0]==tmpZmLvl) 
              .filter(chNd => //take only the children whose most important parent is visNd
              Links.find({target:chNd},{sort:srt,limit:1}) //find child's most important parent
                .map(lk=>lk.source)[0] == visNd) //and see if it's the visible node
            Nodes.update({$and:[{_id:{$in:chNodes}}, {x:2345}]},
              {$set:{x:coord[0],y:coord[1]+coord[2]}},{multi:true})
            Array.prototype.push.apply(newNodes, chNodes);//to push multiple elements
            
            var parNodes = Links.find({target:visNd, source:{$nin:visNodesNew}})
            .map(lk=>lk.source) //same thing for parents
              .filter(parNd => //take only the children at the new zoom level
              Nodes.find(parNd).map(nd=>nd.zoomLvl)[0]==tmpZmLvl)
              .filter(parNd => //take only the parents whose most important child is visNd
              Links.find({source:parNd},{sort:srt,limit:1}) 
                .map(lk=>lk.target)[0] == visNd)
            Nodes.update({$and:[{_id:{$in:parNodes}}, {x:2345}]},
              {$set:{x:coord[0],y:coord[1]-coord[2]}},{multi:true})
            Array.prototype.push.apply(newNodes, parNodes); //to push multiple elements
          // console.log('...', visNd, newNodes)
          })
          prevNodes=newNodes; //set up for the next iteration
          Array.prototype.push.apply(visNodesNew,newNodes); //add the found nodes to the array
          // console.log("building subtree, added ", newNodes.length, ' nodes')
        } while(prevNodes.length > 0)
        visNodes = Nodes.find({_id:{$in:visNodesNew}}); //get the cursor for the found array
      }
      else{ //if zooming out or staying const, then use node coordinates to determin what's visible
      visNodes = Nodes.find({graph:Gname, //all nodes within visible window
        zoomLvl:{$gte: tmpZmLvl},
        x:{$gt: visWindow[0], $lt: visWindow[2]},
        y:{$gt: visWindow[1], $lt: visWindow[3]}}) 
        // {sort:{importance: -1}, limit:nnds});
      }
      // console.log("visNd", visWindow, Gname, visNodes.count())
      //---------Automatic Zoom Level--------------------------------
      ndCount=visNodes.count();
      console.log('zmLvl',tmpZmLvl, 'ndCnt', ndCount);
      zmLvlLast=tmpZmLvl;
      if(ndCount < VisNNodes[0]){ //if too few nodes, show more detail
        if(ndCountLast>VisNNodes[1]){console.error("can't get the right zoom -"); break;} 
        if(tmpZmLvl==0){break;} //if fully zoomed in, break
        tmpZmLvl--;} 
      else if(ndCount > VisNNodes[1]){ //if too many nodes, coarsen
        if(ndCountLast<VisNNodes[0]){console.error("can't get the right zoom +"); break;} 
        if(tmpZmLvl==visNodes.map(nd=>nd.zoomLvl)
            .reduce((max,now)=>Math.max(max,now),0)){break;} //if fully zoomed out, break
        tmpZmLvl++;} 
      ndCountLast=ndCount;
      } while(ndCount < VisNNodes[0] || ndCount > VisNNodes[1])

      var visNdID = visNodes.map(nd => nd._id);
      var select={graph:Gname, //selector for links between these nodes at current zoom lvl
          $and:[{source:{$in: visNdID}}, {target:{$in: visNdID}}]};
      if(tmpZmLvl==0){tmpZmLvl=''}
      select['strength'+tmpZmLvl]={$exists:true};
      var visLinks= Links.find(select);
      // if (visLinks.count()==0){ //if zmLvl is higher than maximum zoom
      //   delete select['strength'+tmpZmLvl];
      //   select['strength']={$exists:true}; //then use the micorscopic connectivity
      //   visLinks= Links.find(select);
      //   tmpZmLvl = ''; //so that phantNodes uses microscopic connectivity
      // }
      return [visNodes, visLinks];
    });
    Meteor.publish("phantNodes", function(visNdID){//visWindow, minImportance){
      //----------Select 20 most important phantom links-------------------
      //Select links that connect to visNd on one side by implementing XOR: 
      // var select={$or:[{source:{$in: visNdID}, target:{$nin: visNdID}}, 
      //                  {source:{$nin: visNdID}, target:{$in: visNdID}}]};
      // select['strength'+tmpZmLvl]={$exists:true}; //select links at the right zoom     
      var srt={}; srt['strength'+tmpZmLvl]=-1;
      // var connLk= Links.find(select,{sort:srt, limit:100}); //limit number of phantom nodes loaded
      //---------Or select two most important per node----------------------
      var connLkIDs=[];
      visNdID.forEach(function(nd){
        var select={$or:[{source:nd, target:{$nin: visNdID}}, 
                         {source:{$nin: visNdID}, target:nd}]};
        select['strength'+tmpZmLvl]={$exists:true}; //select links at the right zoom 
        Array.prototype.push.apply(connLkIDs,
          Links.find(select,{sort:srt, limit:2}).map(lk=>lk._id));
      })
      var connLk = Links.find({_id:{$in:connLkIDs}});
      // var connLk= Links.find({
      //     $or:[{source:{$in: visNdID}}, {target:{$in: visNdID}}]});
      // console.log('MI',minImportance)
      var fixNodes = Nodes.find(
        {_id:{$in: connLk.map(lk=>lk.source).concat(connLk.map(lk=>lk.target)),
              $nin:visNdID}, x:{$ne:2345}}, //filter out unpositioned nodes - connecting links will be removed in tok.js, redraw()
        {fields:{text:0}}); //use this to flag phantom nodes (for now)
        // {transform: function(nd){
        //   nd.phant=true; return nd;
        // }});
      // console.log('fixNd',fixNodes.fetch())
      // var fixNdID=fixNodes.map(nd=>nd._id);
      return [fixNodes, connLk]
      // Links.find({
      //   $or:[{
      //     source:{$in: fixNdID},
      //     target:{$in: visNdID}
      //   },{
      //     source:{$in: visNdID},
      //     target:{$in: fixNdID}
      //   }]
      // })];
    });
  }; 

  this.subscribe = function(visWindow, onReady){ //the 1 client method here
    if(db.visSubscr){
      db.visSubscr.stop(); //clear client collections
      db.phantSubscr.stop();
    }
    //only published nodes/links appear in Nodes/Links collections:
    db.visSubscr=Meteor.subscribe("visNodes",Session.get("currGraph"),
      visWindow, Session.get('currZmLvl'), function(){
      var ndLvls=Nodes.find().map(nd=>nd.zoomLvl);
      Session.set('currZmLvl', //set to new level as found in the publish function
        (ndLvls.length > 0)? ndLvls.reduce((min,now)=>Math.min(min,now)) : 0)
    // db.phantSubscr=Meteor.subscribe("phantNodes", Nodes.find().map(nd=>nd._id), 
    // // Links.find().map(lk=>lk.source).concat(Links.find().map(lk=>lk.target)), 
    // visWindow, 
    // Nodes.find().map(nd=>nd.importance).reduce((min,now)=>Math.min(min,now)), //smallest visible node
    //  function(){
    db.phantSubscr=Meteor.subscribe("phantNodes",
      Nodes.find().map(nd=>nd._id),function(){ 
      onReady();
    })})
  }
}

//Node and Link methods for calls from the client:
Meteor.methods({
//update db to node locations sent from the client
  updateCoord: function(nodes){
    // if (Meteor.isClient) {notify("storing node locations");}
    nodes.forEach(function(nd, ix){
      // console.log(nd._id, nd.x);
      Nodes.update( { _id: nd._id }, { $set: { 
        x: nd.x,
        y: nd.y 
      } } );
    })
  },
  //replace data entries in DB with ones provided 
  //(leave others unchanged), or create new:
  updateNode: function(node, fromID, link){
    console.log("add node:",node);
    //Check that node has the crucial properties:
    if(!node.importance || !node.x || !node.y){
      alert("failed to update node: missing info");
      return null;
    }

    if(!node._id){ //add new node
      delete node._id;
      var ndID = Nodes.insert(node);
      // console.log(Nodes.find().fetch())
      if(fromID){ //if linked node, also insert link
        link.source=fromID; link.target=ndID;
        var lkID = Links.insert(link);
        return [ndID, lkID];
      }
      return [ndID];
    }
    else{ //update existing node
      var attr = {};
      for (var attrname in node) { 
        if(attrname!="_id") attr[attrname] = node[attrname]; 
      };
      var num = Nodes.update( { _id: node._id }, { $set: attr } );
      if(num!=1) alert("failed to update a document!");
      return null;
    }
  },
  updateLink: function (link) {
    console.log("add link:", link);
    //Check that link has the crucial properties:
    if(!link.strength || !link.source || !link.target){
      alert("failed to update link: missing info");
      return null;
    }

    // console.log("added link in method!", link);
    if(!link._id){
      delete link._id;
      return Links.insert(link);
    }
    else{
      var attr = {};
      for (var attrname in link) { 
        if(attrname=="_id") continue;
        if((attrname=="source" || attrname=="target") && 
          typeof link[attrname] !== 'string'){
          attr[attrname]=link[attrname]._id; continue;
        }
        attr[attrname] = link[attrname]; 
      };
      // console.log("attr",attr);
      var num = Links.update( { _id: link._id }, { $set: attr } );
      if(num!=1) alert("failed to update a document!");
      return null;
    }
  },
  // addNode: function (nd) {
  //   var newId= Nodes.insert(nd);
  //   // console.log("added node in method!", newId);
  //   return newId;
  // },
  deleteNode: function(nd){
    //Remove node and all connected links:
    Links.remove({$or: [{source: nd}, {target: nd}]});
    Nodes.remove(nd);
  },
  deleteLink: function(lk){
    Links.remove(lk);
  },
  calcEffConn: function(graph){ //calculate the effective connectivit matrices
    //Generate connectivity matrix-----------------------------------
    var connMx=math.sparse(); //initialize connectivity matrix
    var allNodes = Nodes.find({graph:graph},{sort:{importance: -1}}) // take all nodes, from most to least important
    var ndID = allNodes.map(nd => nd._id); //make a dictionary array storing node ids
    var ndImp = allNodes.map(nd => nd.importance);
    var mxN=allNodes.count(); connMx.set([mxN,mxN],0);
    //build the sparse matrix row-by-row:
    ndID.forEach(function(nd, idx, arr){ //for each node
      Links.find({source:nd}) //take all child Links
           .forEach(function(lk){ //for each link
        connMx.set([idx, //set the matrix element in that row
          ndID.indexOf(lk.target)], //and find column from dictionary
          lk.strength/ndImp[idx]) //set mx element to link weight normalized by parent nd weight
      });
    })

    //Calculate effective connectivity one level out-------------------------
    connMxPS = connMx; //math.add(math.multiply(0.9,connMx), //partly symmetrized connectivity matrix
      // math.multiply(0.2,math.transpose(connMx)));
    var zmIx = 1;
    while (mxN > VisNNodes[1]){
      var splitN=Math.round(mxN / (ZoomStep*ZoomStep)); //hide all nodes after this idx
      var rg1=math.range(0,splitN), rg2=math.range(splitN,mxN);

      var mxB = connMxPS.subset(math.index(rg1,rg2)),
          mxC = connMxPS.subset(math.index(rg2,rg1)),
          mxD = connMxPS.subset(math.index(rg2,rg2));
      connMxPS = math.add(connMxPS.subset(math.index(rg1,rg1)), //add actual connections to effectve ones
        math.multiply(
          math.divide(mxB,
            math.subtract(math.eye(mxN-splitN), 
              math.add(mxD, math.multiply(mxC,mxB)))),
          mxC)); //calculate effective connectivity according to total flow between nodes

      //Store effective connectivities in Links DB-------------------------------
      // connMxPS=connMxPS.map(wt => parseFloat(wt.toFixed(1)),true);//(wt>0.05 ? wt : 0),)
      connMxPS.forEach(function(effWt, idx){ //for each non-zero entry of connMx
        if(effWt < 0.05){return} //cut off weak effective links
        var temp = {}; temp["strength" + zmIx] = effWt*ndImp[idx[0]];
        Links.upsert({source:ndID[idx[0]], target:ndID[idx[1]]}, //find the corresponding link
          {$set:temp, //add a strength field for the current zoom level
            $setOnInsert: {type:"theorem", oriented:true, graph:graph}}) //if the link did not exist before, insert it
        // console.log(Links.find(updLk.insertedId).fetch())
        },true)
      ndID.slice(splitN,mxN).forEach(function(id){
        Nodes.update(id,{$set:{zoomLvl:zmIx-1}}) //store zoom level for each node
      })
      mxN = splitN; // prepare for next iteration
      zmIx++; console.log("Calculating effective conn mx ", splitN, " remaining");
    }
    ndID.slice(0,splitN).forEach(function(id){
      Nodes.update(id,{$set:{zoomLvl:zmIx-1}}) //store zoom level for last block
    })
    return connMxPS;
  },
  maxZoomLvl: function(graph){
    return Nodes.find({graph:graph})
      .map(nd=>(('zoomLvl' in nd)? nd.zoomLvl : 0))
      .reduce((max,now)=>Math.max(max,now),0);
  }
});

