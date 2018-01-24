var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"));
require("../");

tape("render() with-scope with literal value", function(test) {
	var document = jsdom("<div data-with='{{.}}'><span>{{.}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello world");
	test.equal(selection.text(), "Hello world", "With scope on {.} renders itself");
	test.end();
});

tape("render() with-scope with object value", function(test) {
	var document = jsdom("<div data-with='{{obj}}'><span>{{value}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ obj: { notUsed: "here", someValue: "there", value: "everywhere" } });
	test.equal(selection.text(), "everywhere", "With scope renders referred instance");
	test.end();
});

tape("render() with-scope with object value within repeat", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-with='{{obj}}'><span>{{value}}</span></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render([
		{ obj: { notUsed: "here", someValue: "there", value: "hello" } },
		{ noObj: { notUsed: "when", someValue: "why", value: "bye" } },
		{ obj: { notUsed: "seen", someValue: "been", value: "done" } }
	]);
	test.equal(selection.text(), "hellodone", "With scope renders referred instance if instance is present");
	test.end();
});
