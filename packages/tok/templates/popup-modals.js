Template.nodeOptions.events({
  'click #save': function(e) {
    e.preventDefault();
    // console.log(this);
    // node = Session.get('newNode');

    var node = this.node;
    node.type = $('#type').val();
    node.importance = $('#importance').val();
    node.text = $('#content').val();

    if (this.sourceID){
    //create defaults for link:
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
    Meteor.call("addNode",
      node, this.sourceID, link,
      function(err,res){
        if(err) alert(err);
      });
    this.tree.redraw();

    Modal.hide('nodeOptions');
  }
});

Template.linkOptions.events({
  'click #save': function(e) {
    e.preventDefault();
    // console.log(this);
    // node = Session.get('newNode');

    var link = this.link;
    link.type = $('#type').val();
    link.strength = $('#importance').val();
    link.text = $('#content').val();
    
    Meteor.call("addLink", link,
      function(err,res){
        if(err) alert(err);
      });
    this.tree.redraw();

    Modal.hide('linkOptions');
  }
});
