var tape = require("tape");

// Use node-es-module-loader to allow testing internal module
var NodeESModuleLoader = require("node-es-module-loader");
var loader = new NodeESModuleLoader();

loader.import("./src/filter-parser.js").then(function(m) {

tape("filter-parser field selectors", function(test) {
	var filterParser = new m.FilterParser();
	test.deepEqual(filterParser.parse("."), { value: { fieldSelector: [ "." ], filterReferences: [] }, index: 1 }, "Parse <.>");
	test.deepEqual(filterParser.parse("..a"), { value: { fieldSelector: [ "." ], filterReferences: [] }, index: 1 }, "Parse <..a> (partial_");
	test.deepEqual(filterParser.parse(".\"a\""), { value: { fieldSelector: [ "." ], filterReferences: [] }, index: 1 }, "Parse <.\\\"a\\\"> (partial_");
	test.deepEqual(filterParser.parse("x"), { value: { fieldSelector: [ "x" ], filterReferences: [] }, index: 1 }, "Parse <x>");
	test.deepEqual(filterParser.parse("  x \t"), { value: { fieldSelector: [ "x" ], filterReferences: [] }, index: 5 }, "Parse <  x \\t>");
	test.deepEqual(filterParser.parse("  x.y \t"), { value: { fieldSelector: [ "x", "y" ], filterReferences: [] }, index: 7 }, "Parse <  x.y \\t>");
	test.deepEqual(filterParser.parse("  x.y.z \t"), { value: { fieldSelector: [ "x", "y", "z" ], filterReferences: [] }, index: 9 }, "Parse <  x.y.z \\t>");
	test.deepEqual(filterParser.parse("  x1.yy.z$ \t"), { value: { fieldSelector: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 12 }, "Parse <  x1.yy.z$ \\t>");
	test.deepEqual(filterParser.parse("  x1.\"yy\".z$ \t"), { value: { fieldSelector: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 14 }, "Parse <  x1.\"yy\".z$ \\t>");
	test.deepEqual(filterParser.parse("  x1.\"yy\".\"z$\" \t"), { value: { fieldSelector: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 16 }, "Parse <  x1.\"yy\".\"z$\" \\t>");
	test.deepEqual(filterParser.parse("  x1.\"yy\".\"z\\\"$\" \t"), { value: { fieldSelector: [ "x1", "yy", "z\"$" ], filterReferences: [] }, index: 18 }, "Parse <  x1.\"yy\".\"z\\\"$\" \\t>");
	test.deepEqual(filterParser.parse("  x1 .\t\"yy\"  . \n\t \"z\\\"$\" \t"), { value: { fieldSelector: [ "x1", "yy", "z\"$" ], filterReferences: [] }, index: 26 }, "Parse <  x1 .\\t\"yy\"  . \\n\\t \"z\\\"$\" \\t>");
	test.deepEqual(filterParser.parse("  x1 .\t\"y.y\"  . \n\t \"z\\\"$\" \t"), { value: { fieldSelector: [ "x1", "y.y", "z\"$" ], filterReferences: [] }, index: 27 }, "Parse <  x1 .\\t\"yy\"  . \\n\\t \"z\\\"$\" \\t>");
	test.deepEqual(filterParser.parse("x..y"), { value: undefined, index: 2, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Fail parse <x..y>");
	test.deepEqual(filterParser.parse("x.y."), { value: undefined, index: 4, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Fail parse <x.y.>");
	test.deepEqual(filterParser.parse("x|filter1: true, 1, 2, false|filter2|filter3: null"), { value: { fieldSelector: [ "x" ], filterReferences: [ { name: "filter1", args: [ true, 1, 2, false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 50 }, "Parse <x|filter1: true, 1, 2, false|filter2|filter3: null>");
	test.deepEqual(filterParser.parse('x|filter1: true, [ { "a": "b" }, 2 ], false|filter2|filter3: null}'), { value: { fieldSelector: [ "x" ], filterReferences: [ { name: "filter1", args: [ true, [ { "a": "b" }, 2 ], false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 65 }, "Parse <x|filter1: true, [ { \"a\": \"b\" }, 2 ], false|filter2|filter3: null}> (partial)");
	test.deepEqual(filterParser.parse('  ß  |   filter1: true , [ { "a"  : "b" } , 2 ] , false  |  filter2  | filter3:  null   }'), { value: { fieldSelector: [ "ß" ], filterReferences: [ { name: "filter1", args: [ true, [ { "a": "b" }, 2 ], false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 88 }, "Parse <  ß  |   filter1: true , [ { \"a\"  : \"b\" } , 2 ] , false  |  filter2  | filter3:  null   }> (partial)");
	test.deepEqual(filterParser.parse("x|filter|"), { value: undefined, index: 9, errorCode: "MISSING_FILTER_NAME" }, "Fail parse <x|filter|>");
	test.end();
});

});
