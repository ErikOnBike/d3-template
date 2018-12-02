var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render group-import: import another template by selector", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{\"#component\"}}'></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template");
	selection.template().render(null);
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select("div div").attr("id"), null, "id removed from imported template");
	test.equal(selection.select(".component").size(), 1, "import added correct component");
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});

tape("render group-import: import another template directly", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{d3.select(\"#component\")}}'></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template");
	selection.template().render(null);
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select("div div").attr("id"), null, "id removed from imported template");
	test.equal(selection.select(".component").size(), 1, "import added correct component");
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});

tape("render group-import: import another template using data", function(test) {
	global.document = jsdom("<body><div id='hello'><span>{{d.message}}</span></div><div id='template'><div data-import='{{d.importId}}'></div></div></body>");
	d3.select("#hello").template();
	var selection = d3.select("#template").template();
	selection.render({ importId: "#hello", message: "Hello world!" });
	test.equal(selection.select("div span").text(), "Hello world!", "import includes correct child node");
	selection.render({ importId: "#hello", message: "See you next time!" });
	test.equal(selection.select("div span").text(), "See you next time!", "import includes correct child node");
	test.end();
});

tape("render group-import: dynamically import another template", function(test) {
	global.document = jsdom("<body><div id='hello'><span>Hello</span></div><div id='bye'><span>Bye</span></div><div id='template'><div data-import='{{d.importId}}'></div></div></body>");
	d3.select("#hello").template();
	d3.select("#bye").template();
	var selection = d3.select("#template").template();
	selection.render({ importId: "#hello" });
	test.equal(selection.select("div span").text(), "Hello", "import includes correct child node");
	selection.render({ importId: "#bye" });
	test.equal(selection.select("div span").text(), "Bye", "import includes correct child node");
	test.end();
});

tape("render group-import: import another template within repeat", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{d.message}}</span></div><div id='template'><div data-repeat='{{d}}'><div data-import='{{\"#component\"}}'></div></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template").template();
	var data = [ { message: "Hello" }, { message: "World" }, { message: "Welcome" } ];
	selection.render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), data[i].message, "imported template rendered fields correctly");
	});
	test.end();
});

tape("render group-import: import and with combined", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{d.hello}}</span></div><div id='template'><div data-import='{{\"#component\"}}' data-with='{{d.deeper}}'></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template").template();
	selection.render({ hello: "first", deeper: { hello: "second" } });
	test.equal(selection.selectAll("div").size(), 2, "import added 1 more div (resulting in 2)");
	test.equal(selection.select("span").text(), "second", "import includes correct child");
	test.end();
});

tape("render group-import: import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='component'><span>{{d}}</span></div><div id='template'><div data-repeat='{{d}}'><div data-import='{{\"#component\"}}' data-with='{{d.message}}'></div></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template").template();
	var data = [ { message: "Hello" }, { message: "World" }, { message: "Welcome" } ];
	selection.render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), data[i].message, "imported template rendered fields correctly");
	});
	test.end();
});

tape("render group-import: dynamic import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='incoming-message'><span>{{`Incoming: ${d}`}}</span></div><div id='outgoing-message'><span>{{`Outgoing: ${d}`}}</span></div><div id='template'><div data-repeat='{{d}}'><div data-import='{{d.type}}' data-with='{{d.message}}'></div></div></div></body>");
	d3.select("#incoming-message").template();
	d3.select("#outgoing-message").template();
	var selection = d3.select("#template").template();
	var data = [ { type: "#incoming-message", message: "Hello" }, { type: "#incoming-message", message: "World" }, { type: "#outgoing-message", message: "Bye" }, { type: "#outgoing-message", message: "sayonara" } ];
	selection.render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), (data[i].type === "#incoming-message" ? "Incoming: " : "Outgoing: ") + data[i].message, "imported template rendered fields correctly");
	});
	test.end();
});

tape("render group-import: multi-level dynamic import and with combined within repeat", function(test) {
	global.document = jsdom("<body><div id='message'><span>{{`${d} [!]`}}</span></div><div id='incoming-message'><div data-import='{{\"#message\"}}' data-with='{{`Incoming: ${d}`}}'></div></div><div id='outgoing-message'><div data-import='{{\"#message\"}}' data-with='{{`Outgoing: ${d}`}}'></div></div><div id='template'><div data-repeat='{{d}}'><div data-import='{{d.type}}' data-with='{{d.message}}'></div></div></div></body>");
	d3.select("#message").template();
	d3.select("#incoming-message").template();
	d3.select("#outgoing-message").template();
	var selection = d3.select("#template").template();
	var data = [ { type: "#incoming-message", message: "Hello" }, { type: "#incoming-message", message: "World" }, { type: "#outgoing-message", message: "Bye" }, { type: "#outgoing-message", message: "sayonara" } ];
	selection.render(data);
	selection.selectAll("span").each(function(d, i) {
		test.equal(d3.select(this).text(), (data[i].type === "#incoming-message" ? "Incoming: " : "Outgoing: ") + data[i].message + " [!]", "imported template rendered fields correctly");
	});
	test.end();
});

tape("render group-import: import when child already present", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{\"#component\"}}'>  aaa  </div></div></body>");
	var selection = d3.select("#template");
	test.throws(function() { selection.template() }, /No text allowed within an import grouping./, "The element already has child elements");
	test.end();
});

tape("render group-import: import combined with repeat", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-repeat='{{d}}' data-import='{{\"#component\"}}'>  aaa  </div></div></body>");
	var selection = d3.select("#template");
	test.throws(function() { selection.template() }, /A repeat or if grouping can't be combined with import on the same element./, "The element combines repeat and import");
	test.end();
});

tape("render group-import: import combined with if", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-if='{{d}}' data-import='{{\"#component\"}}'>  aaa  </div></div></body>");
	var selection = d3.select("#template");
	test.throws(function() { selection.template() }, /A repeat or if grouping can't be combined with import on the same element./, "The element combines if and import");
	test.end();
});

tape("render group-import: import with child present", function(test) {
	global.document = jsdom('<div data-import="{{d}}"><span>I should not be here</span></div>');
	var selection = d3.select("div");
	test.throws(function() { selection.template(); }, /No child elements allowed within an import grouping./, "No child elements allowed within import grouping");
	test.end();
});

tape("render group-import: import with comment as child", function(test) {
	global.document = jsdom("<body><div id='component' class='component'><span>Hello</span></div><div id='template'><div data-import='{{\"#component\"}}'><!-- Comment here --></div></div></body>");
	d3.select("#component").template();
	var selection = d3.select("#template");
	selection.template().render(null);
	test.equal(selection.select(".component span").text(), "Hello", "import includes child nodes");
	test.end();
});

tape("render group-import: import with event handlers on children", function(test) {
	global.document = jsdom("<body><div id='component' class='outer'><span class='inner'>Hello</span></div><div id='template'><div data-import='{{\"#component\"}}'></div></div></body>");
	var outerReached = false;
	var innerReached = false;
	// Setup event handlers before creating the component
	d3.select(".outer").on("click", function() { outerReached = true; });
	d3.select(".inner").on("click", function() { innerReached = true; });
	d3.select("#component").template();
	// Create and render the template
	var selection = d3.select("#template");
	selection.template().render(null);
	var innerElement = selection.select(".inner");
	innerElement.on("click").apply(innerElement.node(), [ innerElement.node().__data__ ]);
	test.equal(innerReached, true, "Inner element received event handlers");
	var outerElement = selection.select(".outer");
	outerElement.on("click").apply(outerElement.node(), [ outerElement.node().__data__ ]);
	test.equal(outerReached, true, "Outer element received event handlers");
	test.end();
});
