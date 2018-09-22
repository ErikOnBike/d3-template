var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() group with only text", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'>{{.}}</div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /A child element should be present within repeat, if or with grouping\. Wrap text in a DOM element\./, "No child present");
	test.end();
});

tape("render() group with multiple children", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><span>{{.}}</span><span>{{.|upper}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /Only a single child element allowed within repeat, if or with grouping\. Wrap child elements in a container element\./, "No child present");
	test.end();
});

tape("render() group with multiple grouping parameters on same element", function(test) {
	var document = jsdom("<div data-repeat='{{.}}' data-if='{{.}}'><span>{{.}}</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /A repeat, if or with grouping can't be combined on same element\. Wrap one in the other\./, "No child present");
	test.end();
});
