import {default as Parser} from "state-based-string-parser";
import {default as JSONParser} from "state-based-json-parser";
var jsonParser = new JSONParser();

var
	CHARACTER_DOT = 0x2e,
	CHARACTER_DOUBLE_QUOTE = 0x22,
	CHARACTER_PIPE = 0x7c,
	CHARACTER_COLON = 0x3a,
	CHARACTER_COMMA = 0x2c,
	CHARACTER_DOLLAR_SIGN = 0x24,
	CHARACTER_UNDERSCORE = 0x5f,
	CHARACTER_LOWER_A = 0x61,
	CHARACTER_LOWER_Z = 0x7a,
	CHARACTER_UPPER_A = 0x41,
	CHARACTER_UPPER_Z = 0x5a
;

var FILTER_PARSER_STATES = {
	"start": {
		acceptStates: [
			function() {
				return "begin-field-selector";
			}
		]
	},
	"end": {
		skipWhitespace: true,
		isFinal: true
	},
	"begin-field-selector": {
		skipWhitespace: true,
		process: function(parser) {
			parser.setValue({
				fieldSelector: [],
				filterReferences: []
			});
			return true;
		},
		acceptStates: [
			function(charCode, parser) {

				// A dot at the start means only a single dot is present (special field selector for the current data instance)
				if(charCode === CHARACTER_DOT) {
					parser.skipCharacter();
					parser.getValue().fieldSelector.push(".");
					return "end-special-field-selector";
				}
			},
			function() {
				return "field-selector";
			}
		]
	},
	"field-selector": {
		skipWhitespace: true,
		acceptStates: [
			function(charCode) {
				if(charCode === CHARACTER_DOUBLE_QUOTE) {
					return "field-selector-quoted";
				}
			},
			function(charCode, parser) {
				if(FilterParser.isValidIdentifierStartCharCode(charCode)) {

					// An unquoted field selector, start with empty string and repeatedly add valid characters (in next state)
					parser.getValue().fieldSelector.push("");
					return "field-selector-unquoted";
				}
			}
		],
		errorCode: "MISSING_VALID_FIELD_SELECTOR"
	},
	"field-selector-quoted": {
		process: function(parser) {

			// Parse field selector (part) as JSON string
			var parseResult = jsonParser.parse(parser.input.string, parser.input.index);
			if(parseResult.value === undefined) {
				return parseResult.errorCode;
			}

			// Reposition current parser
			while(parser.input.index < parseResult.index) {
				parser.skipCharacter();
			}

			// Store new argument
			parser.getValue().fieldSelector.push(parseResult.value);
			return true;
		},
		acceptStates: [
			function() {
				return "end-field-selector";
			}
		]
	},
	"field-selector-unquoted": {
		acceptStates: [
			function(charCode, parser) {
				if(FilterParser.isValidIdentifierCharCode(charCode)) {
					parser.skipCharacter();
					var fieldSelector = parser.getValue().fieldSelector;
					fieldSelector[fieldSelector.length - 1] += String.fromCharCode(charCode);
					return "field-selector-unquoted";
				}
			},
			function() {
				return "end-field-selector";
			}
		]
	},
	"end-field-selector": {
		skipWhitespace: true,
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_DOT) {
					parser.skipCharacter();
					return "field-selector";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_PIPE) {
					parser.skipCharacter();
					return "filter";
				}
			},
			function() {
				return "end";
			}
		]
	},
	"end-special-field-selector": {
		skipWhitespace: true,
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_PIPE) {
					parser.skipCharacter();
					return "filter";
				}
			},
			function() {
				return "end";
			}
		]
	},
	"filter": {
		skipWhitespace: true,
		process: function(parser) {

			// Add new filter reference
			parser.getValue().filterReferences.push({
				name: "",
				args: []
			});
			return true;
		},
		acceptStates: [
			function(charCode) {
				if(FilterParser.isValidIdentifierStartCharCode(charCode)) {
					return "filter-name";
				}
			}
		],
		errorCode: "MISSING_FILTER_NAME"
	},
	"filter-name": {
		acceptStates: [
			function(charCode, parser) {
				if(FilterParser.isValidIdentifierCharCode(charCode)) {
					parser.skipCharacter();
					var filterReferences = parser.getValue().filterReferences;
					filterReferences[filterReferences.length - 1].name += String.fromCharCode(charCode);
					return "filter-name";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_COLON) {
					parser.skipCharacter();
					return "filter-argument";
				}
			},
			function() {
				return "filter-no-argument";
			}
		]
	},
	"filter-argument": {
		skipWhitespace: true,
		process: function(parser) {

			// Parse argument as JSON value
			var parseResult = jsonParser.parse(parser.input.string, parser.input.index);
			if(parseResult.value === undefined) {
				return parseResult.errorCode;
			}

			// Reposition current parser
			while(parser.input.index < parseResult.index) {
				parser.skipCharacter();
			}

			// Store new argument
			var filterReferences = parser.getValue().filterReferences;
			filterReferences[filterReferences.length - 1].args.push(parseResult.value);
			return true;
		},
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_COMMA) {
					parser.skipCharacter();
					return "filter-argument";
				}
			},
			function(charCode, parser) {
				if(charCode === CHARACTER_PIPE) {
					parser.skipCharacter();
					return "filter";
				}
			},
			function() {
				return "end-filter";
			}
		]
	},
	"filter-no-argument": {
		skipWhitespace: true,
		acceptStates: [
			function(charCode, parser) {
				if(charCode === CHARACTER_PIPE) {
					parser.skipCharacter();
					return "filter";
				}
			},
			function() {
				return "end-filter";
			}
		]
	},
	"end-filter": {
		skipWhitespace: true,
		isFinal: true
	}
};

// FilterParser class
export function FilterParser() {
	Parser.call(this, FILTER_PARSER_STATES);
}
FilterParser.prototype = Object.create(Parser.prototype);
FilterParser.prototype.constructor = FilterParser;

// Class methods
FilterParser.isRegularLetter = function(charCode) {
	return	(charCode >= CHARACTER_LOWER_A && charCode <= CHARACTER_LOWER_Z) ||
		(charCode >= CHARACTER_UPPER_A && charCode <= CHARACTER_UPPER_Z)
	;
};

FilterParser.isNonAsciiDisplayableCharCode = function(charCode) {
	// Very liberate validation which is too liberal for specification, but serves our purpose without introducing obvious problems
	return charCode >= 0xa1;
};

FilterParser.isValidIdentifierStartCharCode = function(charCode) {
	return	charCode === CHARACTER_DOLLAR_SIGN ||
		charCode === CHARACTER_UNDERSCORE ||
		FilterParser.isRegularLetter(charCode) ||
		FilterParser.isNonAsciiDisplayableCharCode(charCode)
	;
};

FilterParser.isValidIdentifierCharCode = function(charCode) {
	return	Parser.isDigit(charCode) ||
		FilterParser.isValidIdentifierStartCharCode(charCode)
	;
};
