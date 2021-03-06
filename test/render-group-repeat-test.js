var tape = require("tape");
var jsdom = require("./jsdom");
var d3 = Object.assign({}, require("d3-selection"), require("../"));

tape("render group-repeat: render empty repeat", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'></div>");
	var selection = d3.select("div");
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.text(), "", "No content");
	test.equal(selection.selectAll("*").size(), 0, "No elements");
	test.end();
});

tape("render group-repeat: render repeat array with literal values", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div>{{d}}</div></div>");
	var selection = d3.select("div");
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(d, i) {
		test.equal(d, data[i], "Data bound");
		test.equal(d3.select(this).text(), data[i], "Content rendered as text");
	});
	test.end();
});

tape("render group-repeat: render repeat array with object values", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div data-style-color='{{d.color}}'>{{d.text}}</div></div>");
	var selection = d3.select("div");
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

tape("render group-repeat: render repeat array with object values render twice", function(test) {
	global.document = jsdom("<div><span>{{d.title}}</span><div><div class='testable'><div data-repeat='{{d.words}}'><div class='word'><span class='dutch'>{{d.dutch}}</span> - <span class='english'>{{d.english}}</span> <span data-repeat='{{d.icons}}'><span><span class='icon'><span>{{d}}</span></span></span></span></div></div></div></div></div>");
	var selection = d3.select("div");
	selection.template();
	var firstData = {
		title: "First data",
		words: [
			{ dutch: "een", english: "one", icons: [ "I" ] },
			{ dutch: "twee", english: "two", icons: [ "I", "I" ] },
			{ dutch: "drie", english: "three", icons: [ "I", "I", "I" ] },
			{ dutch: "vier", english: "four", icons: [ "I", "I", "I", "I" ] }
		]
	};
	var secondData = {
		title: "Second data",
		words: [
			{ dutch: "hallo", english: "hello", icons: [ "👋" ] },
			{ dutch: "tot ziens", english: "goodbye", icons: [ "👋" ] },
			{ dutch: "ja", english: "yes", icons: [ "👍", "👌" ] },
			{ dutch: "nee", english: "no", icons: [ "👎" ] },
			{ dutch: "gezellig", english: "...no translation available...", icons: [] }
		]
	};

	// Render and test first data
	selection.render(firstData);
	selection.select(".testable").each(function(d) {
		test.equal(d, firstData, "First data bound");
	});
	selection.selectAll(".word").each(function(d, i) {
		var element = d3.select(this);
		test.equal(element.select(".dutch").text(), firstData.words[i].dutch, "First content rendered as dutch text");
		test.equal(element.select(".english").text(), firstData.words[i].english, "First content rendered as english text");
		element.selectAll(".icon").each(function(d, j) {
			var element = d3.select(this);
			test.equal(d, firstData.words[i].icons[j], "First content data bound");
			test.equal(element.text(), firstData.words[i].icons[j], "First content icons rendered");
		});
	});

	// Render and test second data
	selection.render(secondData);
	selection.select(".testable").each(function(d) {
		test.equal(d, secondData, "Second data bound");
	});
	selection.selectAll(".word").each(function(d, i) {
		var element = d3.select(this);
		test.equal(element.select(".dutch").text(), secondData.words[i].dutch, "Second content rendered as dutch text");
		test.equal(element.select(".english").text(), secondData.words[i].english, "Second content rendered as english text");
		element.selectAll(".icon").each(function(d, j) {
			var element = d3.select(this);
			test.equal(d, secondData.words[i].icons[j], "Second content data bound");
			test.equal(element.text(), secondData.words[i].icons[j], "Second content icons rendered");
		});
	});
	selection.selectAll(".icon").each(function(d) {
		test.notEqual(d, "I", "Second content data bound");
	});
	test.end();
});

tape("render group-repeat: render repeat array with object values and event handlers on nested child", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div><span>{{d}}</span></div></div>");
	var selection = d3.select("div");
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
	test.equal(sum, 40, "All event handlers have correct value");
	test.end();
});

tape("render group-repeat: render repeat array with object values and event handlers on nested child, but render no child", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div><span>{{d}}</span></div></div>");
	var selection = d3.select("div");
	// Add event handler (before creating template)
	selection.selectAll("span").on("click", function() {
		// Do nothing
	});
	// This should not fail
	selection.template().render([]);
	// Render a single child
	selection.render([ "hello" ]);
	test.equal(selection.select("span").on("click") !== null, true, "Event handler installed");
	test.end();
});

tape("render group-repeat: render repeat array with object values containing arrays", function(test) {
	global.document = jsdom("<table><tbody  data-repeat='{{d.matrix}}'><tr data-repeat='{{d.row}}'><td data-value='{{d.value}}'>{{d.content}}</td></tr></tbody></table>");
	var selection = d3.select("table");
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

tape("render group-repeat: render repeat array with data function values d, i and nodes", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div data-index='{{i}}' data-position='{{i+1}}' data-length='{{nodes.length}}'>{{d}}</div></div>");
	var selection = d3.select("div");
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	test.equal(selection.selectAll("div").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div").each(function(d, i, nodes) {
		var element = d3.select(this);
		test.equal(d, data[i], "Data bound");
		test.equal(element.text(), data[i], "Content rendered as text");
		test.equal(element.attr("data-index"), "" + i, "i rendered");
		test.equal(element.attr("data-position"), "" + (i + 1), "i + 1 rendered");
		test.equal(element.attr("data-length"), "" + nodes.length, "nodes.length rendered");
	});
	test.end();
});

tape("render group-repeat: render repeat array with data function values d, i and nodes in nested arrays", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div><div class='x' data-index='{{i}}' data-position='{{i+1}}' data-length='{{nodes.length}}' data-repeat='{{d}}'><span data-index='{{i}}' data-position='{{i+1}}' data-length='{{nodes.length}}'>{{d}}</span></div></div></div>");
	var selection = d3.select("div");
	var data = [
		[ "a", "b", "c" ],
		[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
		[ true, false ],
		[ 42, "answer", true ]
	];
	selection.template().render(data);
	test.equal(selection.selectAll("div.x").size(), data.length, "All " + data.length + " array elements created");
	selection.selectAll("div.x").each(function(rowData, rowIndex, rowNodes) {
		var row = d3.select(this);
		test.equal(rowData, data[rowIndex], "Data bound");
		test.equal(row.attr("data-index"), "" + rowIndex, "Row index rendered");
		test.equal(row.attr("data-position"), "" + (rowIndex + 1), "Row position rendered");
		test.equal(row.attr("data-length"), "" + rowNodes.length, "Nodes.length rendered");
		test.equal(row.selectAll("span").size(), data[rowIndex].length, "All " + data[rowIndex].length + " cell elements created");
		row.selectAll("span").each(function(cellData, cellIndex, cellNodes) {
			var cell = d3.select(this);
			test.equal(cellData, data[rowIndex][cellIndex], "Data bound");
			test.equal(cell.text(), "" + data[rowIndex][cellIndex], "Content rendered in cell at row  index " + rowIndex);
			test.equal(cell.attr("data-index"), "" + cellIndex, "Cell index rendered at row index " + rowIndex);
			test.equal(cell.attr("data-position"), "" + (cellIndex + 1), "Cell position rendered at row index" + rowIndex);
			test.equal(cell.attr("data-length"), "" + cellNodes.length, "Nodes.length rendered at row index " + rowIndex);
		});
	});
	test.end();
});

tape("render group-repeat: render data function value 'i' without array", function(test) {
	global.document = jsdom("<div data-value='{{i}}'>hello</div>");
	var selection = d3.select("div");
	var data = "hello world";
	selection.template().render(data);
	test.equal(selection.attr("data-value"), "0", "Repeat index 0 on non-repeat template");
	test.end();
});

tape("render group-repeat: render repeat array with format expression", function(test) {
	global.document = jsdom("<div data-repeat='{{d}}'><div><span>{{`Index: ${i} is ${d}`}}</span></div></div>");
	var selection = d3.select("div");
	var data = [ "hello", "world", "!" ];
	selection.template().render(data);
	selection.selectAll("span").each(function(d, i) {
		var span = d3.select(this);
		test.equal(span.text(), "Index: " + i + " is " + d, "Index applied using format");
	});
	test.end();
});
