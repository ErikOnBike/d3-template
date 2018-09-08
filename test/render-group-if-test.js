var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() if with literal values", function(test) {
	var document = jsdom("<div data-if='{{.}}'><span>hello world</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
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

tape("render() if with object values", function(test) {
	var document = jsdom("<div data-if='{{show}}'><span>{{message}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
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
	test.end();
});

tape("render() if with object values within repeat", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-if='{{show}}'><span>{{message}}</span></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [ { show: true, message: "hello" }, { show: false, message: "bye" }, { show: 1, message: "world" } ];
	selection.template().render(data);
	test.equal(selection.selectAll("span").size(), 2, "Two elements have truthy condition");
	test.equal(selection.text(), "helloworld", "Correct two elements are rendered");
	test.end();
});

tape("render() if test fix for missing 'this'", function(test) {
	d3.renderFilter("testFix", function(d, i) { return d3.select(node).selectAll("div").nodes().indexOf(this) === i ? d : "error"; });
	var document = jsdom("<div data-repeat='{{.}}'><div data-if='{{show|testFix}}'><span>{{message}}</span></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [ { show: true, message: "hello" }, { show: false, message: "bye" }, { show: 1, message: "world" } ];
	selection.template().render(data);
	test.equal(selection.selectAll("span").size(), 2, "Two elements have truthy condition");
	test.equal(selection.text(), "helloworld", "Correct two elements are rendered");
	test.end();
});
