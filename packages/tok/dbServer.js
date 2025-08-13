treeData = function () {
  // this.Nodes=Nodes;
  // this.Links=Links;
  // Use async count on server; fall back to synchronous count on client.
  function logCounts() {
    if (Meteor.isServer) {
      (async () => {
        try {
          const nCnt = await Nodes.find({}).countAsync();
          const lCnt = await Links.find({}).countAsync();
          console.log("nodes count:", nCnt);
          console.log("links count:", lCnt);
        } catch (err) {
          console.error("error counting collections:", err);
        }
      })();
    } else {
      console.log("nodes count:", Nodes.find({}).count());
      console.log("links count:", Links.find({}).count());
    }
  }

  logCounts();

  db = this;

  this.loadJSON = function (graph) {
    console.log("loading collection from json");
    //Clear all entries in current collection:
    // Nodes.remove({});
    // Links.remove({});
    // var graph = JSON.parse(Assets.getText(fileName));
    graph.nodes.forEach(function (item, index, array) {
      Nodes.insert(item);
    });
    graph.links.forEach(function (item, index, array) {
      Links.insert(item);
    });

    // Log counts after insert using same helper:
    logCounts();
  };
  this.saveJSON = function (path) {
    var bckup = {
      nodes: Nodes.find().fetch(),
      links: Links.find().fetch(),
    };
    console.log(bckup);
  };
  this.clear = function () {
    alert("deleting everything!");
    //Clear all entries in current collection:
    Nodes.remove({});
    Links.remove({});
  };

  // this.publish = function () {
  //   // Publications are now defined directly in server startup
  //   console.log("=== db.publish() method called but publications defined elsewhere ===");
  // };

  this.subscribe = function (visWindow, onReady) {
    //the 1 client method here
    console.log("=== db.subscribe DEBUG START ===");
    console.log("db.subscribe called with:");
    console.log("  visWindow:", visWindow);
    console.log("  currGraph:", Session.get("currGraph"));
    console.log("  currZmLvl:", Session.get("currZmLvl"));

    if (this.visSubscr) {
      console.log("Stopping existing visSubscr");
      this.visSubscr.stop(); //clear client collections
    }
    if (this.phantSubscr) {
      console.log("Stopping existing phantSubscr");
      this.phantSubscr.stop();
    }
    //only published nodes/links appear in Nodes/Links collections:
    console.log("Creating visNodes subscription...");
    this.visSubscr = Meteor.subscribe(
      "visNodes",
      Session.get("currGraph"),
      visWindow,
      Session.get("currZmLvl"),
      {
        onReady: () => {
          console.log("=== visNodes subscription ready callback ===");
          var nodeCount = Nodes.find().count();
          var linkCount = Links.find().count();
          console.log("  Nodes received:", nodeCount);
          console.log("  Links received:", linkCount);

          // Log sample nodes
          var sampleNodes = Nodes.find({}, { limit: 3 }).fetch();
          console.log(
            "  Sample nodes:",
            sampleNodes.map((n) => ({
              _id: n._id,
              title: n.title,
              x: n.x,
              y: n.y,
              graph: n.graph,
              zoomLvl: n.zoomLvl,
            })),
          );

          var ndLvls = Nodes.find().map((nd) => nd.zoomLvl);
          Session.set(
            "currZmLvl", //set to new level as found in the publish function
            ndLvls.length > 0
              ? ndLvls.reduce((min, now) => Math.min(min, now))
              : 0,
          );
          console.log("  Updated currZmLvl to:", Session.get("currZmLvl"));

          // create phantom subscription once visNodes are ready
          console.log("Creating phantNodes subscription...");
          this.phantSubscr = Meteor.subscribe(
            "phantNodes",
            Session.get("currGraph"),
            visWindow,
            Nodes.find().map((nd) => nd._id),
            $("#phChInput").val(),
            {
              onReady: () => {
                console.log("=== phantNodes subscription ready callback ===");
                var finalNodeCount = Nodes.find().count();
                var finalLinkCount = Links.find().count();
                console.log("  Final node count:", finalNodeCount);
                console.log("  Final link count:", finalLinkCount);
                console.log("=== db.subscribe DEBUG END ===");
                onReady();
              },
              onStop: (err) => {
                if (err) {
                  console.error(
                    "phantNodes subscription stopped with error:",
                    err,
                  );
                } else {
                  console.log("phantNodes subscription stopped");
                }
              },
            },
          );
        },
        onStop: (err) => {
          if (err) {
            console.error("visNodes subscription stopped with error:", err);
          } else {
            console.log("visNodes subscription stopped");
          }
        },
      },
    );
  };
};

//Node and Link methods for calls from the client:
Meteor.methods({
  //update db to node locations sent from the client
  updateCoord: async function (nodes) {
    // if (Meteor.isClient) {notify("storing node locations");}
    for (const nd of nodes) {
      // console.log(nd._id, nd.x);
      await Nodes.updateAsync(
        { _id: nd._id },
        {
          $set: {
            x: nd.x,
            y: nd.y,
          },
        },
      );
    }
  },
  //replace data entries in DB with ones provided
  //(leave others unchanged), or create new:
  updateNode: async function (node, fromID, link) {
    console.log("=== updateNode DEBUG START ===");
    console.log("updateNode called with node:", JSON.stringify(node, null, 2));
    console.log("fromID:", fromID);
    console.log("link:", link);
    //Check that node has the crucial properties:
    if (!node.importance || !node.x || !node.y) {
      console.error("updateNode FAILED: missing crucial properties");
      console.error("node.importance:", node.importance);
      console.error("node.x:", node.x);
      console.error("node.y:", node.y);
      alert("failed to update node: missing info");
      return null;
    }
    delete node.px; // don't store any speed
    delete node.py;

    if (!node._id) {
      //add new node
      console.log("Creating new node...");
      delete node._id;
      if (!("zoomLvl" in node)) node.zoomLvl = 0;
      console.log(
        "Final node object before insert:",
        JSON.stringify(node, null, 2),
      );
      var ndID = await Nodes.insertAsync(node);
      console.log("Node inserted with ID:", ndID);

      // Verify the node was actually inserted
      const insertedNode = await Nodes.findOneAsync({ _id: ndID });
      console.log(
        "Verified inserted node:",
        JSON.stringify(insertedNode, null, 2),
      );

      if (fromID) {
        //if linked node, also insert link
        console.log("Creating link from", fromID, "to", ndID);
        link.source = fromID;
        link.target = ndID;
        var lkID = await Links.insertAsync(link);
        console.log("Link inserted with ID:", lkID);
        console.log("=== updateNode DEBUG END (with link) ===");
        return [ndID, lkID];
      }
      console.log("=== updateNode DEBUG END (node only) ===");
      return [ndID];
    } else {
      //update existing node
      console.log("Updating existing node with ID:", node._id);
      var attr = {};
      for (var attrname in node) {
        if (attrname != "_id") attr[attrname] = node[attrname];
      }
      console.log("Update attributes:", JSON.stringify(attr, null, 2));
      var num = await Nodes.updateAsync({ _id: node._id }, { $set: attr });
      console.log("Update result - documents modified:", num);
      if (num != 1) alert("failed to update a document!");

      // Verify the update
      const updatedNode = await Nodes.findOneAsync({ _id: node._id });
      console.log(
        "Verified updated node:",
        JSON.stringify(updatedNode, null, 2),
      );
      console.log("=== updateNode DEBUG END (update) ===");
      return null;
    }
  },
  updateLink: async function (link) {
    console.log("add link:", link);
    //Check that link has the crucial properties:
    if (!link.strength || !link.source || !link.target) {
      alert("failed to update link: missing info");
      return null;
    }

    // console.log("added link in method!", link);
    if (!link._id) {
      //new link
      delete link._id;
      var tarLk = Links.findOne(link.target);
      if (tarLk) {
        //if targeting another link, add "derivation" node
        var tarNd = Nodes.findOne(tarLk.target);
        var derNdID = await Nodes.insertAsync({
          importance: tarNd.importance,
          x: tarNd.x - tarNd.importance,
          y: tarNd.y,
          graph: link.graph,
          type: "derivation",
          text: "",
          zoomLvl: 0,
        });
        await Links.updateAsync(link.target, { $set: { target: derNdID } });
        await Links.insertAsync({
          source: derNdID,
          target: tarNd._id,
          strength: tarLk.strength,
          type: tarLk.type,
          graph: link.graph,
          oriented: true,
          text: "",
        });
        link.target = derNdID;
        link.oriented = true;
        link.type = "theorem";
      }
      return await Links.insertAsync(link);
    } else {
      //update link
      var attr = {};
      for (var attrname in link) {
        if (attrname == "_id") continue;
        if (
          (attrname == "source" || attrname == "target") &&
          typeof link[attrname] !== "string"
        ) {
          //allow objects as source/target
          attr[attrname] = link[attrname]._id;
          continue;
        }
        attr[attrname] = link[attrname];
      }
      // console.log("attr",attr);
      var num = await Links.updateAsync({ _id: link._id }, { $set: attr });
      if (num != 1) alert("failed to update a document!");
      return null;
    }
  },

  resetNodeCoords: async function (graphName) {
    check(graphName, String); // Validate input

    // Update all nodes in the specified graph to have initial coordinates
    return await Nodes.updateAsync(
      { graph: graphName },
      { $set: { x: 2346, y: 2346 } },
      { multi: true },
    );
  },

  renameTypes: function (map) {
    // Iterate through each old_type -> new_type mapping
    Object.keys(map["nodes"]).forEach(function (oldType) {
      // Update all nodes with the old type
      if (oldType === null || oldType === "null") {
        query = { $or: [{ type: null }, { type: { $exists: false } }] };
      } else {
        query = { type: oldType };
      }
      Nodes.update(
        query,
        { $set: { type: map["nodes"][oldType] } },
        { multi: true },
      );
    });
    Object.keys(map["links"]).forEach(function (oldType) {
      // Update all links with the old type
      if (oldType === null || oldType === "null") {
        query = { $or: [{ type: null }, { type: { $exists: false } }] };
      } else {
        query = { type: oldType };
      }
      Links.update(
        query,
        { $set: { type: map["links"][oldType] } },
        { multi: true },
      );
    });

    console.log("Type renaming complete:", map);
  },

  deleteNode: async function (nd) {
    //Remove node and all connected links:
    await Links.removeAsync({ $or: [{ source: nd }, { target: nd }] });
    await Nodes.removeAsync(nd);
  },
  deleteLink: async function (lk) {
    await Links.removeAsync(lk);
  },

  weighGraph: async function (graph) {
    //calculate node and link weights
    if (Meteor.isServer) {
      //after the tree has been created No
      //Back-propagate importance values from leaves throughout the tree
      // create some useful indexes:
      // Links.rawCollection().createIndex({source:1,target:1});
      // Links.rawCollection().createIndex({target:1,source:1});
      // Links._ensureIndex({source:1,target:1})
      // Links._ensureIndex({target:1,source:1})
      // Nodes._ensureIndex({importance:1})
      // console.log("MMnodes",Nodes.find({graph:'MetaMath'}).fetch())
      //nodes that are not yet weighted:
      Links.remove({ graph: graph, strength: { $exists: false } }); //remove old effective links
      var nds = Nodes.find({ graph: graph }); //, level:lev});
      //===========Propagate weights from leafs===========================
      if (false) {
        var unweighted = nds.map((nd) => nd._id); //Object.keys(nodeDic).map((k) => nodeDic[k]);
        //Find average child to parent ratio:
        // var nnLev=1, lev=1; var ch2parRat=[];
        // while(nnLev>0){
        // nnLev=nds.count();
        // var aveNchildren = nds.map(nd=>nd.children.length)//.filter(nCh=>nCh>0);
        //   .reduce((tot,nCh)=>[tot[0]+nCh,tot[1]+(nCh>0)],[0,0]);
        // aveNchildren=(aveNchildren[0]/aveNchildren[1]); //average number of children (non-leaf nodes only)
        // // aveNchildren=math.median(aveNchildren);
        // var aveNparents = nds.map(nd=>Links.find({target:nd._id}).count())
        //   .reduce((tot,nCh)=>[tot[0]+nCh,tot[1]+(nCh>0)],[0,0]);
        // aveNparents=(aveNparents[0]/aveNparents[1]);
        // // aveNparents=math.median(aveNparents);
        // var ch2parRat = ((aveNchildren+1)/(aveNparents));
        // // ch2parRat.push((aveNchildren+1)/(1+aveNparents));
        // console.log("aveNchildren",aveNchildren,"aveNparent",aveNparents,"ratio",ch2parRat);
        // lev++;
        // }
        // aveNchildren=(aveNchildren[0]/aveNchildren[1]); //average number of children (non-leaf nodes only)
        //Save connectivity matrix for analysis:----------
        // var connMx=[];
        // for(iu in unweighted){
        //  var chi=Nodes.find(unweighted[iu]).map(nd=>nd.children)[0];
        //  for(ic in chi){ //construct sparse matrix
        //    connMx.push([iu,unweighted.indexOf(chi[ic]),'1\n']);
        //  }
        // }
        // connMx.push([unweighted.length-1, unweighted.length-1, 0])
        // saveAs(new File(connMx,"conn_matrix",{type: "text/plain"}));
        // return;
        //-------------------------------------------------
        var leafImp = 0.01; //the "unit" of node importance
        // var remaining = Nodes.find({graph:'MetaMath',importance:1.23456}).count();
        while (unweighted.length > 0) {
          //iterate through all nodes
          // console.log("Weighing nodes: "+unweighted.length+" remaining")
          //for each node whose children are already weighted:
          Nodes.find(
            {
              $and: [
                { _id: { $in: unweighted } },
                { children: { $nin: unweighted } },
              ],
            },
            // {graph:'MetaMath',importance:1.23456},
            { fields: { level: 1, number: 1 } },
          ).forEach(function (nd, idx) {
            //take only level field
            // if(Links.find({source:nd._id, strength:1.23456}).count()>0) return;
            console.log("weigh node " + idx + " of " + unweighted.length);
            //set importance to sum of all child link strengths:
            var ndImp = Links.find(
              { source: nd._id },
              { fields: { strength: 1, target: 1 } },
            )
              // .count()); /Nodes.findOne(lk.target).importance
              .map((lk) => lk.strength)
              .reduce((sum, value) => sum + value, 0);
            // var ndImp=Links.aggregate([{$match:{source : nd._id}},])
            // ndImp/=ch2parRat; //to balance out average sizes of early and late nodes
            ndImp += leafImp; ///(1+ndImp/leafImp)); //source importance from nodes/leafs
            // ndImp=Math.sqrt(ndImp);
            //Math.exp(-ndImp); //decaying influence of possible new nodes
            var parLk = Links.find(
              { target: nd._id },
              { fields: { source: 1 } },
            );
            // keep this fraction of weight, pass on the rest:
            // var keepFrac=0.5; //parLk.count()+1; keepFrac=1/(keepFrac*Math.log(keepFrac));
            // keepFrac=(keepFrac==Infinity)? 0:keepFrac;
            Nodes.update(nd._id, { $set: { importance: ndImp } });
            // nd.importance = (Links.find({source : nd._id})
            //  .map(lk => lk.strength).reduce((sum, value) => sum + value,2));
            //set strengths of all parent links according to their level:
            var parLk = Links.find(
              { target: nd._id },
              { fields: { source: 1 } },
            );
            //============== Weigh parent links ==================
            // //according to parent level
            // var parLev = parLk.map(lk=> lk.level);
            // //to avoid huge exponents that cancel out:
            // var parWt = parLev.map(lv => Math.exp((lv-parLev[0])/2));
            //-----------------------
            //according to parent's number of children of lower level (how many times parent has already been used)
            var parNChild = parLk.map(function (lk) {
              //for each parent link, take
              return Nodes.findOne(lk.source).chLevel.filter(
                (lvl) => lvl < nd.level,
              ).length;
              // return Links.find({source: lk.source},{target:1,_id:0}) //all links with same parent,
              //   .map(lk1 => Nodes.find({_id:lk1.target,level:{$lt:nd.level}}).count()) //their child nodes
              //   // .map(nd1 => nd1.level<nd.level)[0]) //with level lower than current
              //   .filter(use => use==1).length
            });
            // .reduce((tot,val)=>val?tot+1:tot, 0)); //count their number
            var parWt = parNChild.map((Nch) => 1 / (Nch + 1)); //parent link relative weight
            //==================================
            var parWtTot = parWt.reduce((sum, value) => sum + value, 0); //normalization
            // var pfI = parLk.count()+1; pfI = pfI*Math.log(pfI)*leafImp/5; //info content of the proof itself
            // parWtTot*=(1+Math.log(parLk.count()+1)); //include proof info as another ghost-node
            parLk.forEach(function (lk, ip) {
              Links.update(lk._id, {
                $set: { strength: (parWt[ip] / parWtTot) * ndImp },
              }); // ndImp/(1+pfI)}});
              // *Math.max(ndImp-pfI,leafImp)}});
            });

            //remove current node from unweighted list:
            unweighted.splice(unweighted.indexOf(nd._id), 1);
            // remaining--;
          });
        }
        //Compensate nodes found later in DB: (first node left as is, last node squared)
        // Nodes.find({graph:graph}).forEach(function(nd){
        //   // var currScale = (nd.number+1)/(nds.count()-nd.number+1);
        //   var currScale = Math.pow(nd.importance/leafImp,1/(2*nds.count()/nd.number -1));
        //   Nodes.update(nd._id,{$mul:{importance:currScale}});
        //   Links.update({target:nd._id},{$mul:{strength:currScale}});
        // })
        // Links.find({graph:graph}).forEach(function(lk){
        //   Links.update(lk._id,{$set:{strength:
        //     lk.strength*Math.sqrt(Nodes.findOne(lk.target).importance*Nodes.findOne(lk.source).importance)}})
        // })
      } //=====================================================================
      //==============Weight using random walker==============================
      else {
        // compute count once
        const totalNodes = await nds.countAsync();
        var iMax = 20 * totalNodes; //Math.exp(0.002*nds.count())
        var di = totalNodes / iMax;
        var wlkID = nds.map((nd) => nd._id); //Nodes.findOne({graph:graph, children:{size}})._id;
        wlkID = wlkID[Math.floor(Math.random() * wlkID.length)]; //random initial node
        Links.update(
          { graph: graph },
          { $set: { strength: di } },
          { multi: true },
        );
        Nodes.update(
          { graph: graph },
          { $set: { importance: di } },
          { multi: true },
        ); //initialize
        for (var i = 0; i < iMax; i++) {
          // var connLk=Links.find({$or:[{source:wlkID},{target:wlkID}]}).map(lk=>lk._id); //find all connected links (make array of IDs)
          // var lkID=connLk[Math.floor(Math.random()*connLk.length)]; //choose a random one
          // Links.update(lkID,{$inc:{strength:di}});
          // var lk=Links.findOne(lkID);
          // if(lk.source==wlkID){wlkID = lk.target;}
          // else {wlkID = lk.source}
          chiLk = Links.find({ source: wlkID }).map((lk) => lk._id);
          parLk = Links.find({ target: wlkID }).map((lk) => lk._id);
          if (Math.random() < chiLk.length / (chiLk.length + parLk.length)) {
            connLk = chiLk;
            if (connLk.length > 0) {
              lkID = connLk[Math.floor(Math.random() * connLk.length)];
              wlkID = Links.findOne(lkID).target;
            }
          } else {
            connLk = parLk;
            if (connLk.length > 0) {
              lkID = connLk[Math.floor(Math.random() * connLk.length)];
              wlkID = Links.findOne(lkID).source;
            }
          }
          var incr = di; //*Math.exp(-Nodes.findOne(wlkID).importance/di);
          Links.update(lkID, { $inc: { strength: incr } });
          Nodes.update(wlkID, { $inc: { importance: incr } });
          if (i % 1000 == 0) {
            console.log("weighting: step ", i, " of ", iMax);
          } //show progress
        }
      }
      //======================================================================
      Meteor.call("calcEffConn", graph, function (err, res) {
        // console.log("effective connectivities ",res)
        // tree.redraw();
      });
    }
  },

  calcEffConn: async function (graph) {
    //calculate the effective connectivit matrices
    if (Meteor.isServer) {
      //remove old effective links:-----
      Links.remove({ graph: graph, strength: { $exists: false } });
      Links.find({ graph: graph }).forEach(function (lk) {
        var del = {},
          delFl = false;
        for (var prop in lk) {
          //remove old effective links
          if (prop.substring(0, 8) == "strength" && prop.length > 8) {
            del[prop] = ""; //delete lk[prop];
            delFl = true;
          }
        }
        if (delFl) {
          Links.update(lk._id, { $unset: del });
        } //delete those fields from DB
      });
      //Generate connectivity matrix-----------------------------------
      var connMx = math.sparse(); //initialize connectivity matrix
      var allNodes = Nodes.find({ graph: graph }, { sort: { importance: -1 } }); // take all nodes, from most to least important
      var ndID = allNodes.map((nd) => nd._id); //make a dictionary array storing node ids
      var ndImp = allNodes.map((nd) => nd.importance);
      var mxN = await allNodes.countAsync();
      connMx.set([mxN, mxN], 0);
      //build the sparse matrix row-by-row:
      ndID.forEach(function (nd, idx, arr) {
        //for each node
        Links.find({ source: nd }).forEach(function (lk) {
          //for each child Links
          connMx.set(
            [
              idx, //set the matrix element in that row
              ndID.indexOf(lk.target),
            ], //and find column from dictionary
            lk.strength / ndImp[idx],
          ); //set mx element to link weight normalized by parent nd weight
        });
      });
      console.log("built " + mxN + " sparse connectivity matrix");

      //Calculate effective connectivity one level out-------------------------
      var connMxPS = math.multiply(0.9, connMx);
      // var connMxPS = math.add(math.multiply(0.95,connMx), //partly symmetrized connectivity matrix
      // math.multiply(0.1,math.transpose(connMx)));
      var zmIx = 1;
      while (mxN > VisNNodes[1]) {
        var splitN = Math.round(mxN / (ZoomStep * ZoomStep)); //hide all nodes after this idx
        var rg1 = math.range(0, splitN),
          rg2 = math.range(splitN, mxN);

        var mxB = connMxPS.subset(math.index(rg1, rg2)),
          mxC = connMxPS.subset(math.index(rg2, rg1)),
          mxD = connMxPS.subset(math.index(rg2, rg2));
        connMxPS = math.add(
          connMxPS.subset(math.index(rg1, rg1)), //add actual connections to effectve ones
          math.multiply(
            math.divide(
              mxB,
              math.subtract(
                math.eye(mxN - splitN),
                math.add(mxD, math.multiply(mxC, mxB)),
              ),
            ),
            mxC,
          ),
        ); //calculate effective connectivity according to total flow between nodes

        //Store effective connectivities in Links DB-------------------------------
        // connMxPS=connMxPS.map(wt => parseFloat(wt.toFixed(1)),true);//(wt>0.05 ? wt : 0),)
        ndID.slice(splitN, mxN).forEach(function (id) {
          Nodes.update(id, { $set: { zoomLvl: zmIx - 1 } }); //store zoom level for each node
        });
        connMxPS.forEach(function (effWt, idx) {
          //for each non-zero entry of connMx
          if (
            idx[0] == idx[1] || //ignore self-links
            (effWt < 0.05 && effWt * ndImp[idx[0]] < ndImp[idx[1]] * 0.05) || //ignore weak effective links
            effWt < connMxPS.subset(math.index(idx[1], idx[0]))
          ) {
            return;
          }
          var temp = {};
          temp["strength" + zmIx] = effWt * ndImp[idx[0]];
          Links.upsert(
            { source: ndID[idx[0]], target: ndID[idx[1]] }, //find the corresponding link
            {
              $set: temp, //add a strength field for the current zoom level
              $setOnInsert: { type: "theorem", oriented: true, graph: graph },
            },
          ); //if the link did not exist before, insert it
          // console.log(Links.find(updLk.insertedId).fetch())
          // var src=Nodes.findOne(ndID[idx[0]]), trg=Nodes.findOne(ndID[idx[1]]);
        });
        zmIx++;
        //reduce matrix size:
        // ndID=ndID.slice(0,splitN);
        // ndImp=ndImp.slice(0,splitN);
        // connMxPS=connMxPS.subset(math.index(rg1,rg1));
        // mxN = ndID.length;
        mxN = splitN;
      }
    }
  },
});
