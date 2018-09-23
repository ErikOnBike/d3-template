var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() property through data-property with literal value", function(test) {
	var document = jsdom("<input type='text' data-prop-value='{{d}}'></input>");
	var node = document.querySelector("input");
	var selection = d3.select(node);
	selection.template().render("Hello");
	test.equal(selection.property("value"), "Hello", "Property 'value' is rendered on element");
	test.end();
});

tape("render() property through custom attribute with literal value", function(test) {
	var document = jsdom("<input type='text' prop-value='{{d}}'></input>");
	var node = document.querySelector("input");
	var selection = d3.select(node);
	selection.template({ indirectPropertyPrefix: "prop-" }).render("Hello");
	test.equal(selection.property("value"), "Hello", "Property 'value' is rendered on element");
	test.end();
});
