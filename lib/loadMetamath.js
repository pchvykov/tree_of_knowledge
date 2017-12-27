parseMetamath = function(file){
	var reader = new FileReader();
	reader.onload = function(e){ //when text file is read in
		var mmString = reader.result; //the text
		console.log("file length:",mmString.length);

		var stmtFlag, //flag for in body=1 or proof=2, else =0
			proof='', //temporary proof string
			node={}, //object for thm/axiom/hypothesis node
			thmList=[[]], //parsed list of theorems
			lastToken='', //previous token ( word )
			lastComment='', //previous comment
			mmCode='', //Stores user tokens only (no comments or mm tokens)
			comment=false, //in comment flag
			mmToken=false, //MetaMath command tag
			blkDepth=0; //Command block depth
		for (var i=0; i<mmString.length/30; i++){ //traverse the file char by char
			var char=mmString.charAt(i);
			if(mmToken && (!comment || char==')')){ //MetaMath commands
				switch(char){
					case '(': comment=true; lastComment=''; break;
					case ')': comment=false; break; //store comments
					//store nodes for each level blocks in their own entry 
					//of the thmList until the block ends, at which point we push the 
					//resulting array to the previous entry - at the end only thmList[0] 
					//matters, and is made up of nodes and block sub-arrays
					//This is basically doing recursion manually, with thmList as RAM
					case '{': blkDepth++; 
						thmList[blkDepth] = [];
						break;
					case '}': blkDepth--; lastComment='';
						thmList[blkDepth].push(thmList[blkDepth+1]);
						break;
					//mm main statements saved as objects
					case 'p':
					case 'e':	
					case 'a': 
						node={};
						node.tok=char;
						node.label=lastToken;
						node.comment=lastComment; lastComment='';
						node.body=''; stmtFlag=1;
						break;
					case '=': //store proof
						proof='';
						stmtFlag=2;
						break;
					case '.': //end statement and store node
						if(stmtFlag==2) { //parse proof string
							proof = proof.split(" ")
								.filter(function(el) {return el.length != 0});
							node.proof=proof.slice(proof.indexOf('(')+1,proof.indexOf(')'));

							var same=thmList[blkDepth].find(nd => 
								nd.body==node.body && nd.tok=='p');
							if(same) node.sameAs=same.label; //label if alternate proof
						}
						if(stmtFlag){ //add node object to array
							thmList[blkDepth].push(node);
						}
						stmtFlag=0;
						break;
				}
			}
			if(!mmToken && char!='$' && char!='\n'){ //skip all control characters
				if(comment) lastComment+=char;
				else {
					mmCode+=char; // list of user tokens only - easy to search
					if(char!=' ') {
						if(mmString.charAt(i-1)==' ') lastToken='';
						lastToken+=char;
					}
				}
				if(stmtFlag==1) node.body+=char;
				if(stmtFlag==2) proof+=char;
			}
			mmToken=false;
			if(mmString.charAt(i)=='$') mmToken=true; //mm command to follow
		}
		// var fileS = new File([mmCode],
		//   'MetaMath_code',
		//   {type: "text/plain;charset=utf-8"});
		// saveAs(fileS);
		Meteor.call("loadMetamath",thmList[0],mmCode);
		$('#availGraphs').append($('<option>', { 
          value: 'MetaMath',
          text : 'MetaMath' 
      	}));
	}
	reader.readAsText(file); //read in the text file
}


isArray = function(a) {
    return (!!a) && (a.constructor === Array);
};
isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};

Meteor.methods({ //load tree into DB directly on server
loadMetamath : function(thmList, mmCode){
	console.log("Loading metamath: ", thmList.length, "theorems");
	// var fileS = new File([JSON.stringify(thmList,null,1)],
	//   'parsed_MetaMath',
	//   {type: "application/json"});//"text/plain;charset=utf-8"});
	// saveAs(fileS);
	// console.log(thmList);
	var nodeDic = {}; //Dictionary giving node IDs for every statement label
	//recursively add nodes:
	function readBlock(block, essHyp, stack){ //pass string of essential hypotheses from above
		var essLocal=essHyp;
		for(var ii in block){ //loop over entries of block
			var stmt=block[ii];
			if(isObject(stmt)){ //if it's really a statment (e or p)
				switch(stmt.tok){
					case 'e': 
						essLocal+=(stmt.body+'\\\\'+stmt.comment+'\n');
						continue;
					case 'p':
					case 'a': 
						var nd={};
						nd.title=stmt.label;
						nd.text=essLocal+'=>\n'+stmt.body+'\n\\\\'+stmt.comment;
						nd.x=2345;//code for unpositioned node //2500+100*Math.random(); 
						nd.y=2345;//2500+100*Math.random(); //starting node location
						nd.graph='MetaMath';
						nd.importance=1.2345; //dummy importance value
						nd.children =[]; //node children's IDs
						nd.level=1; //axioms start at level 1
						//4*Math.log((mmCode.match(new RegExp(
							// ' '+stmt.label+' ', 'g')).length +1)); //importance proportional to number of references
						var ndID=Nodes.insert(nd);
						nodeDic[stmt.label]=ndID;
						
				    	if(stmt.tok=='p'){ //add links to dependencies
				    		var lvl=0;
				    		for(var ix in stmt.proof){
				    			var lk={};
				    			lk.type = 'theorem';
				    			lk.strength=1.2345;//(nd.importance+nodeDic[stmt.proof[ix]].imp)/10;
				    			lk.source = nodeDic[stmt.proof[ix]];
				    			lk.target = ndID;
				    			lk.oriented = true;
				    			lk.level=Nodes.find(lk.source).map(nd=>nd.level)[0];
				    			lk.graph = "MetaMath";
				    			Links.insert(lk);
				    			Nodes.update(lk.source,	{$push:{children:ndID}});
				    			//node level is 1 higher than highest parent level
				    			lvl=Math.max(lvl, lk.level+1);
				    			
				    		}

				    		Nodes.update(ndID,{$set:{level:lvl}})
				    	}
						
			    };
			}
			else if(isArray(stmt)){ //else if array, then read recursively
				readBlock(stmt,essLocal,stack+1);
			}
			else alert("problem with parsed MetaMath");
		}
		//after the tree has been created, back-propagate importance values 
		//from leaves throughout the tree
		if(stack==0){
			// console.log("MMnodes",Nodes.find({graph:'MetaMath'}).fetch())
			//nodes that are not yet weighted:
			var unweighted = Object.keys(nodeDic).map((k) => nodeDic[k]);
			//Save connectivity matrix for analysis:----------
			// var connMx=[];
			// for(iu in unweighted){
			// 	var chi=Nodes.find(unweighted[iu]).map(nd=>nd.children)[0];
			// 	for(ic in chi){ //construct sparse matrix
			// 		connMx.push([iu,unweighted.indexOf(chi[ic]),'1\n']);
			// 	}
			// }
			// connMx.push([unweighted.length-1, unweighted.length-1, 0])
			// saveAs(new File(connMx,"conn_matrix",{type: "text/plain"}));
			// return;
			//-------------------------------------------------
			
			while(unweighted.length >0){  //iterate through all nodes
			//for each node whose children are already weighted:
			Nodes.find({$and:[{_id:{$in:unweighted}},{children:{ $nin: unweighted }}]})
			.forEach(function(nd){
				//set importance to sum of all child link strengths:
				var ndImp=(Links.find({source : nd._id})
					.map(lk => lk.strength).reduce((sum, value) => sum + value,0));
				ndImp+=(1/(1+ndImp)); //cource importance from liefs
				//Math.exp(-ndImp); //decaying influence of possible new nodes
				Nodes.update(nd._id, {$set:{importance : ndImp}});
				// nd.importance = (Links.find({source : nd._id})
				// 	.map(lk => lk.strength).reduce((sum, value) => sum + value,2));
				//set strengths of all parent links according to their level:
				var parLk = Links.find({target : nd._id});
				//============== Weigh parent links ==================
				// //according to parent level
				// var parLev = parLk.map(lk=> lk.level);
				// //to avoid huge exponents that cancel out:
				// var parWt = parLev.map(lv => Math.exp((lv-parLev[0])/2));
				//-----------------------
				//according to parent's number of children of lower level
				var parNChild = parLk.map(lk => //for each parent link, take
					Links.find({source: lk.source}) //all links with same parent,
						.map(lk1 => Nodes.find(lk1.target) //their child nodes
							.map(nd1 => nd1.level<nd.level)[0]) //with level lower than current
						.reduce((tot,val)=>val?tot+1:tot, 0)); //count their number
				var parWt = parNChild.map(Nch => 1/(Nch+1)); //parent link relative weight
				//==================================
				var parWtTot=parWt.reduce((sum, value) => sum + value,0); //normalization
				parLk.forEach(function(lk,ip){
					Links.update(lk._id,{$set:{strength: parWt[ip]/parWtTot*ndImp}});
				})

				//remove current node from unweighted list:
				unweighted.splice(unweighted.indexOf(nd._id),1);
			})
			}

			Meteor.call("calcEffConn",'MetaMath',function(err,res){
			  console.log("effective connectivities ",res)
			  // tree.redraw();
			})

		}
		return;
	}
	
	readBlock(thmList.slice(0,160),'',0); //Take first 60 nodes
		
}
})
