var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render attributes: data-attribute with literal value", function(test) {
	global.document = jsdom("<div data-attr-id='{{d}}'></div>");
	var selection = d3.select("div");
	selection.template().render(123);
	test.equal(selection.attr("id"), "123", "Attribute 'id' is rendered on element");
	test.equal(selection.attr("data-attr-id"), null, "Data attribute is no longer present");
	test.end();
});

tape("render attributes: data-attribute with object value", function(test) {
	global.document = jsdom("<div><span data-attr-cx='{{d.cx}}' data-attr-cy='{{d.cy}}' r='10'></span></div>");
	var selection = d3.select("div");
	selection.template().render({ cx: 100, cy: 50 });
	test.equal(selection.select("span").attr("cx"), "100", "Attribute cx is rendered on element");
	test.equal(selection.select("span").attr("cy"), "50", "Attribute cy is rendered on element");
	test.equal(selection.select("span").attr("data-cx"), null, "Attribute data-cx is no longer present on element");
	test.equal(selection.select("span").attr("data-cy"), null, "Attribute data-cy is no longer present on element");
	test.equal(selection.select("span").attr("r"), "10", "Attribute r is unaffected on element");
	test.end();
});

tape("render attributes: data-attribute replacing class", function(test) {
	global.document = jsdom("<div class='original' data-attr-class='{{d}}'>Hello world</div>");
	var selection = d3.select("div");
	test.equal(selection.attr("class"), "original", "Original class present");
	selection.template().render("replaced");
	test.equal(selection.attr("class"), "replaced", "Original class is replaced");
	test.end();
});

tape("render attributes: camelcase SVG attributes", function(test) {
	global.document = jsdom("<svg data-attr-viewbox='{{d}}'></div>");
	var selection = d3.select("svg");
	selection.template().render("0,0,100,100");
	test.equal(selection.attr("viewBox"), "0,0,100,100", "Camel case attribute value is rendered on root element");
	test.end();
});

tape("render attributes: custom indirect attribute with literal value", function(test) {
	global.document = jsdom("<div attr-id='{{d}}'></div>");
	var selection = d3.select("div");
	selection.template({ indirectAttributePrefix: "attr-" }).render(123);
	test.equal(selection.attr("id"), "123", "Attribute 'id' is rendered on element");
	test.equal(selection.attr("attr-id"), null, "Data attribute is no longer present");
	test.end();
});
