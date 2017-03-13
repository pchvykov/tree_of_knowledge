loadMetamath = function(file){
	console.log("Read metamath");
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
			mmCode='',
			comment=false, //in comment flag
			mmToken=false, //MetaMath command tag
			blkDepth=0; //Command block depth
		for (var i=0; i<mmString.length; i++){ //traverse the file char by char
			var char=mmString.charAt(i);
			if(mmToken && (!comment || char==')')){
				switch(char){
					case '(': comment=true; lastComment=''; break;
					case ')': comment=false; break;
					case '{': blkDepth++; 
						thmList[blkDepth] = [];
						break;
					case '}': blkDepth--; 
						thmList[blkDepth].push(thmList[blkDepth+1]);
						break;
					case 'p':
					case 'e':	
					case 'a': 
						node={};
						node.tok=char;
						node.label=lastToken;
						node.comment=lastComment; lastComment='';
						node.body=''; stmtFlag=1;
						break;
					case '=':
						proof='';
						stmtFlag=2;
						break;
					case '.':
						if(stmtFlag==2) {
							proof=proof.split(" ")
								.filter(function(el) {return el.length != 0});
							node.proof=proof.slice(proof.indexOf('(')+1,proof.indexOf(')'),);
						}
						if(stmtFlag) thmList[blkDepth].push(node);
						stmtFlag=0;
						break;
				}
			}
			if(!mmToken && char!='$'){ //skip all control characters
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
			if(mmString.charAt(i)=='$') mmToken=true;
		}
		var fileS = new File([JSON.stringify(thmList[0],null,1)],
		  'parsed_MetaMath',
		  {type: "application/json"});//"text/plain;charset=utf-8"});
		saveAs(fileS);
		console.log(thmList);
	}
	reader.readAsText(file); //read in the text file
}