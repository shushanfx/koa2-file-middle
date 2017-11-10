# Koa2 File Middle
A middleware for static file. Filter multi path for static router. 

## How to use
* Install it:   
	```bash
	npm install koa2-file-middle --save
	```
* Use it:    
	It can simply use like this.
	```javascript
	var koa = require("koa");
	var koaFileMiddle = require("koa2-file-middle");

	var app = new koa();
	app.use(koaFileMiddle(["./static", "./public"], {
		debug: true
	}));

	app.listen("9090");
	```

## How to test
Just run this command after the dependencies have installed:
```bash
jasmine
```

## Options
The supported options as follow:
**prefix** : String
Prefix for uri, when matching, delivery prefix from uri. for example, set to `/static`, and a request path is `/static/index.js`, the final matching uri will be `/index.js`;
**index**: String | Array<String>
When handle the slash ending uri, adding the index string to the uri. Such as, set to `["index.html", "index.htm"]`, and a request's path is `/json/`,  the final matching uri will be `["/json/index.html", "/json/index.htm"]`.
**extension**: String | Array<String>
When handle the uri(not ending with slash), the extension will be appended to the matching queue. Such as, set to `.html`, and a request's path is ``/json/index`, the final mathing uri will be `["/json/index", "/json/index.html"]`.
**cache** : true | false, default false.
Whether to cache all the file pathes in memory, which will make the matching operation faster. It's useful for production.
**maxAge(maxage)**: number, default 0.
Whether to set the `cache-control` header of max-age to response. if it is greater than 0, flush the header of cache(both `expires` and `cache-control`) to response.
**lastModified**: true | false, default false.
Whether to check the request header `if-modified-since`. It's useful for production.
**etag**: true | false, default false.
Whether to check the request header `if-none-match`. It's useful for production.
**hide**: true | false, default false.
Whether to expose the hidden file to outside world. True for exposing.

**onBefore**: function
function(matchingArray, ctx), matchingArray is the matching array for matching, it will be mactched one by one.
return value: if the return value is `false`, it will stop the matching process and chain to next the middle ware.
```javascript
app.use({
	// ...
	onBefore: function(list, ctx){
		var item = list[0];
		if(item && item.indexOf("ver.js")){
			list.splice(0, 0, item.replace("ver.js", "new_ver.js"));
		}
		// append new_ver.js before ver.js
	},
	// ...
})
```

## LICENCE
MIT