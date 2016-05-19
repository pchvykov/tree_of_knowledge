// Template.nodeOptions.helpers({
//   select: function(){
//     $("#type").val("example");
//   }
// });

//update the database for dat.node according to current 
//form field values; redraw tree and redesplay content
var updateDB = function(dat){
  // console.log("in helper", dat.node);

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
  dat.gui.tree.redraw();
  // dat.gui.tree.updateSelection();
  dat.gui.showContent(node);
  dat.gui.drag_line.attr("class", "drag_line_hidden");
}


Template.nodeOptions.onRendered(function(){
  var dat= this.data;
  if(dat.node.type) $("#type").val(dat.node.type);
  // if(node.importance) $("#importance").val(node.importance);
  // $("#content").val(node.text);

  //Shift+Enter updates the DB and content popup:
  $('#content').keydown(function (event) {
    if (event.keyCode == 13 && event.shiftKey) {
      event.preventDefault();
      // console.log("event", event);
      var cont_scroll = $('#popupBody').scrollTop();
      updateDB(dat);
      $('#popupBody').scrollTop(cont_scroll);
    }
  });
})
Template.nodeOptions.events({
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
});

Template.nodeContent.events({
  "click #close": function(e){
    this.hideContent();
    this.selected=null;
    this.tree.updateSelection();
  }
})

Template.linkOptions.onRendered(function(){
  var link= this.data.link;
  // console.log("link here",link);
  if(link.type) $("#type").val(link.type);
  if(link.strength) $("#importance").val(link.strength);
  $("#content").val(link.text);
})
Template.linkOptions.events({
  'click #save': function(e) {
    e.preventDefault();
    // console.log(this);
    // node = Session.get('newNode');

    var link = this.link;
    link.type = $('#type').val();
    link.strength = $('#importance').val();
    link.text = $('#content').val();
    
    Meteor.call("updateLink", link,
      function(err,res){
        if(err) alert(err);
      });
    
    this.tree.redraw();

    Modal.hide('linkOptions');
  }
});
