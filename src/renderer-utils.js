import {format as numberFormat} from "d3-format";
import {timeFormat} from "d3-time-format";
import {shuffle} from "d3-array";
import {renderFilter, createDataFunction} from "./renderer";
import {FieldParser} from "./field-parser";

var defaultFilters = {

	// Generic filters
	"default": function(value, defaultValue) { return value === null || value === undefined ? defaultValue : value; },
	"emptyDefault": function(value, defaultValue) { return !value || value.length === 0 ? defaultValue : value; },
	equals: function(value, otherValue) { return value === otherValue; },
	length: function(value) { return value && value.length ? value.length : 0; },
	format: formatValue,

	// String filters
	upper: function(value) { return (value || "").toLocaleUpperCase(); },
	lower: function(value) { return (value || "").toLocaleLowerCase(); },
	prefix: function(value, prefix) { return "" + prefix + value; },
	postfix: function(value, postfix) { return "" + value + postfix; },
	substr: function(value, from, length) { return (value || "").substr(from, length); },

	// Numeric filters
	numberFormat: function(value, formatString) { return numberFormat(formatString)(value); },

	// Date/time filters
	timeFormat: function(value, formatString) { return timeFormat(formatString)(value); },

	// Boolean filters
	not: function(value) { return !value; },

	// Array filters
	subarr: function(value, from, length) { return value.slice(from, length === undefined ? undefined : from + length + (from < 0 ? value.length : 0)); },
	sort: sortArray,
	shuffle: function(value) { return shuffle(value); },

	// Unit and conversion filters
	unit: function(value, unit) { return value + unit; },	// Actually just a postfix here
	color2rgb: function(value) { return value.toString(); },

	// Repeat group filters
	repeatIndex: function(d, i) { return i; },
	repeatPosition: function(d, i) { return i + 1; },
	repeatLength: function(d, i, nodes) { return nodes.length; }
};

// Register the default filters
Object.keys(defaultFilters).forEach(function(filterName) {
	renderFilter(filterName, defaultFilters[filterName]);
});

// Helper functions

// Answer value formatted according to format string
var parsedFormatStringCache = {};
function formatValue(value, formatString, i, nodes) {
	var parsedFormatString = parsedFormatStringCache[formatString];
	if(parsedFormatString === undefined) {
		parsedFormatString = parsedFormatStringCache[formatString] = parseFormatString(formatString);
	}

	// Iteratively append all formatString parts (fixed string and field selectors with optional filters)
	var node = this;
	return parsedFormatString.reduce(function(result, formatStringPart) {
		if(formatStringPart.dataFunction) {
			var fieldValue = formatStringPart.dataFunction.call(node, value, i, nodes);
			return result + fieldValue;
		}
		return result + formatStringPart;
	}, "");
}

// Answer a parsed format string
// Will be array of strings and field selectors (with optional filters)
var fieldParser = new FieldParser();
function parseFormatString(formatString) {
	var result = [];
	var index = 0;
	while(index < formatString.length) {
		var templateIndex = formatString.indexOf("{", index);
		if(templateIndex >= 0) {

			// Append string in front of template
			if(templateIndex > index) {
				result.push(formatString.slice(index, templateIndex));
			}

			// Parse field selector with optional filters (+1 to skip opening curly brace)
			var parseResult = fieldParser.parse(formatString, templateIndex + 1);
			if(parseResult.value === undefined) {
				throw new SyntaxError("Invalid format string in filter: " + parseResult.errorCode);
			} else if(formatString.charAt(parseResult.index) !== "}") {
				throw new SyntaxError("Invalid format string in filter: EXTRA_CHARACTERS");
			}

			// Append data function for field selector and filter references
			result.push({
				dataFunction: createDataFunction(parseResult.value)
			});

			// Update index for further parsing (+ 1 to skip closing curly brace)
			index = parseResult.index + 1;
		} else {

			// Add final string (no template follows)
			result.push(formatString.slice(index));
			index = formatString.length;
		}
	}

	return result;
}

// Answer sorted array based on specified sort fields
// (sortFieldsString should be comma separated list of field names, optionally prefixed with + or - to indicate ascending/descending)
function sortArray(arr, sortFieldsString) {

	// Create array of sort fields
	var sortFields = sortFieldsString ?
		sortFieldsString.split(",").map(function(sortField) { return sortField.trim(); })
		: null;

	// Answer sorted array
	return arr.sort(function(a, b) {

		// Check for direct values if no sort fields are specified
		if(!sortFields) {
			return sortCompareValues(a, b);
		}

		// Check on sort fields until a distinguising field is found
		var sortFieldIndex = 0;
		while(sortFieldIndex < sortFields.length) {

			// Retrieve field specifier and order
			var field = sortFields[sortFieldIndex];
			var ascending = true;
			if(field.charAt(0) === '+') {
				// Ignore value, default is already ascending
				field = field.slice(1);
			} else if(field.charAt(0) === '-') {
				ascending = false;
				field = field.slice(1);
			}

			// Compare field answer result if fields differ at this point
			var compareValue = sortCompareValues(a[field], b[field]);
			if(compareValue !== 0) {
				return compareValue * (ascending ? 1 : -1);
			}

			// Next sort field
			sortFieldIndex++;
		}

		// No differences encountered, answer 'equal'
		return 0;
	});
}

// Answer compare of a and b values for sorting
function sortCompareValues(a, b) {

	// If a and b can be compared like a string, do so
	if(a.localeCompare && b.localeCompare) {
		return a.localeCompare(b);
	}

	// Compare using the default comparison operators for all others
	if(a < b) {
		return -1;
	} else if(a > b) {
		return +1;
	}
	return 0;
}
