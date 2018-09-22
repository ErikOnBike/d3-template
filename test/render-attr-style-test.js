var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() style through data-attribute with literal value", function(test) {
	var document = jsdom("<div data-style-width='{{.}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render("600px");
	test.equal(selection.style("width"), "600px", "Style 'width' is rendered on element");
	test.equal(selection.attr("data-style-width"), null, "Data attribute is no longer present");
	test.end();
});

tape("render() style through data-attribute with object value", function(test) {
	var document = jsdom("<div><span data-style-font-weight='{{font.weight}}'>Hello world</span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ font: { name: 'Times', size: 10, weight: 600 } });
	test.equal(selection.select("span").style("font-weight"), "600", "Style font-weight is rendered on element");
	test.end();
});

tape("render() style through custom attribute with literal value", function(test) {
	var document = jsdom("<div style-width='{{.}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template({ indirectStylePrefix: "style-" }).render("600px");
	test.equal(selection.style("width"), "600px", "Style 'width' is rendered on element");
	test.equal(selection.attr("data-style-width"), null, "Data attribute is no longer present");
	test.end();
});
