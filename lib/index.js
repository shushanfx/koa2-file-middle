var path = require("path");

var etagGenerator = require("etag");
var debug = require("debug")("file-middle");
var fileSystem = require("file-system");
var fs = require("mz/fs");

function checkPrefix(prefix) {
	if (typeof prefix === "string") {
		let pre = prefix.trim();
		if (pre === "."
			|| pre === "./"
			|| pre === "/") {
			return ""
		}
		else {
			return pre;
		}
	}
	return "";
}

function loadCache(item) {
	let tmpArr = [];
	try {
		fileSystem.recurseSync(item, function (filePath, relative, fileName) {
			if (fileName && relative) {
				// only file.
				let pathItem =  "/" + relative.replace(/\\/g, "/");
				tmpArr.push(pathItem);
				debug("Register file to cached path: %s", pathItem);
			}
		});
	} catch (e) {
		console.error("Read directory ", item, " error.");
		tmpArr = [];
	}
	return tmpArr;
}

function isAsyncFunction(func) {
	if (typeof func === "function" && func.constructor && func.constructor.name === "AsyncFunction") {
		return true;
	}
	return false;
}
/**
 * Generate a koa middle ware.
 * @param {String|Array<String>} directories The absolute path, or path array.
 * @param {Object} [options] The options config for middle ware. 
 * @param {String} [options.prefix] Prefix for uri, when matching, delevery prefix from uri.
 * @param {String|Array<String>} [options.index] If handle the splash end uri. default is not handle. 
 * @param {Boolean} [options.cache] Cache the directory in memeory, which will make the matching operation more faster. it is
 * 		useful for production.
 * @param {Boolean} [options.lastModified] if check the last modified.
 * @param {Boolean} [options.etag] If check the etag.
 * @param {Integer} [options.maxage] or maxAge, for max age for uri.
 * @param {Boolean} [options.hidden] Whether hidden file expose to outside world. True for show hidden, False for hidden the file.
 * @param {String|Array<String>} [options.extension] search with specificed extension one by one.
 */
function middleWare(directories, options) {
	const op = options || {};
	const _pre = checkPrefix(op.prefix);
	const _dir = directories;
	const _innerArray = [];
	const cached = !!op.cache;
	const cachedFile = {};
	const lastModifiedCheck = !! op.lastModified;
	const etagCheck = !! op.etag;

	const index = op.index;
	const maxAge = op.maxage || op.maxAge;
	const hidden = op.hidden;
	const extension = Array.isArray(op.extension) ? op.extension : (typeof op.extension === "string" ? [op.extension] : null);
	const onBefore = op.onBefore;
	const onBeforeAsync = isAsyncFunction(onBefore);

	if(op.debug){
		debug.enabled = true;
	}

	if (!Array.isArray(directories)) {
		_dir = [directories]
	}
	_dir.forEach(function (item) {
		let obj = {
			"directory": path.resolve(process.cwd(), item)
		};
		if (cached) {
			obj.cache = loadCache(item);
		}
		_innerArray.push(obj);
	});
	return async function (ctx, next) {
		if(ctx.status !== 404){
			await next();
			return ;
		}

		let uri = ctx.path;
		let isFound = false,
			foundFinalPath = null,
			foundItem = null,
			foundPath = null,
			foundStat = null;
		let pathArray = [];
		let searchArray = [];
		let isEndWithSlash = false;

		if (typeof uri !== "string") {
			await next();
			return;
		}
		uri = decode(uri);
		if (path === -1) {
			return ctx.throw(400, "failed to decode.");
		}
		if (_pre && uri.startsWith(_pre)) {
			uri = uri.substring(_pre.length);
		}
		if (!uri.startsWith("/")) {
			uri = "/" + uri;
		}
		if (uri[uri.length - 1] === "/") {
			isEndWithSlash = true;
			if(typeof index === "string"){
				pathArray.push(uri + index);
			}
			else if(Array.isArray(index)){
				index.forEach(item => {
					pathArray.push(uri + item);
				});
			}
		}
		else{
			pathArray.push(uri);
		}
		if(!hidden){
			pathArray.filter(item => {
				return ! isHidden(item);
			});			
		}

		let ret = true;
		if(typeof onBefore === "function"){
			if(onBeforeAsync){
				ret = await onBefore(pathArray, ctx);
			}
			else{
				ret = onBefore(pathArray, ctx);
			}
		}
		if(ret === false || pathArray.length === 0){
			await next();
			return ;
		}
		if(Array.isArray(extension)){
			let tmpArr = [];
			pathArray.forEach(item => {
				tmpArr.push(item);
				Array.prototype.push.apply(tmpArr, 
					extension.map(jtem => item + jtem)
				);
			});
			pathArray = tmpArr;
		}
		searchArray = pathArray;
		debug("Search path : %s ", searchArray);

		for (let i = 0, size = _innerArray.length; i < size; i++) {
			let item = _innerArray[i];
			for(let j = 0; j < searchArray.length; j++){
				let jtem = searchArray[j];
				if(cached){
					if(item.cache.indexOf(jtem) != -1){
						let _finalPath = path.resolve(item.directory, "." + jtem);
						let fromCache = cachedFile[_finalPath];
						// read from cache
						if(!fromCache){
							let stat = await fs.stat(_finalPath);
							fromCache = {
								size : stat.size,
								mtime: stat.mtime,
								etag: null
							};
							if(etagCheck){
								fromCache.etag = etagGenerator(stat);
							}
							cachedFile[_finalPath] = fromCache;
						}
						foundPath = jtem;
						foundItem = item;
						foundStat = fromCache;
						foundFinalPath = _finalPath;
						isFound = true;
						break;
					}
				}		
				else{
					let _finalPath = path.resolve(item.directory, "." + jtem);
					let _isExist = await fs.exists(_finalPath);
					if(_isExist){
						let _stat = await fs.stat(_finalPath);
						if(_stat && _stat.isFile){
							foundPath = jtem;
							foundItem = item;
							foundStat = {
								size : _stat.size,
								mtime: _stat.mtime,
								etag: null
							};
							foundFinalPath = _finalPath;
							if(etagCheck){
								foundStat.etag = etagGenerator(_stat);
							}
							isFound = true;
							break;
						}
					}
				}
			}
			if(isFound){
				break;
			}
		}
		if (isFound) {
			// found and send.
			let fileSize = foundStat.size,
				fileMTime = foundStat.mtime,
				fileETag = foundStat.etag;
			let is304 = false;
			is304 = ctx.status == 304;
			// etag check.
			if(!is304 && etagCheck){
				let header = ctx.header["if-none-match"];
				if(header){
					let etag = header;
					debug("If-None-Match: %s ", header);
					if(etag){
						if(etag === fileETag){
							is304 = true;
						}
					}
				}
			}
			// last modified check.
			if(!is304 && lastModifiedCheck){
				let header = ctx.header["if-modified-since"];
				if(header){
					let mTimeString = fileMTime.toGMTString();
					debug("If-Modified-Since: %s ", header);
					if(mTimeString === header){
						is304 = true;
					}
				}
			}
			debug("Found path %s in %s", foundPath, foundItem.directory);
			let lastModifiedString = fileMTime.toGMTString();
			ctx.set("Content-Length", fileSize);
			if(fileETag){
				ctx.set("ETag", fileETag);
			}
			debug("Content-Length: %s ", fileSize);
			etagCheck && debug("Last-Modified: %s ", lastModifiedString);
			lastModifiedCheck && debug("ETag: %s ", fileETag);
			ctx.type = path.extname(path.basename(foundFinalPath, ".gz"));
			if(typeof maxAge === "number"){
				if(maxAge > 0){
					ctx.set("Cache-Control", "max-age=" + maxAge);
					let expiredDate = new Date(Date.now() +  maxAge * 1000);
					ctx.set("Expires", expiredDate.toGMTString());
				}
				else{
					ctx.set("Cache-Control", "max-age=0; no-cache");
				}
			}
			if(is304){
				ctx.status = 304;
			}
			else{
				ctx.set("Last-Modified", lastModifiedString);
				ctx.body = fs.createReadStream(foundFinalPath);
			}
		}
		else {
			debug("Not found path %s", uri);
			await next();
		}
	};
}

/**
 * decode
 * @param {String|Number} path 
 */
function decode(path) {
	try {
		return decodeURIComponent(path)
	} catch (err) {
		return -1
	}
}

function getDate(str){
	try{
		return Date.parse(str);
	}catch(e){

	}
	return null;
}

function isHidden(p) {
	var _path = p.split(path.sep)
	for (let i = 0; i < _path.length; i++) {
		if (_path[i][0] === '.') return true
	}
	return false
}



module.exports = middleWare;