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
    var obj = {};//dat.node;
    obj.title = $('#title').val();
    obj.type = $('#type').val();
    obj.importance = $('#importance').val();
    obj.text = $('#content').val();
    obj._id=dat.node._id;
    // console.log("sourceID", this.sourceID);
    //if adding a new linked node:
    if (dat.sourceID){
      //create defaults for link type:
      var lkType = function(ndType){
          switch(ndType){
              case "assumption": return "related";
              case "definition": return "related";
              case "statement": return "theorem";
              case "example": return "specialCase";
              case "empirical": return "connection";
          }
        };
      var link = {
        type: lkType(obj.type),
        strength: 10
      };
    };
    //update the database entry:
    Meteor.call("updateNode",
      obj, dat.sourceID, link,
      function(err,res){
        if(err) alert(err);
        if(res) dat.node._id=res[0];
      });
  }
  else if(dat.link){
    var obj = {};//dat.link;
    obj.type = $('#type').val();
    obj.strength = $('#importance').val();
    obj.text = $('#content').val();
    obj.oriented = $('#oriented').is(":checked");
    obj._id=dat.link._id;
    if($('#flip').is(":checked")){
      obj.source=dat.link.target;
      obj.target=dat.link.source;
      dat.link.source=obj.source;
      dat.link.target=obj.target;
      $('#flip').prop("checked",false);
    }
    else{
      obj.source=dat.link.source;
      obj.target=dat.link.target;
    }

    //check for new circular references:
    if(obj.oriented){
      var nodeData = dat.gui.tree.force.nodes();
      var src = nodeData.find(function(nd){return nd._id == obj.source});
      var trg = nodeData.find(function(nd){return nd._id == obj.target});
      var checkChildren = function(nd){
        return nd.childrenIx.reduce(
          function(prev,ix){
            if(prev) return true;
            else if(nd===trg && src===nodeData[ix]) return false;
            else return (src===nodeData[ix]) ||
            (checkChildren(nodeData[ix]))
          }, false)
      }
      if(checkChildren(trg)){
        notify("circular reference detected!");
        // return "fail"; //disallow circular references
      }
    }

    //update the database entry:
    Meteor.call("updateLink", obj,
      function(err,res){
        if(err) alert(err);
        if(res) dat.link._id=res;
      });
  }
  else console.error("failed to update DB: no data given");
  dat.gui.tree.redraw();
  // dat.gui.tree.updateSelection();
  dat.gui.showContent(obj);
  dat.gui.drag_line.attr("class", "drag_line_hidden");
}

var editorEvents = {
  'click #save': function(e) {
    e.preventDefault();
    // console.log(this);
    // node = Session.get('newNode');
    if(updateDB(this)=="fail") return;

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
    if(dat.link.type){
      $("#type").val(dat.link.type);
      $("#oriented").prop("checked",dat.link.oriented);
    }
    else{ //defaults
      $('#type').val('related');
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


