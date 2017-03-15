function parseMetamath (file, callback){
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
		for (var i=0; i<mmString.length/50; i++){ //traverse the file char by char
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
		callback(thmList[0],mmCode);
	}
	reader.readAsText(file); //read in the text file
}


isArray = function(a) {
    return (!!a) && (a.constructor === Array);
};
isObject = function(a) {
    return (!!a) && (a.constructor === Object);
};
loadMetamath = function(file){
	console.log("Read metamath");
	parseMetamath(file,function(thmList, mmCode){
		// var fileS = new File([JSON.stringify(thmList,null,1)],
		//   'parsed_MetaMath',
		//   {type: "application/json"});//"text/plain;charset=utf-8"});
		// saveAs(fileS);
		console.log(thmList);
		//recursively add nodes:
		function readBlock(block, essHyp){ //pass string of essential hypotheses from above
			var essLocal=essHyp;
			function readStmt(ii){ //just a loop over entries of block, but 
				//done recursively to allow DB to update before moving on
				var stmt=block[ii];
				if(isObject(stmt)){
					switch(stmt.tok){
						case 'e': 
							essLocal+=(stmt.body+'\\\\'+stmt.comment+'\n');
							if(block[ii+1]) readStmt(ii+1);
							return;
						case 'a': 
							var nd={};
							nd.title=stmt.label;
							nd.text=essLocal+'\n'+stmt.body+'\n\\\\'+stmt.comment;
							nd.x=100; nd.y=100; //starting node location
							nd.graph='MetaMath';
							nd.importance=mmCode.match(new RegExp(
								' '+stmt.label+' ', 'g')).length +1; //importance proportional to number of references
							console.log('adding node');
							Meteor.call("updateNode", nd,
							  function(err,res){
							    if(err) alert(err);
							    if(res && block[ii+1]){ 
							    	stmt._id=res;
							    	readStmt(ii+1)
							    };
							  });
							return;
						case 'p': 
							if(block[ii+1]) readStmt(ii+1);
							return;
					}
				}
				else if(isArray(stmt)){
					readBlock(stmt,essLocal);
					if(block[ii+1]) readStmt(ii+1);
					return;
				}
				else alert("problem with parsed MetaMath");
			}
			readStmt(0);
		}
		
		readBlock(thmList,'');
		$('#availGraphs').append($('<option>', { 
              value: 'MetaMath',
              text : 'MetaMath' 
          }));
		// Meteor.call("updateNode",
		//   obj, dat.sourceID, link,
		//   function(err,res){
		//     if(err) alert(err);
		//     if(res){ dat.node._id=res[0];}
		//     dat.gui.showContent(dat.node);
		//   });
	});
}