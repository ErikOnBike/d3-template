var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("d3-transition"), require("d3-interpolate"), require("../"));

tape("render() tween function without transition", function(test) {
	var document = jsdom("<div data-style-color='{{color|colorTween}}' data-attr-title='{{text|textTween}}'><span>{{text|textTween}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	d3.renderFilter("colorTween", function(d) {
		return d3.interpolateRgb("white", d);
	}, true);
	d3.renderFilter("textTween", function(d) {
		return function(t) {
			return d.substr(0, Math.floor(t * d.length));
		};
	}, true);
	selection.template().render({ color: "blue", text: "Hello world" });
	test.equal(selection.style("color"), "rgb(0, 0, 255)", "Style 'color' is rendered on element");
	test.equal(selection.attr("title"), "Hello world", "Attribute is rendered on element");
	test.equal(selection.text(), "Hello world", "Text is rendered on element");
	test.end();
});

tape("render() tween function with transition", function(test) {
	var document = jsdom("<div data-style-color='{{color|colorTween}}' data-attr-title='{{text|textTween}}' data-t='{{.|valueT}}'><span>{{text|textTween}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	d3.renderFilter("colorTween", function(d) {
		return d3.interpolateRgb("white", d);
	}, true);
	d3.renderFilter("textTween", function(d) {
		return function(t) {
			return d.substr(0, Math.floor(t * d.length));
		};
	}, true);
	d3.renderFilter("valueT", function() {
		return function(t) {
			return t;
		};
	}, true);
	selection
		.template()
		.transition()
			.duration(1000)
			.on("start", function() {
				var transition = d3.active(this);
				transition.render({ color: "blue", text: "Hello world" });
			})
	;

	// Repeatedly check if values are rendered
	var endTime = Date.now() + 1000;
	var timer = setInterval(function() {
		if(Date.now() > endTime) {
			clearInterval(timer);
			test.end();
			return;
		}
		var t = +selection.attr("data-t");
		var text = "Hello world";
		test.equal(selection.style("color"), d3.interpolateRgb("white", "blue")(t), "Style 'color' is rendered on element");
		test.equal(selection.attr("title"), text.substr(0, Math.floor(t * text.length)), "Attribute is rendered on element");
		test.equal(selection.text(), text.substr(0, Math.floor(t * text.length)), "Text is rendered on element");
	}, 100);
});
