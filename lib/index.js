var path = require("path");

var etagGenerator = require("etag");
var debug = require("debug")("file-middle");
var fileSystem = require("file-system");
var fs = require("mz/fs");
var dateformat = require("dateformat");

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
				tmpArr.push("/" + relative.replace(/\\/g, "/"));
				debug("Register file to cached path: %s", filePath);
			}
		});
	} catch (e) {
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
 * @param {Boolean} [options.cache] Cache the directory in memeory, which will make the matching operation more faster. it is
 * 		useful for production.
 * @param {Boolean} [options.lastModified] if check the last modified.
 * @param {Boolean} [options.etag] If check the etag.
 * @param {String} [options.index] If handle the splash end uri. default is not handle.
 * @param {Integer} [options.maxage] or maxAge, for max age for uri.
 * @param {Boolean} [options.immutable] If the client cache can be immutable.
 * @param {Boolean} [options.hidden] Whether hidden file expose to outside world. True for show hidden, False for hidden the file.
 * @param {Array<String>} [options.extensions] search with specificed extension one by one.
 * @param {Function} [options.setHeaders] A function to handle something before headers are sent to client. with three agurments (ctx.res, finalPath, stats)
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
	const maxAge = op.maxage || op.maxAge || 0;
	const hidden = op.hidden;
	const extensions = op.extensions;

	if(op.debug){
		debug.enabled = true;
	}

	if (!Array.isArray(directories)) {
		_dir = [directories]
	}
	_dir.forEach(function (item) {
		let obj = {
			"directory": item
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
			foundItem = null,
			foundPath = null;
		let isEndWithSlash = false;
		let searchArray = [];

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
		if (uri[uri.length - 1]) {
			isEndWithSlash = true;
		}
		if (typeof index === "string" && isEndWithSlash) {
			uri = uri + index;
		}

		if(!hidden && isHidden(uri)){
			await next();
			return ;	
		}
		searchArray = [uri];
		if (Array.isArray(extensions)) {
			searchArray.concat(extensions.slice().map(item => uri + item));
		}

		for (let i = 0, size = _innerArray.length; i < size; i++) {
			let item = _innerArray[i];
			for(let j = 0; j < searchArray.length; j++){
				let jtem = searchArray[j];
				if(cached){
					if(item.cache.indexOf(jtem) != -1){
						foundPath = jtem;
						foundItem = item;
						isFound = true;
						break;
					}
				}		
				else{
					let _finalPath = path.resolve(item.directory, "." + jtem);
					if (await fs.exists(_finalPath)) {
						foundPath = jtem;
						foundItem = item;
						isFound = true;
						break;
					}
				}
			}
			if(isFound){
				break;
			}
		}
		if (isFound) {
			// found and send.
			let finalPath = path.resolve(foundItem.directory, "." + foundPath);
			let fileSize = 0;
			let fileMTime = 0;
			let fileETag = null;
			let is304 = false;

			if(cached){
				let fromCache = cachedFile[finalPath];
				// read from cache
				if(!fromCache){
					let stat = await fs.stat(finalPath);
					fromCache = {
						size : stat.size,
						mtime: stat.mtime,
						etag: null
					};
					if(etagCheck){
						fromCache.etag = etagGenerator(stat);
					}
					cachedFile[finalPath] = fromCache;
				}
				fileSize = fromCache.size;
				fileMTime = fromCache.mtime;
				fileETag = fromCache.etag;
			}
			else{
				let stat = await fs.stat(finalPath);
				fileSize = stat.size;
				fileMTime = stat.mtime;
				if(etagCheck){
					fileETag = etagGenerator(stat);
				}
			}

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
			// let lastModifiedString = dateformat(fileMTime, "ddd, dd mmm yyyy HH:MM:ss") + " GMT";
			let lastModifiedString = fileMTime.toGMTString();
			ctx.set("Content-Length", fileSize);
			if(fileETag){
				ctx.set("ETag", fileETag);
			}
			debug("Content-Length: %s ", fileSize);
			etagCheck && debug("Last-Modified: %s ", lastModifiedString);
			lastModifiedCheck && debug("ETag: %s ", fileETag);
			ctx.type = path.extname(path.basename(finalPath, ".gz"));
			if(is304){
				ctx.status = 304;
			}
			else{
				ctx.set("Last-Modified", lastModifiedString);
				ctx.body = fs.createReadStream(finalPath);
			}
		}
		else {
			debug("Not found path %s", uri);
			await next();
		}
	}
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