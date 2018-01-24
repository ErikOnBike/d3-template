var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() is available on selections and as regular function", function(test) {
	var document = jsdom("<body>{{.}}</body>");
	var node = document.querySelector("body");
	var selection = d3.select(node);
	selection.template();
	test.equal(typeof selection.render, "function", "selection.render is function");
	test.equal(typeof d3.render, "function", "render is function");
	selection.render("Hello");
	test.equal(selection.text(), "Hello", "selection.render() renders");
	selection.call(d3.render, "World");
	test.equal(selection.text(), "World", "selection.call(render, ...) renders");
	d3.render(selection, "Bye");
	test.equal(selection.text(), "Bye", "render() renders");
	test.end();
});

tape("render() fails on non template selection", function(test) {
	var document = jsdom("<body><div><span>hello</span></div></body>");
	var node = document.querySelector("body");
	var selection = d3.select(node);
	test.throws(function() { selection.render("Hello"); }, /Method render\(\) called on non-template selection\./, "Non-template rendering fails");
	test.end();
});

tape("render() adds data to elements", function(test) {
	var document = jsdom("<form class='person'><div class='name'><input name='first-name' data-attr-value='{{name.first}}' type='text'><input name='last-name' data-attr-value='{{name.last'}}' type='text'></div><input name='birthdate' data-attr-value='{{birthdate}}' type='date'></form>");
	var node = document.querySelector("form");
	var selection = d3.select(node);
	selection.template();
	var data = { name: { first: 'Arthur', last: 'Dent' }, birthdate: "Unknown" };
	selection.render(data);
	test.equal(selection.datum(), data, "Data rendered on root element");
	selection.selectAll("*").each(function() {
		var element = d3.select(this);
		test.equal(element.datum(), data, "Data rendered on child element");
	});
	test.end();
});

tape("render() with combined objects", function(test) {
	var document = jsdom("<div data-value1='{{value1}}' data-value2='{{value2}}' data-value3='{{value3}}' data-value4='{{value4}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template();
	selection.render(Object.assign({}, { value1: 'first', value2: 'second' }, { value3: 'third' }, { value4: 'fourth' }));
	test.equal(selection.attr("data-value1"), "first", "First value from first object");
	test.equal(selection.attr("data-value2"), "second", "Second value from first object");
	test.equal(selection.attr("data-value3"), "third", "Third value from second object");
	test.equal(selection.attr("data-value4"), "fourth", "Fourth value from third object");
	test.end();
});
