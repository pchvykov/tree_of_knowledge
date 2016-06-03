var Nodes = new Meteor.Collection("nodeColl");
var Links = new Meteor.Collection("linkColl");
//var Nodes = db.getCollection("nodeColl");
//var Links = db.getCollection("linkColl");

var db = new treeData(Nodes, Links);
// Server-side code:
if (Meteor.isServer){
  Meteor.startup(function(){
    // db.loadJSON(JSON.parse(Assets.getText("miserables.json")));
    // db.clear(); 
    // Nodes.insert({x: 0.0, y: 0.0});
    // console.log("updated #",
    // Nodes.update({importance: {$in:["",null,10]}}, 
    //   {$set: {importance:10}}, {multi:true}));
    // Links.update({strength: {$in:["",null,10]}}, 
    //   {$set: {strength:5}}, {multi:true});
    Links.update({type: {$in:["connection"]}}, 
      {$set: {type:"related"}}, {multi:true});
    db.publish()
  })
}


//Client-side code:
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.onRendered(function(){
    // $("#nodeOptions").dialog({
    //     autoOpen: false
    // });
    Session.set('lastUpdate', new Date() );
    var width = $(window).width(),
    height = 700;//$(window).height(); //SVG size

    var svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes
    $(".canvas").width(width);


    // db.subscribe(function(){
    var graph = new ToK(svg, db);
    // });
  });
  Template.graph.helpers({
    lastUpdate(){return Session.get('lastUpdate');}
  });
  Template.graph.events({
    'click #bckup': function(e){
      e.preventDefault();
      
    }
  });

};
