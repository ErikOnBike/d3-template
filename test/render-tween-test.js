var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("d3-transition"), require("d3-interpolate"), require("../"));

var DURATION = 200;

tape("render tween: render tween function without transition", function(test) {
	global.d3 = d3;
	global.textTween = function(d) {
		return function(t) {
			return d.substr(0, Math.floor(t * d.length));
		};
	};
	global.document = jsdom("<div data-style-color='{{tween:d3.interpolateRgb(\"white\", d.color)}}' data-attr-title='{{tween:textTween(d.text)}}'><span>{{tween:textTween(d.text)}}</span></div>");
	var selection = d3.select("div");
	selection.template().render({ color: "blue", text: "Hello world" });
	test.equal(selection.style("color"), "rgb(0, 0, 255)", "Style 'color' is rendered on element");
	test.equal(selection.attr("title"), "Hello world", "Attribute is rendered on element");
	test.equal(selection.text(), "Hello world", "Text is rendered on element");
	test.end();
});

tape("render tween: render tween function with transition", function(test) {
	global.d3 = d3;
	global.textTween = function(d) {
		return function(t) {
			return d.substr(0, Math.floor(t * d.length));
		};
	};
	global.document = jsdom("<div data-style-color='{{tween:d3.interpolateRgb(\"white\", d.color)}}' data-attr-title='{{tween:textTween(d.text)}}' data-prop-value='{{tween:textTween(d.prop)}}' data-t='{{tween:function(t) { return t; }}}'><span>{{tween:textTween(d.text)}}</span></div>");
	var selection = d3.select("div");
	selection
		.template()
		.transition()
			.duration(DURATION)
			.on("start", function() {
				var transition = d3.active(this);
				transition.render({ color: "blue", text: "Hello world", prop: "My value" });
			})
	;

	// Repeatedly check if values are rendered
	var endTime = Date.now() + DURATION;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}

		// Attribute "data-t" contains the current t (time) value
		var t = +selection.attr("data-t");
		var text = "Hello world";
		var prop = "My value";
		test.equal(selection.style("color"), d3.interpolateRgb("white", "blue")(t), "Style 'color' is rendered on element");
		test.equal(selection.attr("title"), text.substr(0, Math.floor(t * text.length)), "Attribute is rendered on element");
		test.equal(selection.text(), text.substr(0, Math.floor(t * text.length)), "Text is rendered on element");
		test.equal(selection.property("value"), prop.substr(0, Math.floor(t * prop.length)), "Property is rendered on element");
	}, DURATION / 8);
});

tape("render tween: render property with literal value using tween function but without transition", function(test) {
	global.document = jsdom("<input type='text' data-prop-value='{{tween:function(t) { return d.substr(0, Math.floor(t * d.length))}}}'></input>");
	var selection = d3.select("input");
	selection.template().render("Hello world");
	test.equal(selection.property("value"), "Hello world", "Property 'value' is rendered on element");
	test.end();
});
