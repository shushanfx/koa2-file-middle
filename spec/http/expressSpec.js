var koa = require("koa");
var express = require("express");
var request = require("supertest");

describe("Http test.", function(){
    it("Koa http", function(done){
        var app = new koa();
        app.use(async function(ctx, next){
            ctx.status = 200;
            ctx.body = "Hello";
            await next();
        });
        return request(app.listen())
            .get("/")
            .expect(200)
            .expect("Hello")
            .end(function(){
                done();
            });
    });
    
    it("Express http", function(done){
        var app = new express();
        app.use(function(req, res, next){
            res.status(200).send("Hello");
            next();
        });
        
        return request(app)
            .get("/")
            .expect(200)
            .expect("Hello")
            .end(function(){
                done();
            });
	});
	
	it("Git test", function(done){
		return request("http://github.com")
				.get("/")
				.expect(307)
				.expect("location", "https://github.com/")
				.end(function(err, res){
					if(err){
						throw err;
					}
					console.info(res.status);
					console.dir(res.header);
					done(err, res);
				});
	});
});