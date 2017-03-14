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
		for (var i=0; i<mmString.length; i++){ //traverse the file char by char
			var char=mmString.charAt(i);
			if(mmToken && (!comment || char==')')){ //MetaMath commands
				switch(char){
					case '(': comment=true; lastComment=''; break;
					case ')': comment=false; break; //store comments
					//store nodes for each level blocks in their own entry 
					//of the thmList until the block ends, at which point we add the 
					//resulting array to the lower level - at the end only thmList[0] 
					//matters, and is made up of nodes and block sub-arrays
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
						}
						if(stmtFlag){ //add node object to array
							var same=thmList[blkDepth].find(nd => 
								nd.body==node.body && nd.tok=='p');
							if(same) node.sameAs=same.label; //label if alternate proof
							thmList[blkDepth].push(node);
						}
						stmtFlag=0;
						break;
				}
			}
			if(!mmToken && char!='$' && char!='\n'){ //skip all control characters
				if(comment) lastComment+=char;
				else if(char!=' ') {
					if(mmString.charAt(i-1)==' ') lastToken='';
					lastToken+=char;
					// mmCode+=char;
				}
				if(stmtFlag==1) node.body+=char;
				if(stmtFlag==2) proof+=char;
			}
			mmToken=false;
			if(mmString.charAt(i)=='$') mmToken=true; //mm command to follow
		}
		callback(thmList[0]);
	}
	reader.readAsText(file); //read in the text file
}

loadMetamath = function(file){
	console.log("Read metamath");
	parseMetamath(file,function(thmList){
		// var fileS = new File([JSON.stringify(thmList,null,1)],
		//   'parsed_MetaMath',
		//   {type: "application/json"});//"text/plain;charset=utf-8"});
		// saveAs(fileS);
		console.log(thmList);
	});
}