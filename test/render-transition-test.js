/*
var tape = require("tape");
tape("tween temporary removed", function(test) {
	test.end();
});
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("d3-transition"), require("../"));

tape("render() attribute with transition", function(test) {
	var document = jsdom("<div data-value='{{.}}' data-hardcoded='1'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection
		.template()
		.render(1)
		.transition()
			.duration(1000)
			.attr("data-hardcoded", 100)
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render(100);
			})
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + 1000;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		test.equal(selection.attr("data-value"), selection.attr("data-hardcoded"), "Transitioned attributes are the same");
	}, 100);
});

tape("render() style with transition", function(test) {
	var document = jsdom("<div data-style-height='{{.|unit: \"px\"}}' style='width:1px'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection
		.template()
		.render(1)
		.transition()
			.duration(1000)
			.style("width", "100px")
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render(100);
			})
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + 1000;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		test.equal(selection.style("width"), selection.style("height"), "Transitioned styles are the same");
	}, 100);
});

tape("render() text with transition", function(test) {
	var document = jsdom("<div>{{.}}</div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection
		.template()
		.render("")
		.transition()
			.delay(100)
			.duration(100)
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render("hello");
			})
	;

	// Check value before transition and shortly after start
	test.equal(selection.text(), "", "Transitioned text initialized");
	setTimeout(function() {
		test.equal(selection.text(), "hello", "Transitioned text after start");
	}, 120);
	test.end();
});

tape("render() attribute within repeating group with transition", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-value='{{.}}' data-hardcoded='100'></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var count = 0;
	selection
		.template()
		.render([ 100, 100, 100 ])
		.transition()
			.duration(1000)
			.on("start", function() {

				// Render object 'on' current transition
				// BEWARE: a single element is 'off' by 1 and will not be equal to the hardcoded value!
				var transition = d3.active(this);
				transition.render([ 0, 1, 0 ]);
				count++;
			})
			.selectAll("div")
				.attr("data-hardcoded", 0)
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + 1000;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.equal(count, 1, "Single transition start received");
			test.end();
			return;
		}
		selection.selectAll("div").each(function(d, i) {

			// Validate rendered attribute against hardcoded attribute (except for 2nd element which is 'off' and should not be equal)
			var element = d3.select(this);
			if(i !== 1) {
				test.equal(element.attr("data-value"), element.attr("data-hardcoded"), "Transitioned attributes are the same");
			} else {
				test.notEqual(element.attr("data-value"), element.attr("data-hardcoded"), "Transitioned attributes are the same");
			}
		});
	}, 100);
});
*/
