treeData = function(){
	var Nodes = new Meteor.Collection("nodeColl");
	var Links = new Meteor.Collection("linkColl");
	console.log("nodes count:", Nodes.find({}).count());
	console.log("links count:", Links.find({}).count());

	this.loadJSON = function(fileName){
      console.log("loading collection from json")
      var graph = JSON.parse(Assets.getText(fileName));
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

    //publish();

}