/*
var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("import another DOM element", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='#component'></div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	selection.template();
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select(".component").size(), 1, "import added correct component");
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.equal(selection.select(".component").attr("id"), null, "import removed identity of root of imported DOM tree");
	test.end();
});

tape("import with incorrect reference/selector", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='#unknown'></div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /Specified selector ".*" for "import" does not exist/, "Selector for import does not resolve to a DOM element");
	test.end();
});

tape("import when child already present", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='#component'>  aaa  </div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /No child element or text allowed within elements with an "import"./, "The element already has child elements");
	test.end();
});
*/
