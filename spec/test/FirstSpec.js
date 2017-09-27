describe("My First Spec", function(){
	// 测试用例
	it("Array.prototype.indexOf", function(){
		let arr = [1, 3, 5];
		expect(arr.indexOf(3)).toBe(1);
		expect(arr.indexOf(7)).toBe(-1);
	});

	it("Async test case.", function(done){
		var asyncFunction = () => {
			setTimeout(() =>{
				console.info("end.");
				done();
			}, 1000);
			console.info("start.");
		};

		asyncFunction();
	});
});