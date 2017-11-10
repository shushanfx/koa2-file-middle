var koa = require("koa");
var koa2FileMiddle = require("../../lib/index.js");
var request = require("supertest");
var fs = require("fs");


describe("Make a https test.", function(){
	let requestAPI = null;
	
	beforeAll(function(){
		var k = new koa();
		k.use(koa2FileMiddle(["./spec", "./"], {
			cache: true,
			lastModified:true,
			etag: true,
			debug: false,
			maxAge: 300
		}));
		requestAPI = request(k.listen());
	});


	it("Test a file.", function(done){
		return requestAPI.get("/tsconfig.json")
			.set("Accept", "application/json")
			.expect(200)
			.end((err, response) => {
				console.dir(response.header);
				// console.info(response.body, typeof response.body);
				done();
			});
	});

	it("Test last modified", function(done){
		let stat = fs.statSync("./tsconfig.json");
		let dt = stat.mtime.toGMTString();

		return requestAPI.get("/tsconfig.json")
			.set("Accept", "application/json")
			.set("If-Modified-Since", dt)
			.expect(304)
			.end((err, response) => {
				if(err){
					throw err;
				}
				console.dir(response.header);
				console.info(response.status);
				done();
			});
	});

	it("Test etag", function(done){
		return requestAPI.get("/tsconfig.json")
			.set("Accept", "application/json")
			.set("If-None-Match", 'W/"23b-15e759179e8"')
			.expect(304)
			.end((err, response) => {
				console.dir(response.header);
				console.info(response.status);
				done();
			});
	});
});