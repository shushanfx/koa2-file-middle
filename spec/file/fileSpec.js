var fileSystem = require("file-system");

describe("Read file recursively.", function(){
	it("test01", function(){
		fileSystem.recurseSync("./node_modules", function(filepath, relative, filename){
			console.info(filepath, relative, filename);
		});
	});

	it("test02", function(){
		console.info(loadCache("./node_modules"));
	});
});

function loadCache(item){
	let tmpArr = [];
	try{
		fileSystem.recurseSync(item, function(filePath, relative, fileName){
			if(fileName && relative){
				// only file.
				tmpArr.push("/" + relative.replace(/\\/g, "/"));
			}
		});				
	} catch(e){
		console.error("Read directory ", item, " error.");
		tmpArr = [];
	}
	return tmpArr;
}