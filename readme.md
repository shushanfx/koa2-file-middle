# Koa2 File Middle
A middleware for static file. Filter multi path for static router. 

## How to use
* Install it:   
	```bash
	npm install koa2-file-middle;
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
Just run this command after installed the dependencies:
```bash
jasmine
```

## Options
The supported options as follow:
```javascript
app.use(koaFileMiddle(["./static"], {
	prefix: "", // prefix: string, prefix for uri, when matching, delevery prefix from uri.
	cache: true | false, // cache: boolean, cache the directory in memory, which will make the matching operation more faster. it is useful for production.
	lastModified: true | false, // whether to check the last modified.
	etag: true | false, // whether to check the etag header.
	maxage: Number, // or maxAge, max age for static file.
	immutable: true | false, // Whether the client cache can be immutable.
	hidden: true, // whether hidden files expose to outside world. True for show hidden files or directories, false for hide those.
	index: String, // index options while request for a directory, when set with `index.html` for example, and the path is end with slash(/), it will search with the real path `/index.html`. 
	extensions: Array<String>, // Extensions to append to the queue , for example, configing with extensions [".xs", ".js", ".ps"], while path is `/examples`, middle ware will search in senquence of ['/examples', '/examples.xs', '/examples.js', '/examples.ps'], if preview's one matched, end searching and return straightly.
}));
```

## LICENCE
MIT