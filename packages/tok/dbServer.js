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

  //methods for calls from the client:
  Meteor.methods({
    updateCoord: function(nodes){
      console.log("storing node locations");
      nodes.forEach(function(nd, ix){
        // console.log(nd._id, nd.x);
        Nodes.update( { _id: nd._id }, { $set: { 
          x: nd.x,
          y: nd.y 
        } } );
      })
    },
    addLinkedNode: function(from, nd){
      var ndID = Nodes.insert(nd);
      var lkID = Links.insert({source: from, target: ndID});
      return [ndID, lkID];
    },
    addLink: function (link) {
      // console.log("added link in method!", link);
      return Links.insert(link);
    },
    addNode: function (nd) {
      var newId= Nodes.insert(nd);
      // console.log("added node in method!", newId);
      return newId;
    },
    deleteNode: function(nd){
      //Remove node and all connected links:
      Links.remove({$or: [{source: nd}, {target: nd}]});
      Nodes.remove(nd);
    },
    deleteLink: function(lk){
      Links.remove(lk);
    }
  });

}


