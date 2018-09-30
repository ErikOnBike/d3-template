var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render group-if: render if with literal values", function(test) {
	global.document = jsdom("<div data-if='{{d}}'><span>hello world</span></div>");
	var selection = d3.select("div");
	selection.template().render(true);
	test.equal(selection.text(), "hello world", "Conditional (true) is rendered");
	selection.render(false);
	test.equal(selection.text(), "", "Conditional (false) is not rendered");
	test.equal(selection.selectAll("*").size(), 0, "Conditional (false) has no children");
	selection.render(true);
	test.equal(selection.text(), "hello world", "Conditional (true) is rendered");
	test.equal(selection.selectAll("*").size(), 1, "Conditional (true) has single child");
	test.end();
});

tape("render group-if: render if with object values (truthy/falsy values)", function(test) {
	global.document = jsdom("<div data-if='{{d.show}}'><span>{{d.message}}</span></div>");
	var selection = d3.select("div");
	var data = { show: true, message: "Hello" };
	selection.template().render(data);
	test.equal(selection.text(), data.message, "Conditional (true) is rendered");
	data = { show: "hello", message: "World" };
	selection.render(data);
	test.equal(selection.text(), data.message, "Conditional (\"hello\") is rendered");
	data = { show: 1, message: "Bye" };
	selection.render(data);
	test.equal(selection.text(), data.message, "Conditional (1) is rendered");
	data = { show: false, message: "Bye" };
	selection.render(data);
	test.equal(selection.text(), "", "Conditional (false) is not rendered");
	data = { show: "", message: "Bye" };
	selection.render(data);
	test.equal(selection.text(), "", "Conditional (\"\") is not rendered");
	data = { show: 0, message: "Bye" };
	selection.render(data);
	test.equal(selection.text(), "", "Conditional (0) is not rendered");
	test.end();
});

tape("render group-if: render if with object values within repeat", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div data-if='{{d.show}}'><span>{{d.message}}</span></div></div>");
	var selection = d3.select("div");
	var data = [
		{ show: true, message: "hello" },
		{ show: false, message: "bye" },
		{ show: 1, message: "world" }
	];
	selection.template().render(data);
	test.equal(selection.selectAll("span").size(), 2, "Two elements have truthy condition");
	test.equal(selection.text(), "helloworld", "Correct two elements are rendered");
	test.end();
});

tape("render group-if: test fix for missing 'this' within if data function", function(test) {
	global.d3 = d3;
	global.document = jsdom("<div data-repeat='{{d}}'><div data-if='{{d3.select(\"div\").selectAll(\"div\").nodes().indexOf(this) === i ? d.show : \"error\"}}'><span>{{d.message}}</span></div></div>");
	var selection = d3.select("div");
	var data = [
		{ show: true, message: "hello" },
		{ show: false, message: "bye" },
		{ show: 1, message: "world" }
	];
	selection.template().render(data);
	test.equal(selection.selectAll("span").size(), 2, "Two elements have truthy condition");
	test.equal(selection.text(), "helloworld", "Correct two elements are rendered");
	test.end();
});
