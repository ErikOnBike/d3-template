var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("d3-transition"), require("../"));

var DURATION = 200;

tape("render transition: render attribute with transition", function(test) {
	global.document = jsdom("<div data-value='{{d}}' data-hardcoded='1'></div>");
	var selection = d3.select("div");
	selection
		.template()
		.render(1)
		.transition()
			.duration(DURATION)
			.attr("data-hardcoded", 100)
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render(100);
			})
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + DURATION;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		test.equal(selection.attr("data-value"), selection.attr("data-hardcoded"), "Transitioned attributes are the same");
	}, DURATION / 8);
});

tape("render transition: render style with transition", function(test) {
	global.document = jsdom("<div data-style-height='{{d + \"px\"}}' style='width:1px'></div>");
	var selection = d3.select("div");
	selection
		.template()
		.render(1)
		.transition()
			.duration(DURATION)
			.style("width", "100px")
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render(100);
			})
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + DURATION;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		test.equal(selection.style("width"), selection.style("height"), "Transitioned styles are the same");
	}, DURATION / 8);
});

tape("render transition: render text with transition", function(test) {
	global.document = jsdom("<div>{{d}}</div>");
	var selection = d3.select("div");
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

tape("render transition: render attribute within repeating group with transition", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div data-value='{{d}}' data-hardcoded='100'></div></div>");
	var selection = d3.select("div");
	var count = 0;
	selection
		.template()
		.render([ 100, 100, 100 ])
		.transition()
			.duration(DURATION)
			.on("start", function() {

				// Render object 'on' current transition (countdown to 0 or 1)
				// BEWARE: a single element is 'off' by 1 and will not be equal to the hardcoded value!
				var transition = d3.active(this);
				transition.render([ 0, 1, 0 ]);
				count++;
			})
			.selectAll("div")
				.attr("data-hardcoded", 0)
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + DURATION;
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
	}, DURATION / 8);
});

tape("render transition: render style with transition on imported template", function(test) {
	global.document = jsdom("<div id='component' data-style-height='{{d + \"px\"}}' style='width:1px'></div><div id='template' data-import='{{\"#component\"}}'></div>");
	d3.select("#component").template();
	var selection = d3.select("#template");
	selection
		.template()
		.render(1)
		.transition()
			.duration(DURATION)
			.on("start", function() {

				// Render object 'on' current transition
				var transition = d3.active(this);
				transition.render(100);
			})
			.select("div").style("width", "100px")
	;

	// Repeatedly check if rendered and hardcoded value are the same
	var endTime = Date.now() + DURATION;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		test.equal(selection.select("div").style("width"), selection.select("div").style("height"), "Transitioned styles are the same");
	}, DURATION / 8);
});
