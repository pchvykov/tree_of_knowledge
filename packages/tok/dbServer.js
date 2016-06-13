treeData = function(Nodes, Links){
  this.Nodes=Nodes;
  this.Links=Links;
	console.log("nodes count:", Nodes.find({}).count());
	console.log("links count:", Links.find({}).count());

  this.loadJSON = function(graph){
      console.log("loading collection from json")
      //Clear all entries in current collection:
      Nodes.remove({});
      Links.remove({});
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
    var bckup={};
    bckup.nodes=Nodes.find().fetch();
    bckup.links=Links.find().fetch();
    console.log(bckup);
  }
  this.clear = function(){
    console.log("deleting everything!")
    //Clear all entries in current collection:
    Nodes.remove({});
    Links.remove({});
  }

  this.publish = function(){
  	Meteor.publish("allNodes", function () {
  	  return Nodes.find();
  	});
  	Meteor.publish("allLinks", function () {
  	  return Links.find();
  	});
  };

  this.subscribe = function(onReady){
    Meteor.subscribe("allLinks",function(){
    Meteor.subscribe("allNodes",function(){
      onReady();
    })});
  }
}
  //methods for calls from the client:
  Meteor.methods({
    updateCoord: function(nodes){
      if (Meteor.isClient) {notify("storing node locations");}
      nodes.forEach(function(nd, ix){
        // console.log(nd._id, nd.x);
        Nodes.update( { _id: nd._id }, { $set: { 
          x: nd.x,
          y: nd.y 
        } } );
      })
    },
    //replace data entries in DB with ones provided 
    //(leave others unchanged):
    updateNode: function(node, fromID, link){
      if(!node._id){ //add new node
        var ndID = Nodes.insert(node);
        console.log("newID",ndID);
        if(fromID){
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
      // console.log("added link in method!", link);
      if(!link._id) return Links.insert(link);
      else{
        var attr = {};
        for (var attrname in link) { 
          if(attrname!="_id") attr[attrname] = link[attrname]; 
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
    }
  });



