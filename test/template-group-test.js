var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("template group: try to create template group with only text", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'>{{d}}</div>");
	var selection = d3.select("div");
	test.throws(function() { selection.template() }, /A child element should be present within repeat, if or with grouping\. Wrap text in a DOM element\./, "No child present");
	test.end();
});

tape("template group: try to create template group with multiple children", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><span>{{d}}</span><span>{{d.toUpperCase()}}</span></div>");
	var selection = d3.select("div");
	test.throws(function() { selection.template() }, /Only a single child element allowed within repeat, if or with grouping\. Wrap child elements in a container element\./, "No child present");
	test.end();
});

tape("template group: try to create template group with multiple grouping parameters on same element", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}' data-if='{{d}}'><span>{{d}}</span></div>");
	var selection = d3.select("div");
	test.throws(function() { selection.template() }, /A repeat, if or with grouping can't be combined on same element\. Wrap one in the other\./, "No child present");
	test.end();
});
