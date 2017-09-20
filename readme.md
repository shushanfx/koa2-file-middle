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