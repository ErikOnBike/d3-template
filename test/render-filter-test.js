var tape = require("tape");
var d3 = Object.assign({}, require("d3-color"));
var renderFilter = require("../").renderFilter;

tape("renderFilter() generics", function(test) {
	test.equal(renderFilter("default")(null, "def"), "def", "Default for null");
	test.equal(renderFilter("default")(undefined, "def"), "def", "Default for undefined");
	test.equal(renderFilter("default")(false, "def"), false, "Default for false (gives false)");
	test.equal(renderFilter("default")(0, "def"), 0, "Default for 0 (gives 0)");
	test.equal(renderFilter("default")("", "def"), "", "Default for \"\" (gives \"\")");
	test.equal(renderFilter("empty-default")("value", "def"), "value", "Filter empty-default with value");
	test.equal(renderFilter("empty-default")("", "def"), "def", "Filter empty-default without value");
	test.deepEqual(renderFilter("empty-default")([ 1 ], [ 1, 2 ]), [ 1 ], "Filter empty-default with value");
	test.deepEqual(renderFilter("empty-default")([], [ 1, 2 ]), [ 1, 2 ], "Filter empty-default without value");
	test.deepEqual(renderFilter("empty-default")(0, 42), 42, "Filter empty-default without value");
	test.deepEqual(renderFilter("empty-default")(3, 42), 3, "Filter empty-default without value");
	test.end();
});

tape("renderFilter() on strings", function(test) {
	test.equal(renderFilter("upper")("value"), "VALUE", "Filter upper");
	test.equal(renderFilter("upper")(undefined), "", "Filter upper on undefined");
	test.equal(renderFilter("lower")("ValuE"), "value", "Filter lower");
	test.equal(renderFilter("lower")(null), "", "Filter lower on null");
	test.equal(renderFilter("prefix")("value", "pre"), "prevalue", "Filter prefix");
	test.equal(renderFilter("postfix")("value", "s and more"), "values and more", "Filter postfix");
	test.equal(renderFilter("postfix")("value", ""), "value", "Filter postfix empty value");
	test.equal(renderFilter("substr")("value", 2), "lue", "Filter substr from");
	test.equal(renderFilter("substr")("value", 2, 2), "lu", "Filter substr from length");
	test.equal(renderFilter("substr")("value", 2, 5), "lue", "Filter substr from >length");
	test.equal(renderFilter("substr")("value", -3), "lue", "Filter substr -from");
	test.equal(renderFilter("substr")("value", -4, 1), "a", "Filter substr -from length");
	test.equal(renderFilter("substr")("value", -4, 10), "alue", "Filter substr -from >length");
	test.equal(renderFilter("substr")(null, -4, 10), "", "Filter substr on null");
	test.end();
});


tape("renderFilter() on numbers", function(test) {
	test.equal(renderFilter("numberFormat")(12.3, "d"), "12", "Filter no decimals (rounded down)");
	test.equal(renderFilter("numberFormat")(12.7, "d"), "13", "Filter no decimals (rounded down)");
	test.equal(renderFilter("numberFormat")(42, ".1f"), "42.0", "Filter single decimal");
	test.equal(renderFilter("numberFormat")(42, ".2f"), "42.00", "Filter double decimals");
	test.equal(renderFilter("numberFormat")(42, ".1"), "4e+1", "Filter exponent notation");
	test.end();
});

tape("renderFilter() on times/dates", function(test) {
	test.equal(renderFilter("timeFormat")(new Date(2018, 0, 2), "%y"), "18", "Filter year without century");
	test.equal(renderFilter("timeFormat")(new Date(2018, 0, 2), "%m"), "01", "Filter month index");
	test.equal(renderFilter("timeFormat")(new Date(2018, 0, 2), "%d"), "02", "Filter day index");
	test.end();
});

tape("renderFilter() on booleans", function(test) {
	test.equal(renderFilter("not")(false), true, "Filter not on false");
	test.equal(renderFilter("not")(true), false, "Filter not on true");
	test.equal(renderFilter("not")("value"), false, "Filter not truthy");
	test.equal(renderFilter("not")(0), true, "Filter not falsy");
	test.equal(renderFilter("equals")(42, 42), true, "Equals for numbers");
	test.equal(renderFilter("equals")("val", "val"), true, "Equals for strings");
	test.equal(renderFilter("equals")("val" === "val", true), true, "Equals for booleans");
	test.equal(renderFilter("equals")("value", "val"), false, "Equals for substrings fails");
	test.equal(renderFilter("equals")("", undefined), false, "Equals for falsies fails");
	test.equal(renderFilter("equals")(null, undefined), false, "Equals for null and undefined");
	test.end();
});

tape("renderFilter() on arrays", function(test) {
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], 2), [ 3, 4, 5], "Filter subarr from");
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], 2, 2), [ 3, 4 ], "Filter subarr from length");
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], 2, 4), [ 3, 4, 5 ], "Filter subarr from >length");
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], -3), [ 3, 4, 5 ], "Filter subarr -from");
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], -3, 1), [ 3 ], "Filter subarr -from length");
	test.deepEqual(renderFilter("subarr")([ 1, 2, 3, 4, 5], -3, 4), [ 3, 4, 5 ], "Filter subarr -from >length");
	test.notDeepEqual(renderFilter("shuffle")([ 1, 2, 3, 4, 5]), [ 1, 2, 3, 4, 5 ], "Filter shuffle");
	test.deepEqual(renderFilter("shuffle")([ 1, 2, 3, 4, 5]).sort(), [ 1, 2, 3, 4, 5 ], "Filter shuffle sorted back");
	test.deepEqual(renderFilter("sort")([ 5, 2, 4, 1, 3]), [ 1, 2, 3, 4, 5 ], "Filter sort numbers array");
	test.deepEqual(renderFilter("sort")([ 5, 2, 5, 2, 5]), [ 2, 2, 5, 5, 5 ], "Filter sort mostly same numbers array");
	test.deepEqual(renderFilter("sort")([ { x: 5 }, { x: 2 }, { x: 5 }, { x: 2 }, { x: 5 }], "x"), [ { x: 2 }, { x: 2 }, { x: 5 }, { x: 5 }, { x: 5 } ], "Filter sort mostly same numbers array");
	var data = [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	];
	test.deepEqual(renderFilter("sort")(data, "x"), [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	], "Filter sort single field ascending (default)");
	test.deepEqual(renderFilter("sort")(data, "+x"), [
		{ x: 1, y: 3, z: 2 },
		{ x: 2, y: 2, z: 1 },
		{ x: 3, y: 1, z: 3 }
	], "Filter sort single field ascending");
	test.deepEqual(renderFilter("sort")(data, "-x"), [
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
	test.deepEqual(renderFilter("sort")(data, "-z,x"), [
		{ x: 3, y: 2, z: "world" },
		{ x: 4, y: 1, z: "world" },
		{ x: 1, y: 4, z: "hello" },
		{ x: 2, y: 3, z: "hello" }
	], "Filter sort multiple fields");
	test.deepEqual(renderFilter("sort")(data, "-z,y"), [
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
	test.deepEqual(renderFilter("sort")(data, "-z,y,-x"), [
		{ x: 4, y: 1, z: "world" },
		{ x: 3, y: 1, z: "world" },
		{ x: 2, y: 2, z: "hello" },
		{ x: 1, y: 2, z: "hello" }
	], "Filter sort multiple fields");
	test.end();
});

tape("renderFilter() on unit and conversion filters", function(test) {
	test.equal(renderFilter("unit")(3, "px"), "3px", "Filter unit for px");
	test.equal(renderFilter("unit")(50, "%"), "50%", "Filter unit for percentage");
	test.equal(renderFilter("color2rgb")(d3.color("red")), "rgb(255, 0, 0)", "Filter convert color 2 rgb");
	test.end();
});

tape("renderFilter() noop (convenience)", function(test) {
	test.equal(renderFilter("noop")(3), 3, "Filter noop numeric");
	test.equal(renderFilter("noop")("Hello"), "Hello", "Filter noop string");
	test.deepEqual(renderFilter("noop")([1, 2, 3]), [1, 2, 3], "Filter noop array");
	test.end();
});

tape("renderFilter() custom", function(test) {
	renderFilter("custom", function(value) { return value + 1; });
	test.equal(renderFilter("custom")(3), 4, "Filter custom numeric");
	test.equal(renderFilter("custom")("Hello"), "Hello1", "Filter custom string");
	renderFilter("upper", function(value) { return value; });
	test.equal(renderFilter("upper")("Hello"), "Hello", "Filter custom replaces existing");
	renderFilter("upper", null);
	test.assert(!renderFilter("upper"), "Filter removed");
	test.throws(function() { renderFilter("custom", "test"); }, /No function specified when registering renderFilter: /, "Non function filter");
	test.end();
});
