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
	test.equal(selection.select("div div").attr("id"), null, "id removed from imported template");
	test.equal(selection.select(".component").size(), 1, "import added correct component");
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});

tape("import another template within repeat", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{message}}</span></div><div id='template'><div data-repeat='{{.}}'><div data-import='{{.|format: \"#component\"}}'></div></div></div></body>");
	var importNode = document.querySelector("#component");
	d3.select(importNode).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	var data = [ { message: "Hello" }, { message: "World" }, { message: "Welcome" } ];
	selection.template().render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), data[i].message, "imported template rendered fields correctly");
	});
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

tape("import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{.}}</span></div><div id='template'><div data-repeat='{{.}}'><div data-import='{{.|format: \"#component\"}}' data-with='{{message}}'></div></div></div></body>");
	var importNode = document.querySelector("#component");
	d3.select(importNode).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	var data = [ { message: "Hello" }, { message: "World" }, { message: "Welcome" } ];
	selection.template().render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), data[i].message, "imported template rendered fields correctly");
	});
	test.end();
});

tape("dynamic import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='incoming-message'><span>{{.|prefix: \"Incoming: \"}}</span></div><div id='outgoing-message'><span>{{.|prefix: \"Outgoing: \"}}</span></span><div id='template'><div data-repeat='{{.}}'><div data-import='{{type}}' data-with='{{message}}'></div></div></div></body>");
	d3.select(document.querySelector("#incoming-message")).template();
	d3.select(document.querySelector("#outgoing-message")).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	var data = [ { type: "#incoming-message", message: "Hello" }, { type: "#incoming-message", message: "World" }, { type: "#outgoing-message", message: "Bye" }, { type: "#outgoing-message", message: "sayonara" } ];
	selection.template().render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), (data[i].type === "#incoming-message" ? "Incoming: " : "Outgoing: ") + data[i].message, "imported template rendered fields correctly");
	});
	test.end();
});

tape("multi-level dynamic import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='message'><span>{{.|postfix: \" [!]\"}}</span></div><div id='incoming-message'><div data-import='{{.|format: \"#message\"}}' data-with='{{.|prefix: \"Incoming: \"}}'></div></div><div id='outgoing-message'><div data-import='{{.|format: \"#message\"}}' data-with='{{.|prefix: \"Outgoing: \"}}'></div></div><div id='template'><div data-repeat='{{.}}'><div data-import='{{type}}' data-with='{{message}}'></div></div></div></body>");
	d3.select(document.querySelector("#message")).template();
	d3.select(document.querySelector("#incoming-message")).template();
	d3.select(document.querySelector("#outgoing-message")).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	var data = [ { type: "#incoming-message", message: "Hello" }, { type: "#incoming-message", message: "World" }, { type: "#outgoing-message", message: "Bye" }, { type: "#outgoing-message", message: "sayonara" } ];
	selection.template().render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), (data[i].type === "#incoming-message" ? "Incoming: " : "Outgoing: ") + data[i].message + " [!]", "imported template rendered fields correctly");
	});
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

tape("import with comment as child", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{.|format: \"#component\"}}'><!-- Comment here --></div></div></body>");
	var importNode = document.querySelector("#component");
	d3.select(importNode).template();
	var node = document.querySelector("#template");
	var selection = d3.select(node);
	selection.template().render(null);
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});
