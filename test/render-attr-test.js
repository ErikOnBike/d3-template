var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() attribute on root element", function(test) {
	var document = jsdom("<div data-value='{{field}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test123" });
	test.equal(selection.attr("data-value"), "test123", "Attribute value is rendered on root element");
	test.end();
});

tape("render() attribute on child element", function(test) {
	var document = jsdom("<div><span data-value='{{field}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test321" });
	test.equal(selection.select("span").attr("data-value"), "test321", "Attribute value is rendered on child element");
	test.end();
});

tape("render() attribute on root and child element", function(test) {
	var document = jsdom("<div data-value-on-root='{{field}}'><span data-value='{{field}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ field: "test333" });
	test.equal(selection.attr("data-value-on-root"), "test333", "Attribute value is rendered on root element");
	test.equal(selection.select("span").attr("data-value"), "test333", "Attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered multiple times on root and child element", function(test) {
	var document = jsdom("<div data-value-first='{{field}}' second='{{field}}'><span data-value-third='{{field}}' fourth='{{field}}' fifth='{{field}}'>Some text here</span></div>");
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
	var document = jsdom("<div><span data-value='{{.}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(123);
	test.equal(selection.select("span").attr("data-value"), "123", "Literal numeric attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with literal string value", function(test) {
	var document = jsdom("<div><span data-value='{{.}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello world");
	test.equal(selection.select("span").attr("data-value"), "Hello world", "Literal string attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with literal boolean value", function(test) {
	var document = jsdom("<div><span data-value='{{.}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(true);
	test.equal(selection.select("span").attr("data-value"), "true", "Literal boolean attribute value is rendered on child element");
	test.end();
});

tape("render() attribute rendered with null value", function(test) {
	var document = jsdom("<div><span data-value='{{.}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(null);
	test.equal(selection.select("span").attr("data-value"), null, "<null> attribute value removes rendering");
	test.end();
});

tape("render() attribute rendered with nested object value", function(test) {
	var document = jsdom("<div><span data-value='{{person.name.first}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ person: { interests: [ "some", "code", "development" ], name: { last: "Stel", first: "Erik" } } });
	test.equal(selection.select("span").attr("data-value"), "Erik", "First name attribute value is rendered");
	test.end();
});

tape("render() attribute rendered with nested object value with quoted fields", function(test) {
	var document = jsdom("<div><span data-value='{{\"person\".name.\"first\"}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ person: { interests: [ "some", "code", "development" ], name: { last: "Stel", first: "Erik" } } });
	test.equal(selection.select("span").attr("data-value"), "Erik", "First name attribute value is rendered");
	test.end();
});

tape("render() attribute rendered with nested object value with missing fields", function(test) {
	var document = jsdom("<div><span data-value='{{person.name.first}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ person: { interests: [ "some", "code", "development" ] } });
	test.equal(selection.select("span").attr("data-value"), null, "Non-existing field removes rendering");
	test.end();
});

tape("render() attribute rendered with nested object value with error in fields", function(test) {
	var document = jsdom("<div><span data-value='{{\"person.name.first}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template(); }, /INVALID_STRING/, "Illegal field (missing quotes)");
	test.end();
});

tape("render() attribute with namespace", function(test) {
	var document = jsdom("<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xyz=\"http://www.w3.org/1999/xlink\"><use xlink:data-attr-href='{{id|prefix: \"#\"}}'></use></svg>");
	var node = document.querySelector("svg");
	var selection = d3.select(node);
	selection.template().render({ id: "ref_id" });
	test.equal(d3.namespaces["xlink"], "http://www.w3.org/1999/xlink", "xlink namespace exists");
	test.equal(selection.select("use").attr("xlink:href"), "#ref_id", "href with namespace");
	test.end();
});

tape("render() attribute with filter", function(test) {
	var document = jsdom("<div><span data-value='{{.|upper}}' data-value2='{{.|substr: 2, 2}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello");
	test.equal(selection.select("span").attr("data-value"), "HELLO", "Field to uppercase");
	test.equal(selection.select("span").attr("data-value2"), "ll", "Field substr");
	test.end();
});

tape("render() attribute with multiple filters", function(test) {
	var document = jsdom("<div><span data-value='{{.|upper|prefix: \"x\"|postfix: \"y\"}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("Hello");
	test.equal(selection.select("span").attr("data-value"), "xHELLOy", "Field to uppercase, prefixed and postfixed");
	test.end();
});

tape("render() attribute with illegal filter", function(test) {
	var document = jsdom("<div><span data-value='{{.|postfix: X}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template(); }, /MISSING_VALUE/, "Illegal argument (missing quotes)");
	test.end();
});

tape("render() attribute with illegal filter", function(test) {
	var document = jsdom("<div><span data-value='{{|. postfix: X}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template(); }, /MISSING_VALID_FIELD_SELECTOR/, "Illegal argument (missing quotes)");
	test.end();
});

tape("render() attribute with illegal filter", function(test) {
	var document = jsdom("<div><span data-value='{{.|upper lower}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.throws(function() { selection.template(); }, /EXTRA_CHARACTERS/, "Illegal argument (exta characters)");
	test.end();
});

tape("render() attribute with unknown filter", function(test) {
	var document = jsdom("<div><span data-value='{{.|supersonic}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("hello");
	test.equal(selection.select("span").attr("data-value"), "hello", "Unknown filter has no effect.");
	test.end();
});

tape("render() non-group with filter using i, nodes", function(test) {
	var document = jsdom("<div><span data-value='{{.|extraParams}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	d3.renderFilter("extraParams", function(d, i, nodes) {
		return d + "," + i + "," + nodes.length;
	});
	selection.template().render("hello");
	test.equal(selection.select("span").attr("data-value"), "hello,0,1", "Filter on non-group gives i and nodes.");
	test.end();
});

tape("render() non-group with filter using i, nodes", function(test) {
	var document = jsdom("<div><span data-value='{{.|extraParams: { \"a\": 1, \"b\": 2, \"c\": [ 1, 2 ] }}}'>Some text here</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	d3.renderFilter("extraParams", function(d, obj, i, nodes) {
		return d + JSON.stringify(obj);
	});
	selection.template().render("hello");
	test.equal(selection.select("span").attr("data-value"), "hello{\"a\":1,\"b\":2,\"c\":[1,2]}", "Filter with object.");
	test.end();
});
