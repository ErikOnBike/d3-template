var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render styles: data-style with literal value", function(test) {
	global.document = jsdom("<div data-style-width='{{d}}'></div>");
	var selection = d3.select("div");
	selection.template().render("600px");
	test.equal(selection.style("width"), "600px", "Style 'width' is rendered on element");
	test.equal(selection.attr("data-style-width"), null, "Data attribute is no longer present");
	test.end();
});

tape("render styles: data-style with object value", function(test) {
	global.document = jsdom("<div><span data-style-font-weight='{{d.font.weight}}'>Hello world</span></div>");
	var selection = d3.select("div");
	selection.template().render({ font: { name: 'Times', size: 10, weight: 600 } });
	test.equal(selection.select("span").style("font-weight"), "600", "Style font-weight is rendered on element");
	test.equal(selection.select("span").attr("data-style-font-weight"), null, "Data-style is no longer present on element");
	test.end();
});

tape("render styles: custom indirect style with literal value", function(test) {
	global.document = jsdom("<div style-width='{{d}}'></div>");
	var selection = d3.select("div");
	selection.template({ indirectStylePrefix: "style-" }).render("600px");
	test.equal(selection.style("width"), "600px", "Style 'width' is rendered on element");
	test.equal(selection.attr("style-width"), null, "Style attribute is no longer present");
	test.end();
});
