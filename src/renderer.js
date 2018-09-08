import {select,matcher} from "d3-selection";
import {FieldParser} from "./field-parser";
import {SCOPE_BOUNDARY} from "./constants";

// Globals
var namedRenderFilters = {};
var fieldParser = new FieldParser();

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

// Answer whether receiver is TemplateElement
Renderer.prototype.isTemplateElement = function() {
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

// TemplateElement - Renders data to a repeating group of elements
export function TemplateElement(fieldSelectorAndFilters, elementSelector, childElement) {

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
	this.childElement = childElement;
	this.eventHandlersMap = {};
	this.renderers = [];
}

// Answer the element which should be rendered (indicated by the receivers elementSelector)
TemplateElement.prototype.getElement = function(templateElement) {

	// Element is either template element itself or child(ren) of the template element (but not both)
	var selection = templateElement.filter(matcher(this.elementSelector));
	if(selection.size() === 0) {
		selection = templateElement.select(this.elementSelector);
	}
	return selection;
};

// Answer the data function
TemplateElement.prototype.getDataFunction = function() {
	return this.dataFunction;
};

TemplateElement.prototype.render = function(templateElement, transition) {

	// Sanity check
	if(this.childElement.size() === 0) {
		return;
	}

	// Join data onto DOM
	var joinedElements = this.getElement(templateElement)
		.selectAll(function() { return this.children; })
			.data(this.getDataFunction())
	;

	// Add new elements
	var self = this;
	var newElements = joinedElements
		.enter()
			.append(function() { return self.childElement.node().cloneNode(true); })
	;

	// Add event handlers to new elements
	Object.keys(this.eventHandlersMap).forEach(function(selector) {
		var selection = newElements.filter(matcher(selector));
		if(selection.size() === 0) {
			selection = newElements.select(selector);
		}
		applyEventHandlers(self.eventHandlersMap[selector], selection);
	});

	// Remove superfluous elements
	joinedElements
		.exit()
			.remove()
	;

	// Update data of children (both new and updated)
	var childElements = newElements.merge(joinedElements);
	childElements.each(function() {
		var childElement = select(this);
		var data = childElement.datum();	// Elements receive data in root by enter/append above
		copyDataToChildren(data, childElement);
	});

	// Render children
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(childElements, transition);
	});
};

// Add event handlers for specified (sub)element (through a selector) to the receiver
TemplateElement.prototype.addEventHandlers = function(selector, eventHandlers) {
	var entry = this.eventHandlersMap[selector];
	this.eventHandlersMap[selector] = entry ? entry.concat(eventHandlers) : eventHandlers;
};

// Add renderers for child elements to the receiver
TemplateElement.prototype.addRenderer = function(renderer) {

	// Append group renderers in order received, but insert non-group renderers like attribute, style or
	// property renderers (on the same element)
	// This allows filters on repeat elements to use the attribute or style values which are also be rendered
	if(!renderer.isTemplateElement()) {

		// Find first group renderer which will render on the same element
		var firstTemplateElementIndex = -1;
		var currentIndex = this.renderers.length - 1;
		var isTemplateElementOnSameElement = function(currentRenderer) {
			return currentRenderer.elementSelector === renderer.elementSelector &&
				currentRenderer.isTemplateElement()
			;
		};
		while(currentIndex >= 0 && isTemplateElementOnSameElement(this.renderers[currentIndex])) {
			firstTemplateElementIndex = currentIndex;
			currentIndex--;
		}

		// If such group renderer is found, insert (attr/style) renderer before (otherwise append)
		if(firstTemplateElementIndex >= 0) {
			this.renderers.splice(firstTemplateElementIndex, 0, renderer);
		} else {
			this.renderers.push(renderer);
		}
	} else {
		this.renderers.push(renderer);
	}
};

// Answer whether receiver is TemplateElement
TemplateElement.prototype.isTemplateElement = function() {
	return true;
};

// RepeatRenderer - Renders data to a repeating group of elements
export function RepeatRenderer(fieldSelector, elementSelector, childElement) {
	TemplateElement.call(this, fieldSelector, elementSelector, childElement);
}

RepeatRenderer.prototype = Object.create(TemplateElement.prototype);
RepeatRenderer.prototype.constructor = RepeatRenderer;

// IfRenderer - Renders data to a conditional group of elements
export function IfRenderer(fieldSelector, elementSelector, childElement) {
	TemplateElement.call(this, fieldSelector, elementSelector, childElement);
}

IfRenderer.prototype = Object.create(TemplateElement.prototype);
IfRenderer.prototype.constructor = IfRenderer;

IfRenderer.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle conditionals.
	// For conditional group create array with either the data as single element or empty array.
	// This will ensure that a single element is created/updated or an existing element is removed.
	var self = this;
	return function(d, i, nodes) { return Renderer.prototype.getDataFunction.call(self)(d, i, nodes) ? [ d ] : []; };
};

// WithRenderer - Renders data to a group of elements with new scope
export function WithRenderer(fieldSelector, elementSelector, childElement) {
	TemplateElement.call(this, fieldSelector, elementSelector, childElement);
}

WithRenderer.prototype = Object.create(TemplateElement.prototype);
WithRenderer.prototype.constructor = WithRenderer;

WithRenderer.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle with.
	// For with group create array with the new scoped data as single element
	// This will ensure that all children will receive newly scoped data
	var self = this;
	return function(d, i, nodes) {
		var node = this;
		return [ Renderer.prototype.getDataFunction.call(self).call(node, d, i, nodes) ];
	};
};

// Helper functions

// Apply specified event handlers onto selection
function applyEventHandlers(eventHandlers, selection) {
	eventHandlers.forEach(function(eventHandler) {
		var typename = eventHandler.type;
		if(eventHandler.name) {
			typename += "." + eventHandler.name;
		}
		selection.on(typename, eventHandler.value, eventHandler.capture);
	});
}

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

// Copy specified data onto all children of the element (recursively)
var copyDataToChildren = function(data, element) {
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		if(!childElement.classed(SCOPE_BOUNDARY)) {
			childElement.datum(data);
			copyDataToChildren(data, childElement);
		}
	});
}
