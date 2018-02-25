var tape = require("tape");

// Use node-es-module-loader to allow testing internal module
var NodeESModuleLoader = require("node-es-module-loader");
var loader = new NodeESModuleLoader();

loader.import("./src/field-parser.js").then(function(m) {

tape("filter-parser field selectors", function(test) {
	var fieldParser = new m.FieldParser();
	test.deepEqual(fieldParser.parse("."), { value: { fieldSelectors: [], filterReferences: [] }, index: 1 }, "Parse <.>");
	test.deepEqual(fieldParser.parse("..a"), { value: { fieldSelectors: [], filterReferences: [] }, index: 1 }, "Parse <..a> (partial)");
	test.deepEqual(fieldParser.parse(".\"a\""), { value: { fieldSelectors: [], filterReferences: [] }, index: 1 }, "Parse <.\\\"a\\\"> (partial)");
	test.deepEqual(fieldParser.parse("x"), { value: { fieldSelectors: [ "x" ], filterReferences: [] }, index: 1 }, "Parse <x>");
	test.deepEqual(fieldParser.parse("\"x\""), { value: { fieldSelectors: [ "x" ], filterReferences: [] }, index: 3 }, "Parse <\"x\">");
	test.deepEqual(fieldParser.parse("x_"), { value: { fieldSelectors: [ "x_" ], filterReferences: [] }, index: 2 }, "Parse <x_>");
	test.deepEqual(fieldParser.parse("😀"), { value: { fieldSelectors: [ "😀" ], filterReferences: [] }, index: 2 }, "Parse <😀>");
	test.deepEqual(fieldParser.parse("x y"), { value: { fieldSelectors: [ "x" ], filterReferences: [] }, index: 2 }, "Parse <x y> (partial)");
	test.deepEqual(fieldParser.parse("  x \t"), { value: { fieldSelectors: [ "x" ], filterReferences: [] }, index: 5 }, "Parse <  x \\t>");
	test.deepEqual(fieldParser.parse("  x.y \t"), { value: { fieldSelectors: [ "x", "y" ], filterReferences: [] }, index: 7 }, "Parse <  x.y \\t>");
	test.deepEqual(fieldParser.parse("  x.y.z \t"), { value: { fieldSelectors: [ "x", "y", "z" ], filterReferences: [] }, index: 9 }, "Parse <  x.y.z \\t>");
	test.deepEqual(fieldParser.parse("  x1.yy.z$ \t"), { value: { fieldSelectors: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 12 }, "Parse <  x1.yy.z$ \\t>");
	test.deepEqual(fieldParser.parse("  x1.\"yy\".z$ \t"), { value: { fieldSelectors: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 14 }, "Parse <  x1.\"yy\".z$ \\t>");
	test.deepEqual(fieldParser.parse("  x1.\"yy\".\"z$\" \t"), { value: { fieldSelectors: [ "x1", "yy", "z$" ], filterReferences: [] }, index: 16 }, "Parse <  x1.\"yy\".\"z$\" \\t>");
	test.deepEqual(fieldParser.parse("  x1.\"yy\".\"z\\\"$\" \t"), { value: { fieldSelectors: [ "x1", "yy", "z\"$" ], filterReferences: [] }, index: 18 }, "Parse <  x1.\"yy\".\"z\\\"$\" \\t>");
	test.deepEqual(fieldParser.parse("  x1 .\t\"yy\"  . \n\t \"z\\\"$\" \t"), { value: { fieldSelectors: [ "x1", "yy", "z\"$" ], filterReferences: [] }, index: 26 }, "Parse <  x1 .\\t\"yy\"  . \\n\\t \"z\\\"$\" \\t>");
	test.deepEqual(fieldParser.parse("  x1 .\t\"y.y\"  . \n\t \"z\\\"$\" \t"), { value: { fieldSelectors: [ "x1", "y.y", "z\"$" ], filterReferences: [] }, index: 27 }, "Parse <  x1 .\\t\"yy\"  . \\n\\t \"z\\\"$\" \\t>");
	test.deepEqual(fieldParser.parse("x..y"), { value: undefined, index: 2, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Fail parse <x..y>");
	test.deepEqual(fieldParser.parse("x.y."), { value: undefined, index: 4, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Fail parse <x.y.>");
	test.deepEqual(fieldParser.parse("x|filter1: true, 1, 2, false|filter2|filter3: null"), { value: { fieldSelectors: [ "x" ], filterReferences: [ { name: "filter1", args: [ true, 1, 2, false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 50 }, "Parse <x|filter1: true, 1, 2, false|filter2|filter3: null>");
	test.deepEqual(fieldParser.parse('x|filter1: true, [ { "a": "b" }, 2 ], false|filter2|filter3: null}'), { value: { fieldSelectors: [ "x" ], filterReferences: [ { name: "filter1", args: [ true, [ { "a": "b" }, 2 ], false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 65 }, "Parse <x|filter1: true, [ { \"a\": \"b\" }, 2 ], false|filter2|filter3: null}> (partial)");
	test.deepEqual(fieldParser.parse('  ß  |   filter1: true , [ { "a"  : "b" } , 2 ] , false  |  filter2  | filter3:  null   }'), { value: { fieldSelectors: [ "ß" ], filterReferences: [ { name: "filter1", args: [ true, [ { "a": "b" }, 2 ], false ] }, { name: "filter2", args: [] }, { name: "filter3", args: [ null ] } ] }, index: 88 }, "Parse <  ß  |   filter1: true , [ { \"a\"  : \"b\" } , 2 ] , false  |  filter2  | filter3:  null   }> (partial)");
	test.deepEqual(fieldParser.parse("~a"), { value: undefined, index: 0, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Parse <~a>");
	test.deepEqual(fieldParser.parse("x | filter1 | filter2 filter3"), { value: { fieldSelectors: [ "x" ], filterReferences: [ { name: "filter1", args: [] }, { name: "filter2", args: [] } ] }, index: 22 }, "Parse <x | filter1 | filter2 filter3> (partial)");
	test.deepEqual(fieldParser.parse("x|filter|"), { value: undefined, index: 9, errorCode: "MISSING_FILTER_NAME" }, "Fail parse <x|filter|>");
	test.deepEqual(fieldParser.parse("1x"), { value: undefined, index: 0, errorCode: "MISSING_VALID_FIELD_SELECTOR" }, "Fail parse <0x>");
	test.deepEqual(fieldParser.parse("x|0filter"), { value: undefined, index: 2, errorCode: "MISSING_FILTER_NAME" }, "Fail parse <x|0filter>");
	test.end();
});

});
