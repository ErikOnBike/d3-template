import {select,matcher} from "d3-selection";
import {FieldParser} from "./field-parser";

// Globals
var namedRenderFilters = {};
export var fieldParser = new FieldParser();

// Main function
export function renderFilter(name, filterFunc) {
	return renderFilterPrivate(name, filterFunc, false);
}

export function renderTweenFilter(name, tweenFilterFunc) {
	return renderFilterPrivate(name, tweenFilterFunc, true);
}

function renderFilterPrivate(name, filterFunc, isTweenFilter) {
	if(filterFunc === null) {
		delete namedRenderFilters[name];
	} else if(filterFunc === undefined) {
		return namedRenderFilters[name];
	} else {
		if(typeof filterFunc !== "function") {
			throw new Error("No function specified when registering renderFilter: " + name);
		}
		if(isTweenFilter) {
			filterFunc.isTweenFunction = true;
		}
		namedRenderFilters[name] = filterFunc;
	}
}

// Renderer - Renders data on element
function Renderer(fieldSelectorAndFilters, elementSelector) {

	// Parse field selector and (optional) filters
	var parseResult = fieldParser.parse(fieldSelectorAndFilters);
	if(parseResult.value === undefined) {
		throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": " + parseResult.errorCode);
	} else if(parseResult.index !== fieldSelectorAndFilters.length) {
		throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": EXTRA_CHARACTERS");
	}

	// Set instance variables
	this.dataFunction = createDataFunction(parseResult.value);
	this.elementSelector = elementSelector;
}

Renderer.prototype.render = function(/* templateElement */) {
	// Intentionally left empty
};

// Answer the data function
Renderer.prototype.getDataFunction = function() {
	return this.dataFunction;
};

// Answer the element which should be rendered (indicated by the receivers elementSelector)
Renderer.prototype.getElement = function(templateElement) {

	// Element is either template element itself or child(ren) of the template element (but not both)
	var selection = templateElement.filter(matcher(this.elementSelector));
	if(selection.size() === 0) {
		selection = templateElement.select(this.elementSelector);
	}
	return selection;
};

// Answer whether receiver is TemplateNode
Renderer.prototype.isTemplateNode = function() {
	return false;
};

// TextRenderer - Renders data as text of element
export function TextRenderer(fieldSelector, elementSelector) {
	Renderer.call(this, fieldSelector, elementSelector);
}

TextRenderer.prototype = Object.create(Renderer.prototype);
TextRenderer.prototype.constructor = TextRenderer;
TextRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render text
	var element = this.getElement(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.tween("text", function(d, i, nodes) {
				var tweenElement = select(this);
				var self = this;
				return function(t) {
					tweenElement.text(dataFunction.call(self, d, i, nodes)(t));
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.text(function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.text(dataFunction);
	}
};

// AttributeRenderer - Renders data as attribute of element
export function AttributeRenderer(fieldSelector, elementSelector, attribute) {
	Renderer.call(this, fieldSelector, elementSelector);
	this.attribute = attribute;
}

AttributeRenderer.prototype = Object.create(Renderer.prototype);
AttributeRenderer.prototype.constructor = AttributeRenderer;
AttributeRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render attribute
	var element = this.getElement(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.attrTween(this.attribute, function(d, i, nodes) {
				var self = this;
				return function(t) {
					return dataFunction.call(self, d, i, nodes)(t);
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.attr(this.attribute, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.attr(this.attribute, dataFunction);
	}
};

// StyleRenderer - Renders data as style of element
export function StyleRenderer(fieldSelector, elementSelector, style) {
	Renderer.call(this, fieldSelector, elementSelector);
	this.style = style;
}

StyleRenderer.prototype = Object.create(Renderer.prototype);
StyleRenderer.prototype.constructor = StyleRenderer;
StyleRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render style
	var element = this.getElement(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.styleTween(this.style, function(d, i, nodes) {
				var self = this;
				return function(t) {
					return dataFunction.call(self, d, i, nodes)(t);
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.style(this.style, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.style(this.style, dataFunction);
	}
};

// PropertyRenderer - Renders data as property of element
export function PropertyRenderer(fieldSelector, elementSelector, property) {
	Renderer.call(this, fieldSelector, elementSelector);
	this.property = property;
}

PropertyRenderer.prototype = Object.create(Renderer.prototype);
PropertyRenderer.prototype.constructor = PropertyRenderer;
PropertyRenderer.prototype.render = function(templateElement, transition) {

	// Do not attach transition to element (like with AttributeRenderer and StyleRenderer)
	// since properties are not supported within a transition. A tween function can however
	// be used with a property.

	// Render property
	var element = this.getElement(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {

			// Attach tween to transition and perform update
			var property = this.property;
			transition.tween(property, function(d, i, nodes) {
				var self = this;
				return function(t) {
					element.property(property, dataFunction.call(self, d, i, nodes)(t));
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.property(this.property, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.property(this.property, dataFunction);
	}
};

// Answer a d3 data function for specified field selector
export function createDataFunction(parseFieldResult) {
	var fieldSelectors = parseFieldResult.fieldSelectors;
	var filterReferences = parseFieldResult.filterReferences;

	// Create initial value function
	var initialValueFunction = function(d) {
		return fieldSelectors.reduce(function(text, selector) {
			return text !== undefined && text !== null ? text[selector] : text;
		}, d);
	};

	// Decide if data function is tweenable (depends on last filter applied)
	var isTweenFunction = false;
	var lastFilterReference = filterReferences.length > 0 ? filterReferences[filterReferences.length - 1] : null;
	if(lastFilterReference) {
		var filter = namedRenderFilters[lastFilterReference.name];
		if(filter && filter.isTweenFunction) {
			isTweenFunction = true;
		}
	}

	// Create data function based on filters and initial value
	var dataFunction = function(d, i, nodes) {
		var node = this;
		return filterReferences.reduce(function(d, filterReference) {
			var filter = namedRenderFilters[filterReference.name];
			if(filter) {
				var args = filterReference.args.slice(0);

				// Prepend d
				args.splice(0, 0, d);

				// Append i and nodes
				args.push(i, nodes);
				return filter.apply(node, args);
			}
			return d;
		}, initialValueFunction(d, i, nodes));
	};
	dataFunction.isTweenFunction = isTweenFunction;

	return dataFunction;
}
