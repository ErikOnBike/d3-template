var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render class names: data-class with literal value", function(test) {
	global.document = jsdom("<div class='fixed' data-class-checked='{{d}}'></div>");
	var selection = d3.select("div").template();
	selection.render(true);
	test.equal(selection.classed("checked"), true, "Class checked is rendered on element through true");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	selection.render(false);
	test.equal(selection.classed("checked"), false, "Class checked is no longer present through false");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	selection.render(1);
	test.equal(selection.classed("checked"), true, "Class checked is rendered on element through 1");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	selection.render(0);
	test.equal(selection.classed("checked"), false, "Class checked is no longer present through 0");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	selection.render("hello");
	test.equal(selection.classed("checked"), true, "Class checked is rendered on element through \"hello\"");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	selection.render("");
	test.equal(selection.classed("checked"), false, "Class checked is no longer present through \"\"");
	test.equal(selection.classed("fixed"), true, "Class fixed is still present");
	test.end();
});

tape("render class names: data-class with object value", function(test) {
	global.document = jsdom("<div><span data-class-red='{{d.red}}' data-class-green='{{d.green}}' data-class-blue='{{d.blue}}'></span></div>");
	var selection = d3.select("div").template();
	selection.render({ red: true, green: "", blue: [] });
	test.equal(selection.select("span").classed("red"), true, "Class ref is rendered on element");
	test.equal(selection.select("span").classed("green"), false, "Class green is not rendered on element");
	test.equal(selection.select("span").classed("blue"), true, "Class blue is rendered on element");
	test.end();
});

tape("render class names: data-class with object value and logic", function(test) {
	global.document = jsdom("<div><span class='fixed' data-class-red='{{d.red >= 50}}' data-class-green='{{d.green >= 50}}' data-class-blue='{{d.blue >= 50}}'></span></div>");
	var selection = d3.select("div").template();
	selection.render({ red: 0, green: 100, blue: 100 });
	test.equal(selection.select("span").classed("red"), false, "Class ref is not rendered on element - 1");
	test.equal(selection.select("span").classed("green"), true, "Class green is rendered on element - 1");
	test.equal(selection.select("span").classed("blue"), true, "Class blue is rendered on element - 1");
	test.equal(selection.select("span").classed("fixed"), true, "Class fixed is still present");
	selection.render({ red: 50, green: 50, blue: 50 });
	test.equal(selection.select("span").classed("red"), true, "Class ref is rendered on element - 2");
	test.equal(selection.select("span").classed("green"), true, "Class green is rendered on element - 2");
	test.equal(selection.select("span").classed("blue"), true, "Class blue is rendered on element - 2");
	test.equal(selection.select("span").classed("fixed"), true, "Class fixed is still present");
	selection.render({ red: 0, green: 0, blue: 0 });
	test.equal(selection.select("span").classed("red"), false, "Class ref is not rendered on element - 2");
	test.equal(selection.select("span").classed("green"), false, "Class green is not rendered on element - 2");
	test.equal(selection.select("span").classed("blue"), false, "Class blue is not rendered on element - 2");
	test.equal(selection.select("span").classed("fixed"), true, "Class fixed is still present");
	test.end();
});
