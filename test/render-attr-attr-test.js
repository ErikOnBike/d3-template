var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render() attribute through data-attribute with literal value", function(test) {
	var document = jsdom("<div data-attr-id='{{.}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render(123);
	test.equal(selection.attr("id"), "123", "Attribute 'id' is rendered on element");
	test.equal(selection.attr("data-attr-id"), null, "Data attribute is no longer present");
	test.end();
});

tape("render() attribute through data-attribute with object value", function(test) {
	var document = jsdom("<div><span data-attr-cx='{{cx}}' data-attr-cy='{{cy}}' r='10'></span></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	selection.template().render({ cx: 100, cy: 50 });
	test.equal(selection.select("span").attr("cx"), "100", "Attribute cx is rendered on element");
	test.equal(selection.select("span").attr("cy"), "50", "Attribute cy is rendered on element");
	test.equal(selection.select("span").attr("r"), "10", "Attribute r is unaffected on element");
	test.end();
});

tape("render() attribute through data-attribute replacing class", function(test) {
	var document = jsdom("<div class='original' data-attr-class='{{.}}'>Hello world</div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	test.equal(selection.attr("class"), "original", "Original class present");
	selection.template().render("replaced");
	test.equal(selection.attr("class"), "replaced", "Original class is replaced");
	test.end();
});

tape("render() camelcase SVG attributes", function(test) {
	var document = jsdom("<svg data-attr-viewbox='{{.}}'></div>");
	var node = document.querySelector("svg");
	var selection = d3.select(node);
	selection.template().render("0,0,100,100");
	test.equal(selection.attr("viewBox"), "0,0,100,100", "Camel case attribute value is rendered on root element");
	test.end();
});
