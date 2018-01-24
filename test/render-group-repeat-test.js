var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"));
require("../");

tape("render() empty repeat", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.text(), "", "No content");
	test.equal(selection.selectAll("*").size(), 0, "No elements");
	test.end();
});

tape("render() repeat array with literal values", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div>{{.}}</div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(d, i) {
		test.equal(d, data[i], "Data bound");
		test.equal(d3.select(this).text(), data[i], "Content rendered as text");
	});
	test.end();
});

tape("render() repeat array with object values", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-style-color='{{color}}'>{{text}}</div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [
		{ text: "hello", color: "#ff0000", resultStyle: "rgb(255, 0, 0)" },
		{ text: "world", color: "green", resultStyle: "green" },
		{ text: "don't panic", color: "rgb(0,0,0)", resultStyle: "rgb(0, 0, 0)" }
	];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(d, i) {
		var element = d3.select(this);
		test.equal(d, data[i], "Data bound");
		test.equal(element.text(), data[i].text, "Content rendered as text");
		test.equal(element.style("color"), data[i].resultStyle, "Style applied");
	});
	test.end();
});

tape("render() repeat array with object values and event handlers on nested child", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div><span>{{.}}</span></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	// Add event handler (before creating template)
	var count = 0;
	var sum = 0;
	selection.selectAll("span").on("click", function(d) {
		count++;
		sum += d;
	});
	selection.template().render([ 1, 3, 5, 7, 11, 13 ]);
	// Perform event handlers on children
	selection.selectAll("span").each(function() {
		d3.select(this).on("click").apply(this, [ this.__data__ ]);
	});
	test.equal(count, 6, "All event handlers in place");
	test.equal(sum, 40, "All event handlers have correct");
	test.end();
});

tape("render() repeat array with object values containing arrays", function(test) {
	var document = jsdom("<table><tbody  data-repeat='{{matrix}}'><tr data-repeat='{{row}}'><td data-value='{{value}}'>{{content}}</td></tr></tbody></table>");
	var node = document.querySelector("table");
	var selection = d3.select(node);
	var data = {
		matrix: [
			{ row: [
				{ value: 1, content: "one" },
				{ value: 2, content: "two" },
				{ value: 4, content: "four" },
				{ value: 8, content: "eight" }
			] },
			{ row: [
				{ value: 1, content: "uno" },
				{ value: 2, content: "dos" },
				{ value: 4, content: "cuatro" },
				{ value: 8, content: "ocho" }
			] },
			{ row: [
				{ value: 1, content: "une" },
				{ value: 2, content: "deux" },
				{ value: 4, content: "quatre" },
				{ value: 8, content: "huit" }
			] },
			{ row: [
				{ value: 1, content: "eins" },
				{ value: 2, content: "zwei" },
				{ value: 4, content: "vier" },
				{ value: 8, content: "acht" }
			] },
			{ row: [
				{ value: 1, content: "een" },
				{ value: 2, content: "twee" },
				{ value: 4, content: "vier" },
				{ value: 8, content: "acht" }
			] }
		]
	};
	// Add event handler (before creating template)
	var count = 0;
	selection.selectAll("td").on("click.foo", function(d) {
		var cell = d3.select(this);
		test.equal(cell.attr("data-value"), "" + d.value, "Cell has correct event handler");
		count++;
	});
	selection.template().render(data);
	test.equal(selection.selectAll("tr").size(), data.matrix.length, "All " + data.length + " row elements created");
	test.equal(selection.selectAll("td").size(), data.matrix.length * 4, "All " + data.length + " cell elements created");
	selection.selectAll("tr").each(function(d, rowIndex) {
		var row = d3.select(this);
		row.selectAll("td").each(function(d, cellIndex) {
			var cell = d3.select(this);
			test.equal(d, data.matrix[rowIndex].row[cellIndex], "Data bound");
			test.equal(cell.text(), data.matrix[rowIndex].row[cellIndex].content, "Content rendered as text");
			test.equal(cell.attr("data-value"), "" + data.matrix[rowIndex].row[cellIndex].value, "Content rendered as attribute");
		});
	});
	// Perform event handlers on children
	selection.selectAll("td").each(function() {
		d3.select(this).on("click.foo").apply(this, [ this.__data__ ]);
	});
	test.equal(count, 20, "All 20 event handlers in place");
	test.end();
});

tape("render() repeat array with special array selectors", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-index='{{#index}}' data-position='{{#position}}' data-length='{{#length}}'>{{.}}</div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(d, i, nodes) {
		var element = d3.select(this);
		test.equal(d, data[i], "Data bound");
		test.equal(element.text(), data[i], "Content rendered as text");
		test.equal(element.attr("data-index"), "" + i, "Index operator applied");
		test.equal(element.attr("data-position"), "" + (i + 1), "Position operator applied");
		test.equal(element.attr("data-length"), "" + nodes.length, "Length operator applied");
	});
	test.end();
});

tape("render() repeat array with special array selectors in nested arrays", function(test) {
	var document = jsdom("<div data-repeat='{{.}}'><div data-index='{{#index}}' data-position='{{#position}}' data-length='{{#length}}' data-repeat='{{.}}'><span data-index='{{#index}}' data-position='{{#position}}' data-length='{{#length}}'>{{.}}</span></div></div>");
	var node = document.querySelector("div");
	var selection = d3.select(node);
	var data = [
		[ "a", "b", "c" ],
		[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
		[ true, false ],
		[ 42, "answer", true ]
	];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(rowData, rowIndex, rowNodes) {
		var row = d3.select(this);
		test.equal(rowData, data[rowIndex], "Data bound");
		test.equal(row.attr("data-index"), "" + rowIndex, "Index operator applied on row");
		test.equal(row.attr("data-position"), "" + (rowIndex + 1), "Position operator applied on row");
		test.equal(row.attr("data-length"), "" + rowNodes.length, "Length operator applied on row");
		test.equal(row.selectAll("span").size(), data[rowIndex].length, "All " + data[rowIndex].length + " cell elements created");
		row.selectAll("span").each(function(cellData, cellIndex, cellNodes) {
			var cell = d3.select(this);
			test.equal(cellData, data[rowIndex][cellIndex], "Data bound");
			test.equal(cell.text(), "" + data[rowIndex][cellIndex], "Content rendered in cell at row  index " + rowIndex);
			test.equal(cell.attr("data-index"), "" + cellIndex, "Index operator applied on cell at row  index " + rowIndex);
			test.equal(cell.attr("data-position"), "" + (cellIndex + 1), "Position operator applied on cell at row  index " + rowIndex);
			test.equal(cell.attr("data-length"), "" + cellNodes.length, "Length operator applied on cell at row index " + rowIndex);
		});
	});
	test.end();
});
