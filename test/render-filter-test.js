var tape = require("tape");
var d3 = Object.assign({}, require("d3-color"), require("../"));

tape("renderFilter() generics", function(test) {
	test.equal(d3.renderFilter("default")(null, "def"), "def", "Default for null");
	test.equal(d3.renderFilter("default")(undefined, "def"), "def", "Default for undefined");
	test.equal(d3.renderFilter("default")(false, "def"), false, "Default for false (gives false)");
	test.equal(d3.renderFilter("default")(0, "def"), 0, "Default for 0 (gives 0)");
	test.equal(d3.renderFilter("default")("", "def"), "", "Default for \"\" (gives \"\")");
	test.equal(d3.renderFilter("emptyDefault")("value", "def"), "value", "Filter emptyDefault with value");
	test.equal(d3.renderFilter("emptyDefault")("", "def"), "def", "Filter emptyDefault without value");
	test.deepEqual(d3.renderFilter("emptyDefault")([ 1 ], [ 1, 2 ]), [ 1 ], "Filter emptyDefault with value");
	test.deepEqual(d3.renderFilter("emptyDefault")([], [ 1, 2 ]), [ 1, 2 ], "Filter emptyDefault without value");
	test.deepEqual(d3.renderFilter("emptyDefault")(0, 42), 42, "Filter emptyDefault without value");
	test.deepEqual(d3.renderFilter("emptyDefault")(3, 42), 3, "Filter emptyDefault without value");
	test.equal(d3.renderFilter("equals")(42, 42), true, "Equals for numbers");
	test.equal(d3.renderFilter("equals")("val", "val"), true, "Equals for strings");
	test.equal(d3.renderFilter("equals")("val" === "val", true), true, "Equals for booleans");
	test.equal(d3.renderFilter("equals")("value", "val"), false, "Equals for substrings fails");
	test.equal(d3.renderFilter("equals")("", undefined), false, "Equals for falsies fails");
	test.equal(d3.renderFilter("equals")(null, undefined), false, "Equals for null and undefined");
	test.equal(d3.renderFilter("length")("hello"), 5, "Length for string");
	test.equal(d3.renderFilter("length")([ 1, 2, 3 ]), 3, "Length for array");
	test.equal(d3.renderFilter("length")(true), 0, "Length on non string or array");
	test.end();
});

tape("renderFilter() on strings", function(test) {
	test.equal(d3.renderFilter("upper")("value"), "VALUE", "Filter upper");
	test.equal(d3.renderFilter("upper")(undefined), "", "Filter upper on undefined");
	test.equal(d3.renderFilter("lower")("ValuE"), "value", "Filter lower");
	test.equal(d3.renderFilter("lower")(null), "", "Filter lower on null");
	test.equal(d3.renderFilter("prefix")("value", "pre"), "prevalue", "Filter prefix");
	test.equal(d3.renderFilter("postfix")("value", "s and more"), "values and more", "Filter postfix");
	test.equal(d3.renderFilter("postfix")("value", ""), "value", "Filter postfix empty value");
	test.equal(d3.renderFilter("substr")("value", 2), "lue", "Filter substr from");
	test.equal(d3.renderFilter("substr")("value", 2, 2), "lu", "Filter substr from length");
	test.equal(d3.renderFilter("substr")("value", 2, 5), "lue", "Filter substr from >length");
	test.equal(d3.renderFilter("substr")("value", -3), "lue", "Filter substr -from");
	test.equal(d3.renderFilter("substr")("value", -4, 1), "a", "Filter substr -from length");
	test.equal(d3.renderFilter("substr")("value", -4, 10), "alue", "Filter substr -from >length");
	test.equal(d3.renderFilter("substr")(null, -4, 10), "", "Filter substr on null");
	test.end();
});


tape("renderFilter() on numbers", function(test) {
	test.equal(d3.renderFilter("numberFormat")(12.3, "d"), "12", "Filter no decimals (rounded down)");
	test.equal(d3.renderFilter("numberFormat")(12.7, "d"), "13", "Filter no decimals (rounded down)");
	test.equal(d3.renderFilter("numberFormat")(42, ".1f"), "42.0", "Filter single decimal");
	test.equal(d3.renderFilter("numberFormat")(42, ".2f"), "42.00", "Filter double decimals");
	test.equal(d3.renderFilter("numberFormat")(42, ".1"), "4e+1", "Filter exponent notation");
	test.end();
});

tape("renderFilter() on times/dates", function(test) {
	test.equal(d3.renderFilter("timeFormat")(new Date(2018, 0, 2), "%y"), "18", "Filter year without century");
	test.equal(d3.renderFilter("timeFormat")(new Date(2018, 0, 2), "%m"), "01", "Filter month index");
	test.equal(d3.renderFilter("timeFormat")(new Date(2018, 0, 2), "%d"), "02", "Filter day index");
	test.end();
});

tape("renderFilter() on booleans", function(test) {
	test.equal(d3.renderFilter("not")(false), true, "Filter not on false");
	test.equal(d3.renderFilter("not")(true), false, "Filter not on true");
	test.equal(d3.renderFilter("not")("value"), false, "Filter not truthy");
	test.equal(d3.renderFilter("not")(0), true, "Filter not falsy");
	test.end();
});

tape("renderFilter() on arrays", function(test) {
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], 2), [ 3, 4, 5], "Filter subarr from");
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], 2, 2), [ 3, 4 ], "Filter subarr from length");
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], 2, 4), [ 3, 4, 5 ], "Filter subarr from >length");
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], -3), [ 3, 4, 5 ], "Filter subarr -from");
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], -3, 1), [ 3 ], "Filter subarr -from length");
	test.deepEqual(d3.renderFilter("subarr")([ 1, 2, 3, 4, 5], -3, 4), [ 3, 4, 5 ], "Filter subarr -from >length");
	test.notDeepEqual(d3.renderFilter("shuffle")([ 1, 2, 3, 4, 5]), [ 1, 2, 3, 4, 5 ], "Filter shuffle");
	test.deepEqual(d3.renderFilter("shuffle")([ 1, 2, 3, 4, 5]).sort(), [ 1, 2, 3, 4, 5 ], "Filter shuffle sorted back");
	test.deepEqual(d3.renderFilter("sort")([ 5, 2, 4, 1, 3]), [ 1, 2, 3, 4, 5 ], "Filter sort numbers array");
	test.deepEqual(d3.renderFilter("sort")([ 5, 2, 5, 2, 5]), [ 2, 2, 5, 5, 5 ], "Filter sort mostly same numbers array");
	test.deepEqual(d3.renderFilter("sort")([ { x: 5 }, { x: 2 }, { x: 5 }, { x: 2 }, { x: 5 }], "x"), [ { x: 2 }, { x: 2 }, { x: 5 }, { x: 5 }, { x: 5 } ], "Filter sort mostly same numbers array");
	var data = [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	];
	test.deepEqual(d3.renderFilter("sort")(data, "x"), [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	], "Filter sort single field ascending (default)");
	test.deepEqual(d3.renderFilter("sort")(data, "+x"), [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	], "Filter sort single field ascending");
	test.deepEqual(d3.renderFilter("sort")(data, "-x"), [
		{ x: 3, y: 1, z: 3 },
		{ x: 2, y: 2, z: 1 },
		{ x: 1, y: 3, z: 2 }
	], "Filter sort single field descending");
	data = [
		{ x: 1, y: 4, z: "hello" },
		{ x: 2, y: 3, z: "hello" },
		{ x: 3, y: 2, z: "world" },
		{ x: 4, y: 1, z: "world" }
	];
	test.deepEqual(d3.renderFilter("sort")(data, "-z,x"), [
		{ x: 3, y: 2, z: "world" },
		{ x: 4, y: 1, z: "world" },
		{ x: 1, y: 4, z: "hello" },
		{ x: 2, y: 3, z: "hello" }
	], "Filter sort multiple fields");
	test.deepEqual(d3.renderFilter("sort")(data, "-z,y"), [
		{ x: 4, y: 1, z: "world" },
		{ x: 3, y: 2, z: "world" },
		{ x: 2, y: 3, z: "hello" },
		{ x: 1, y: 4, z: "hello" }
	], "Filter sort multiple fields");
	data = [
		{ x: 1, y: 2, z: "hello" },
		{ x: 2, y: 2, z: "hello" },
		{ x: 3, y: 1, z: "world" },
		{ x: 4, y: 1, z: "world" }
	];
	test.deepEqual(d3.renderFilter("sort")(data, "-z,y,-x"), [
		{ x: 4, y: 1, z: "world" },
		{ x: 3, y: 1, z: "world" },
		{ x: 2, y: 2, z: "hello" },
		{ x: 1, y: 2, z: "hello" }
	], "Filter sort multiple fields");
	test.end();
});

tape("renderFilter() on unit and conversion filters", function(test) {
	test.equal(d3.renderFilter("unit")(3, "px"), "3px", "Filter unit for px");
	test.equal(d3.renderFilter("unit")(50, "%"), "50%", "Filter unit for percentage");
	test.equal(d3.renderFilter("color2rgb")(d3.color("red")), "rgb(255, 0, 0)", "Filter convert color 2 rgb");
	test.end();
});

tape("renderFilter() custom", function(test) {
	d3.renderFilter("custom", function(value) { return value + 1; });
	test.equal(d3.renderFilter("custom")(3), 4, "Filter custom numeric");
	test.equal(d3.renderFilter("custom")("Hello"), "Hello1", "Filter custom string");
	d3.renderFilter("upper", function(value) { return value; });
	test.equal(d3.renderFilter("upper")("Hello"), "Hello", "Filter custom replaces existing");
	d3.renderFilter("upper", null);
	test.assert(!d3.renderFilter("upper"), "Filter removed");
	test.throws(function() { d3.renderFilter("custom", "test"); }, /No function specified when registering renderFilter: /, "Non function filter");
	test.end();
});
