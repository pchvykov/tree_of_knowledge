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
    addNode: function (node) {
      Nodes.insert(node);
      console.log("added node in method!");
    }
  });

}


