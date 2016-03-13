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
    addNode: function (nd) {
      var newId= Nodes.insert(nd);
      // console.log("added node in method!", newId);
      return newId;
    }
    // addLink: function (link) {
    //   Links.insert(link);
    //   console.log("added link in method!", link);
    // }
  });

}


