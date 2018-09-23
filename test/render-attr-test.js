var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() attribute on root element", function(test) {
	var document = jsdom("<div data-value='{{d.field}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test123" });
	test.equal(selection.attr("data-value"), "test123", "Attribute value is rendered on root element");
	test.end();
});

tape("render() attribute on child element", function(test) {
	var document = jsdom("<div><span data-value='{{d.field}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test321" });
	test.equal(selection.select("span").attr("data-value"), "test321", "Attribute value is rendered on child element");
	test.end();
});

tape("render() attribute on root and child element", function(test) {
	var document = jsdom("<div data-value-on-root='{{d.field}}'><span data-value='{{d.field}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test333" });
	test.equal(selection.attr("data-value-on-root"), "test333", "Attribute value is rendered on root element");
	test.equal(selection.select("span").attr("data-value"), "test333", "Attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered multiple times on root and child element", function(test) {
	var document = jsdom("<div data-value-first='{{d.field}}' second='{{d.field}}'><span data-value-third='{{d.field}}' fourth='{{d.field}}' fifth='{{d.field}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test many" });
	test.equal(selection.attr("data-value-first"), "test many", "Attribute value is rendered on root element");
	test.equal(selection.attr("second"), "test many", "Attribute value is rendered on root element");
	test.equal(selection.select("span").attr("data-value-third"), "test many", "Attribute value is rendered on child element");
	test.equal(selection.select("span").attr("fourth"), "test many", "Attribute value is rendered on child element");
	test.equal(selection.select("span").attr("fifth"), "test many", "Attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with literal numeric value", function(test) {
	var document = jsdom("<div><span data-value='{{d}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(123);
	test.equal(selection.select("span").attr("data-value"), "123", "Literal numeric attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with literal string value", function(test) {
	var document = jsdom("<div><span data-value='{{d}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello world");
	test.equal(selection.select("span").attr("data-value"), "Hello world", "Literal string attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with literal boolean value", function(test) {
	var document = jsdom("<div><span data-value='{{d}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(true);
	test.equal(selection.select("span").attr("data-value"), "true", "Literal boolean attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with null value", function(test) {
	var document = jsdom("<div><span data-value='{{d}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(null);
	test.equal(selection.select("span").attr("data-value"), null, "<null> attribute value removes rendering");
	test.end();
});

tape("render() attribute rendered with nested object value", function(test) {
	var document = jsdom("<div><span data-value='{{d.person.name.first}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ person: { interests: [ "some", "code", "development" ], name: { last: "Stel", first: "Erik" } } });
	test.equal(selection.select("span").attr("data-value"), "Erik", "First name attribute value is rendered");
	test.end();
});

tape("render() attribute rendered with nested object value with missing fields", function(test) {
	var document = jsdom("<div><span data-value='{{d.person.name.first}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template().render({ person: { interests: [ "some", "code", "development" ] } }); }, /Cannot read property/, "Missing field");
	test.end();
});

tape("render() attribute with namespace", function(test) {
	var document = jsdom("<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xyz=\"http://www.w3.org/1999/xlink\"><use xlink:data-attr-href='{{\"#\" + d.id}}'></use></svg>");
	var node = document.querySelector("svg");
	var selection = d3.select(node);
	selection.template().render({ id: "ref_id" });
	test.equal(d3.namespaces["xlink"], "http://www.w3.org/1999/xlink", "xlink namespace exists");
	test.equal(selection.select("use").attr("xlink:href"), "#ref_id", "href with namespace");
	test.end();
});

tape("render() attribute with functions/filters", function(test) {
	var document = jsdom("<div><span data-value='{{d.toUpperCase()}}' data-value2='{{d.substr(2, 2)}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello");
	test.equal(selection.select("span").attr("data-value"), "HELLO", "Field to uppercase");
	test.equal(selection.select("span").attr("data-value2"), "ll", "Field substr");
	test.end();
});

tape("render() attribute with multiple filters", function(test) {
	var document = jsdom("<div><span data-value='{{\"x\" + d.toUpperCase() + \"y\"}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello");
	test.equal(selection.select("span").attr("data-value"), "xHELLOy", "Field to uppercase, prefixed and postfixed");
	test.end();
});

tape("render() non-group with filter using i, nodes", function(test) {
	var document = jsdom("<div><span data-value='{{(function(d,i, nodes) {return d + \",\" + i + \",\" + nodes.length;})(d,i,nodes)}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("hello");
	test.equal(selection.select("span").attr("data-value"), "hello,0,1", "Filter on non-group gives i and nodes.");
	test.end();
});
