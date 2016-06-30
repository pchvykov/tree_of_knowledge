// var Graphs = new Meteor.Collection("graphList"); //available graphs
//Client and server Globals:
Nodes = new Meteor.Collection("all_Nodes");
Links = new Meteor.Collection("all_Links");
//Collection to store JSON strings as backups:
Backup = new Meteor.Collection("backups");

var db = new treeData();
var graph; var svg;
var currGraph;
notify = function(text){ //notification messages
  // console.log("notify: ",text);
  $('#notifications').text(text);
  // $('#notifications').css({"animation-name":"notify","animation-duration":"6s"})
  $('#notifications').removeClass('notify');
  setTimeout(function() {
      $('#notifications').addClass('notify');
  },1);
}
// Server-side code:============================
if (Meteor.isServer){
  Meteor.startup(function(){
    // var allCollections = function () { //return all collections
    //     var Future = Npm.require('fibers/future'),
    //         future = new Future(),
    //         db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

    //     db.collectionNames( 
    //         function(error, results) {
    //             if (error) throw new Meteor.Error(500, "failed");
    //             future.return(results);
    //         }
    //     );
    //     return future.wait();
    // };
    // var collList=allCollections();
    // console.log("Collections:", collList);

    //direct DB manipulations:
    // db.loadJSON(JSON.parse(Assets.getText("miserables.json")));
    // db.clear(); 
    // Nodes.insert({x: 0.0, y: 0.0});
    // console.log("updated #",
    //   Nodes.update({}, {$set: {graph:"test0"}}, {multi:true}),
    //   Links.update({}, {$set: {graph:"test0"}}, {multi:true}));
    // Nodes.update({importance: {$in:["",null,10]}}, 
    //   {$set: {importance:10}}, {multi:true}));
    // Links.update({strength: {$in:["",null,10]}}, 
    //   {$set: {strength:5}}, {multi:true});
    // Links.update({type: {$in:["connection"]}}, 
    //   {$set: {type:"related"}}, {multi:true});
    // Graphs.remove({});

    db.publish();
    Meteor.publish("srvBckup", function () {
      return Backup.find();
    });
  })

  Meteor.methods({
    // createCollection: function(name){
    //   // Graphs.insert({'title': name});
    //   if(name!=currColl){
    //     console.log("Loading new collection");
    //     Nodes = new Meteor.Collection(name+"_Nodes"); //Server
    //     Links = new Meteor.Collection(name+"_Links");
    //    // Nodes.insert({x: 0.0, y: 0.0});
    //     db = new treeData();
    //     db.publish(); //not necessary after first time
    //     currColl=name;
    //   }
    // },
    // deleteCollection: function(){
    //   Nodes.rawCollection().drop();
    //   Links.rawCollection().drop();
    //   //Nodes._dropCollection()
    // },
    listGraphs: function(){ //list all available graphs
      //console.log("graphs!!!",Nodes.rawCollection().distinct("graph"));
      //scan the Nodes collection for unique "graph" values:
      var graphs = _.uniq(Nodes
            .find({}, {fields: {graph: true}, sort:{graph:1}})
            .map(x => x.graph), true);
      return graphs;
    },
    renameGraph: function(oldName, newName){
      Nodes.update({graph:oldName},{$set:{graph:newName}},{multi:true});
      Links.update({graph:oldName},{$set:{graph:newName}},{multi:true});
    },
    deleteGraph: function(name){
      Links.remove({graph: name});
      Nodes.remove({graph: name});
    },
    backupGraph: function(name, note){
      var bck={
        nodes: //JSON.stringify(
          Nodes.find({graph:name}).fetch(),
        links: //JSON.stringify(
          Links.find({graph:name}).fetch(),
        date: new Date(),
        graph: name,
        note: note,
        count: (Backup.find().count()+1)
      }
      return Backup.insert(bck);
    },
    restoreGraph: function(bckCnt){
      var grObj=Backup.find({count:bckCnt}).fetch();
      // console.log(bckCnt, grObj, grObj.length);
      if(grObj.length==0){return false;}
      var grList=Meteor.call("listGraphs");
      var name=grObj[0].graph;
      //Create new name for the graph:
      while(grList.indexOf(name) >-1){
        name+="~";
      }
      //Insert all nodes and links into their Collections:
      //note: must update link source/target with new node IDs
      var newId={};
      grObj[0].nodes.forEach(function(nd){
        nd.graph=name;
        var oldID=nd._id;
        delete nd._id;
        newId[oldID]=Nodes.insert(nd);
      })
      grObj[0].links.forEach(function(lk){
        lk.graph=name;
        lk.source=newId[lk.source];
        lk.target=newId[lk.target];
        delete lk._id;
        Links.insert(lk);
      })
      return name;
    }
  })
}


//Client-side code:============================
if (Meteor.isClient) {
  //Once the SVG is rendered:
  Template.graph.onRendered(function(){

    //Dropdown for available graphs:
    Meteor.call("listGraphs", function(err, list){
      $.each(list, function (i, item) {
          $('#availGraphs').append($('<option>', { 
              value: item,
              text : item 
          }));
      });
    currGraph=list[0];

    Session.set("currGraph",currGraph);
    $('#availGraphs').val(currGraph);


    //Create canvas:
    Session.set('lastUpdate', new Date() );
    var width = $(window).width(),
    height = 700;//$(window).height(); //SVG size

    svg = d3.select("#graphSVG")
        .attr("width", width)
        .attr("height", height); //Set SVG attributes
    $(".canvas").width(width);

    // showGraph("test0");
    graph = new ToK(svg, db);    
    $('#pgTitle').text("Graph "+currGraph);

    });
  });

  Template.graph.helpers({
    lastUpdate(){return Session.get('lastUpdate');}
  });

  Template.graph.events({
    'change #availGraphs': function(e){
      if(graph.gui.editPopup){
        notify("finish editing first");
        return;}
      var newValue = $('#availGraphs').val();
      var oldValue = Session.get("currGraph");
      if (newValue != oldValue) { // value changed, let's do something
        showGraph(newValue);
      }
    },
    'click #new': function(e){
      if(graph.gui.editPopup){
        notify("finish editing first");
        return;}
      var name=prompt("New graph name (no spaces)", "test1");
      var newFl=true; //check if name already exists:
      $("#availGraphs option").each(function(d){
        newFl=newFl && (name!=$(this).val());
      });
      if(name){
        if(newFl){
          $('#availGraphs').append($('<option>', {
              value: name,
              text: name,
              selected: 'selected'
          }));
          notify("created new graph");
        }
        else $('#availGraphs').val(name);
        showGraph(name);
      }
    },
    'click #rename': function(e){
      if(graph.gui.editPopup){
        notify("finish editing first");
        return;}
      var newName = prompt("Enter new graph name:");
      Meteor.call("listGraphs", function(err, list){
        if(list.indexOf(newName)>-1){notify("name already exists");
         return;}
        Meteor.call("renameGraph",Session.get("currGraph"),newName,
          function(){
            notify("Graph renamed, refresh the page to finish");
          });
      });
    },
    'click #delete': function(e){
      var result = confirm("Delete the entire current graph?");
      if (result) {
          Meteor.call('deleteGraph',Session.get("currGraph"))
          notify("graph deleted - switch to another graph")
      }
    },
    'click #srvBckup': function(e){
      e.preventDefault();
      var note=prompt("Backup note:");
      Meteor.call("backupGraph",Session.get("currGraph"),note);     
    },
    'click #srvRestore': function(e){
      e.preventDefault();
      if(graph.gui.editPopup){
        notify("finish editing first");
        return;}
      Meteor.subscribe("srvBckup",function(){ //backup DB
        //ask user for count in Backup collection:
        console.log("Backups collection:",Backup.find().fetch())
        var list=Backup.find({},{fields: {
          graph: true, date:true, note:true, count:true, _id:false
        }}).fetch();
        var restID=prompt(JSON.stringify(list,null,2)+
          "\n enter COUNT of graph to restore:");
        if(!restID) return;
          // "Backup ID of graph to restore (check console for list)");
        //copy backup into Nodes and Links collections and show:
        Meteor.call("restoreGraph",Number(restID),function(err,name){
          if(!name){ alert("Invalid backup count"); return;}
          $('#availGraphs').append($('<option>', {
              value: name,
              text: name,
              selected: 'selected'
          }));
          notify("restored graph "+name);
          showGraph(name);
        })
      })     
    },
    'click #cltBckup': function(){

    },
    'click #cltRestore': function(){
      
    }
  });

  function showGraph(name){
    Session.set("currGraph",name);
    if(graph.gui.contentPopup){
      Blaze.remove(graph.gui.contentPopup);
      graph.gui.contentPopup=null;
    }
    graph.redraw();//subscribe to and show the "currGraph"
    $('#pgTitle').text("Graph "+name);
  }

  // function showGraph(name){
  //   if (name) {
  //     Meteor.call("createCollection",name, function(){
  //       Nodes = new Meteor.Collection(name+"_Nodes"); //Client
  //       Links = new Meteor.Collection(name+"_Links");
  //       currColl=name;
          
  //       db = new treeData();
  //       Session.set('lastUpdate', new Date() );
  //       //Clear old DOM:
  //       var myNode = document.getElementById("graphSVG");
  //       while (myNode.firstChild) {
  //           myNode.removeChild(myNode.firstChild);
  //       }
  //       myNode = document.getElementById("allTooltips");
  //       while (myNode.firstChild) {
  //           myNode.removeChild(myNode.firstChild);
  //       }
  //       graph = new ToK(svg, db);    
  //       notify("ready!");
  //       });
  //       // showGraph(name);
  //   }
  // }

};