var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render group-with: render with-scope with literal value", function(test) {
	global.document = jsdom("<div data-with='{{d}}'><span>{{d}}</span></div>");
	var selection = d3.select("div");
	selection.template().render("Hello world");
	test.equal(selection.text(), "Hello world", "With scope on 'd' renders itself");
	test.end();
});

tape("render group-with: render with-scope with object value", function(test) {
	global.document = jsdom("<div data-with='{{d.obj}}'><span>{{d.value}}</span></div>");
	var selection = d3.select("div");
	selection.template().render({ obj: { notUsed: "here", someValue: "there", value: "everywhere" } });
	test.equal(selection.text(), "everywhere", "With scope renders referred instance");
	test.end();
});

tape("render group-with: render with-scope with object value within repeat", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div data-with='{{d.obj}}'><span>{{safe:d.value}}</span></div></div>");
	var selection = d3.select("div");
	selection.template().render([
		{ obj: { notUsed: "here", someValue: "there", value: "hello" } },
		{ noObj: { notUsed: "when", someValue: "why", value: "bye" } },
		{ obj: { notUsed: "seen", someValue: "been", value: "done" } }
	]);
	test.equal(selection.text(), "hellodone", "With scope renders referred instance if instance is present");
	test.end();
});
