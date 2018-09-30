var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render properties: data-property with literal value", function(test) {
	global.document = jsdom("<input type='text' data-prop-value='{{d}}'></input>");
	var selection = d3.select("input");
	selection.template().render("Hello");
	test.equal(selection.property("value"), "Hello", "Property 'value' is rendered on element");
	test.equal(selection.attr("data-prop-value"), null, "Property attribute is no longer present on element");
	test.end();
});

tape("render properties: custom indirect property with literal value", function(test) {
	global.document = jsdom("<input type='text' prop-value='{{d}}'></input>");
	var selection = d3.select("input");
	selection.template({ indirectPropertyPrefix: "prop-" }).render("Hello");
	test.equal(selection.property("value"), "Hello", "Property 'value' is rendered on element");
	test.equal(selection.attr("prop-value"), null, "Property attribute is no longer present on element");
	test.end();
});
