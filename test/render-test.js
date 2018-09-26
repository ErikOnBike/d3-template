var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render: render() is available on selections and as regular function", function(test) {
	global.document = jsdom("<body>{{d}}</body>");
	var selection = d3.select("body");
	selection.template();
	test.equal(typeof selection.render, "function", "selection.render is function");
	test.equal(typeof d3.render, "function", "render is function");
	selection.render("Hello");
	test.equal(selection.text(), "Hello", "selection.render() renders");
	selection.call(d3.render, "World");
	test.equal(selection.text(), "World", "selection.call(render, ...) renders");
	d3.render(selection, "Bye");
	test.equal(selection.text(), "Bye", "render() renders");
	test.end();
});

tape("render: render() fails on non template selection", function(test) {
	global.document = jsdom("<body><div><span>hello</span></div></body>");
	var selection = d3.select("body");
	test.throws(function() { selection.render("Hello"); }, /Method render\(\) called on non-template selection\./, "Non-template rendering fails");
	test.end();
});

tape("render: render adds/joins data to elements", function(test) {
	global.document = jsdom("<form class='person'><div class='name'><input name='first-name' data-attr-value='{{d.name.first}}' type='text'><input name='last-name' data-attr-value='{{d.name.last'}}' type='text'></div><input name='birthdate' data-attr-value='{{d.birthdate}}' type='date'></form>");
	var selection = d3.select("form");
	selection.template();
	var data = { name: { first: 'Arthur', last: 'Dent' }, birthdate: "Unknown" };
	selection.render(data);
	test.equal(selection.datum(), data, "Data rendered on root element");
	selection.selectAll("*").each(function() {
		var element = d3.select(this);
		test.equal(element.datum(), data, "Data rendered on child element");
	});
	test.end();
});
