var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("import another template", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{.|format: \"#component\"}}'></div></div></body>");
	var importNode = document.querySelector("#component");
	d3.select(importNode).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	selection.template().render(null);
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select(".component").size(), 1, "import added correct component");
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});

tape("import another template within repeat", function(test) {
	test.end();
});

tape("import and with combined", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{hello}}</span></div><div id='template'><div data-import='{{.|format: \"#component\"}}' data-with='{{deeper}}'></div></div></body>");
	var importNode = document.querySelector("#component");
	d3.select(importNode).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	selection.template().render({ hello: "first", deeper: { hello: "second" } });
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select("span").text(), "second", "import includes correct child");
	test.end();
});

tape("import when child already present", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{.|format: \"#component\"}}'>  aaa  </div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /No text allowed within an import grouping./, "The element already has child elements");
	test.end();
});

tape("import combined with repeat", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-repeat='{{.}}' data-import='{{.|format: \"#component\"}}'>  aaa  </div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /A repeat or if grouping can't be combined with import on the same element./, "The element combines repeat and import");
	test.end();
});

tape("import combined with if", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-if='{{.}}' data-import='{{.|format: \"#component\"}}'>  aaa  </div></div></body>");
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	test.throws(function() { selection.template() }, /A repeat or if grouping can't be combined with import on the same element./, "The element combines if and import");
	test.end();
});
