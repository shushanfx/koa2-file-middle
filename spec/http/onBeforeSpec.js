var koa = require("koa");
var koa2FileMiddle = require("../../lib/index.js");
var request = require("supertest");
var fs = require("fs");


describe("Make a https test.", function(){
	let requestAPI = null;
	
	beforeAll(function(){
		var k = new koa();
		k.use(koa2FileMiddle(["./spec", "./"], {
			cache: false,
			lastModified:true,
			etag: true,
			debug: true,
			maxAge: 600000,
			index: ["index.html", "index.js"],
			extension: [".gz", ".zt"],
			onBefore: function(list, ctx){
				//list.splice(0, 0, "/../package.json");
			}
		}));
		requestAPI = request(k.listen());
	});

	it("Test a file.", function(done){
		return requestAPI.get("/tsconfig.json")
			.set("Accept", "application/json")
			.expect(200)
			.end((err, response) => {
				console.dir(response.header);
				console.dir(response.body);
				done();
			});
	});
	it("Test index", function(done){
		return requestAPI.get("/")
			.set("Accept", "text/html")
			.expect(200)
			.end((err, response)=>{
				console.dir(response.header);
				console.dir(response.text);
				done();
			});
	});

	it("Test readme", function(done){
		return requestAPI.get("/readme.md")
			.set("Accept", "text/markdown")
			.expect(200)
			.end((err, response)=>{
				console.dir(response.header);
				console.dir(response.text);
				done();
			});
	});

	it("Test index.gz", function(done){
		return requestAPI.get("/test.html")
			.set("Accept", "text/html")		
			.expect(200)
			.end((err, response)=>{
				console.dir(response.header);
				console.dir(response.text);
				done();
			});
	});
});