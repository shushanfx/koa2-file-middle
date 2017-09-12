var path = require("path");
var fs = require("fs");

var koaSend = require("koa-send");
var debug = require("debug")("file-middle");
var fileSystem = require("file-system")

function checkPrefix(prefix){
	if(typeof prefix === "string"){
		let pre = prefix.trim();
		if(pre === "." 
			|| pre === "./"
			|| pre === "/"){
			return ""
		}
		else{
			return pre;
		}
	}
	return "";
}

function loadCache(item){
	let tmpArr = [];
	try{
		fileSystem.recurseSync(item, function(filePath, relative, fileName){
			if(fileName && relative){
				// only file.
				tmpArr.push("/" + relative.replace(/\\/g, "/"));
				debug("Register file to cached path: %s", filePath);
			}
		});				
	} catch(e){
		console.error("Read directory ", item, " error.");
		tmpArr = [];
	}
	return tmpArr;
}

/**
 * Generate a koa middle ware.
 * @param {String|Array<String>} directories The absolute path, or path array.
 * @param {Object} [options] The options config for middle ware. 
 * @param {String} [options.prefix] Prefix for uri, when matching, delevery prefix from uri.
 * @param {Boolean} [options.cached] Cache the directory in memeory, which will make the matching operation more faster. it is
 * 		useful for production.
 */
function middleWare(directories, options){
	var op = options || {};
	var _pre = checkPrefix(op.prefix);
	var _dir = directories;
	var _innerArray = [];
	var cached = !! op.cachedPath;
	if(!Array.isArray(directories)){
		_dir = [directories]
	}
	_dir.forEach(function(item){
		let obj = {
			"directory": item
		};
		if(cached){
			obj.cache = loadCache(item);
		}
		_innerArray.push(obj);
	});
	return async function(ctx, next){
		let uri = ctx.path;
		let isFound = false,
			directory = null;
		if(_pre && typeof uri === "string" && uri.startsWith(_pre)){
			uri = uri.substring(_pre.length);
		}
		if(typeof uri === "string" && !uri.startsWith("/")){
			uri = "/" + uri;
		}
		for(let i = 0, size = _innerArray.length; i < size; i++){
			let item = _innerArray[i];
			if(cached){
				// cached found.
				for(let j = 0; j < item.cache.length; j ++ ){
					let jtem = item.cache[j];
					if(jtem === uri){
						directory = item.directory;
						isFound = true;
						break;
					}
				}
				if(isFound){
					break;
				}
			}
			else{
				let _finalPath = path.resolve(item.directories, "." + uri);
				debug("Search with path ", _finalPath);
				if(fs.existsSync(_finalPath)){
					directory = item.directory;
					isFound = true;
					break;
				}				
			}
		}
		if(isFound){
			debug("Found path %s in %s", uri, directory);
			await koaSend(ctx, uri, {root: path.resolve(directory)});
		}
		else{
			debug("Not found path %s", uri);
			await next();
		}
	}
}

module.exports = middleWare;