var koa = require("koa");
var koa2FileMiddle = require("../../lib/index.js");
var request = require("supertest");


describe("Make a https test.", function(){
	let requestAPI = null;
	
	beforeAll(function(){
		var k = new koa();
		k.use(koa2FileMiddle(["./spec", "./"], {
			cached: true,
			lastModified:true,
			etag: true,
			debug: false
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
		return requestAPI.get("/tsconfig.json")
			.set("Accept", "application/json")
			.set("If-Modified-Since", "Tue, 12 Sep 2017 10:10:21 GMT")
			.expect(304)
			.end((err, response) => {
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