// Template.nodeOptions.helpers({
//   select: function(){
//     $("#type").val("example");
//   }
// });

//update the database for dat.node according to current 
//form field values; redraw tree and redesplay content
var updateDB = function(dat){
  // console.log("in helper", dat.node);
  if(dat.node){
    var node = dat.node;
    node.title = $('#title').val();
    node.type = $('#type').val();
    node.importance = $('#importance').val();
    node.text = $('#content').val();
    // console.log("sourceID", this.sourceID);
    //if adding a new linked node:
    if (dat.sourceID){
      //create defaults for link type:
      var lkType = function(ndType){
          switch(ndType){
              case "assumption": return "connection";
              case "definition": return "connection";
              case "statement": return "theorem";
              case "example": return "specialCase";
              case "empirical": return "connection";
          }
        };
      var link = {
        type: lkType(node.type),
        strength: 10
      };
    };
    //update the database entry:
    Meteor.call("updateNode",
      node, dat.sourceID, link,
      function(err,res){
        if(err) alert(err);
        if(res) dat.node._id=res[0];
      });
  }
  else if(dat.link){
    var node = dat.link;
    node.type = $('#type').val();
    node.strength = $('#importance').val();
    node.text = $('#content').val();

    //update the database entry:
    Meteor.call("updateLink", node,
      function(err,res){
        if(err) alert(err);
        if(res) dat.link._id=res;
      });
  }
  else console.error("failed to update DB: no data given");
  dat.gui.tree.redraw();
  // dat.gui.tree.updateSelection();
  dat.gui.showContent(node);
  dat.gui.drag_line.attr("class", "drag_line_hidden");
}

var editorEvents = {
  'click #save': function(e) {
    e.preventDefault();
    // console.log(this);
    // node = Session.get('newNode');
    updateDB(this);

    // Modal.hide('nodeOptions');
    Blaze.remove(this.gui.editPopup);
    this.gui.editPopup=null;
    this.gui.drag_line.attr("class", "drag_line_hidden");
    this.gui.tree.updateSelection();
  },

  'click #cancel':function(e){
    Blaze.remove(this.gui.editPopup);
    this.gui.editPopup=null;
    this.gui.drag_line.attr("class", "drag_line_hidden");
    this.gui.tree.updateSelection();
  }
};

var rendered = function(){
  var dat= this.data;
  if(dat.node) {
    if(dat.node.type){ $("#type").val(dat.node.type) }
    else{ //defaults
      $('#type').val('statement');
      $('#importance').val(10);
    }
  };
  if(dat.link){
    if(dat.link.type) $("#type").val(dat.link.type);
    else{ //defaults
      $('#type').val('connection');
      $('#importance').val(10);
    }
  }
  // if(node.importance) $("#importance").val(node.importance);
  // $("#content").val(node.text);
  //Shift+Enter updates the DB and content popup:
  $('#content').keydown(function (event) {
    if (event.keyCode == 13 && event.shiftKey) {
      event.preventDefault();
      // console.log("event", event);
      // var cont_scroll = $('#contentPopup #popupBody').scrollTop();
      //match content scroll fraction to edit scroll:
      var containeR = document.getElementById('editPopup');
      var cont_scroll = containeR.scrollTop / (containeR.scrollHeight - containeR.clientHeight);
        console.log(cont_scroll);
      updateDB(dat);
      $('#contentPopup #popupBody')
        .scrollTop(cont_scroll*document.getElementById('popupBody').scrollHeight);
    }
  });
};

Template.nodeOptions.onRendered(rendered);
Template.nodeOptions.events(editorEvents);
Template.linkOptions.onRendered(rendered);
Template.linkOptions.events(editorEvents);


var contentEvents={
  "click #close": function(e){
    this.hideContent();
    this.selected=null;
    this.tree.updateSelection();
  }
};
Template.nodeContent.events(contentEvents)
Template.linkContent.events(contentEvents)


