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
  	  return [Nodes.find({graph:name}), Links.find({graph:name})];
  	});

    //publish visible portion of the graph:
    Meteor.publish("visNodes", function (Gname,visWindow,nnds) {
      // console.log("publish", Nodes.find({graph:Gname}).count());
      var visNodes = Nodes.find({graph:Gname,
        x:{$gt: visWindow[0], $lt: visWindow[2]},
        y:{$gt: visWindow[1], $lt: visWindow[3]}}, 
        {sort:{importance: -1}, limit:nnds});
      // console.log("visNd", visWindow, Gname, visNodes.count())
      var visNdID = visNodes.map(nd => nd._id);
      var visLinks= Links.find({graph:Gname,
          $and:[{source:{$in: visNdID}}, {target:{$in: visNdID}}]});
      return [visNodes, visLinks];
    });
    Meteor.publish("phantNodes", function(visNdID, visWindow, minImportance){
      // console.log(visNdID, "and", visLkST)
      var connLk= Links.find({
          $or:[{source:{$in: visNdID}}, {target:{$in: visNdID}}]});
      console.log('MI',minImportance)
      var fixNodes = Nodes.find(
        {_id:{$in: connLk.map(lk=>lk.source).concat(connLk.map(lk=>lk.target)),
              $nin:visNdID},
          // $or:[{x:{$lte: visWindow[0]}}, {x:{$gte: visWindow[2]}},
          //      {y:{$lte: visWindow[1]}}, {y:{$gte: visWindow[3]}}],
          // importance:{$gt: minImportance}
        },
        {fields:{text:0}}); //use this to flag phantom nodes (for now)
        // {transform: function(nd){
        //   nd.phant=true; return nd;
        // }});
      // console.log('fixNd',fixNodes.fetch())
      var fixNdID=fixNodes.map(nd=>nd._id);
      return [fixNodes, Links.find({
        $or:[{
          source:{$in: fixNdID},
          target:{$in: visNdID}
        },{
          source:{$in: visNdID},
          target:{$in: fixNdID}
        }]
      })];
    });
  };

  this.subscribe = function(visWindow, nnds, onReady){ //the 1 client method here
    if(db.visSubscr){
      db.visSubscr.stop(); //clear client collections
      db.phantSubscr.stop();
    }
    //only published nodes/links appear in Nodes/Links collections:
    db.visSubscr=Meteor.subscribe("allNodes",Session.get("currGraph"),visWindow,nnds, function(){
    db.phantSubscr=Meteor.subscribe("phantNodes", Nodes.find().map(nd=>nd._id), 
    // Links.find().map(lk=>lk.source).concat(Links.find().map(lk=>lk.target)), 
    visWindow, 
    Nodes.find().map(nd=>nd.importance).reduce((min,now)=>Math.min(min,now)),
     function(){
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
    var mxDic = allNodes.map(nd => nd._id); //make a dictionary array storing node ids
    var mxN=allNodes.count(); connMx.set([mxN,mxN],0);
    //build the sparse matrix row-by-row:
    mxDic.forEach(function(nd, idx, arr){ //for each node
      Links.find({source:nd}) //take all child Links
           .forEach(function(lk){ //for each link
        connMx.set([idx, //set the matrix element in that row
          mxDic.indexOf(lk.target)], //and find column from dictionary
          lk.strength) //set mx element to link weight
      });
    })

    connMxPS = math.add(math.multiply(0.9,connMx), //partly symmetrized connectivity matrix
      math.multiply(0.2,math.transpose(connMx)));
    var splitN=Math.round(mxN / (ZoomStep*ZoomStep)); //hide all nodes after this idx
    var rg1=math.range(0,splitN), rg2=math.range(splitN,mxN);

    var mxB = connMxPS.subset(math.index(rg1,rg2)),
        mxC = connMxPS.subset(math.index(rg2,rg1)),
        mxD = connMxPS.subset(math.index(rg2,rg2));
    math.add(connMxPS.subset(math.index(rg1,rg1)), //add actual connections to effectve ones
      math.multiply(mxB,
        math.inv(
          math.subtract(math.eye(mxN-splitN), 
            math.add(mxD, math.multiply(mxC,mxB)))),
        mxC));
    return connMx.toArray();
  }
});

