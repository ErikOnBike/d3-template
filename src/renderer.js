import {select,matcher} from "d3-selection";
import {FieldParser} from "./field-parser";

// Constants
var REPEAT_GROUP_INFO = "__repeatGroupInfo";

// Globals
var namedRenderFilters = {};
var fieldParser = new FieldParser();

// Main function
export function renderFilter(name, filterFunc) {
	if(arguments.length === 2) {
		if(filterFunc === null) {
			delete namedRenderFilters[name];
		} else {
			if(typeof filterFunc !== "function") {
				throw new Error("No function specified when registering renderFilter: " + name);
			}
			namedRenderFilters[name] = filterFunc;
		}
	} else {
		return namedRenderFilters[name];
	}
}

// Renderer - Renders data on element
function Renderer(fieldSelectorAndFilters, elementSelector) {

	// Parse field selector and (optional) filters
	var parseResult = fieldParser.parse(fieldSelectorAndFilters);
	if(parseResult.value === undefined) {
		throw new SyntaxError("Failed to parse field selector and/or filter: " + parseResult.errorCode);
	} else if(parseResult.index !== fieldSelectorAndFilters.length) {
		throw new SyntaxError("Failed to parse field selector and/or filter: EXTRA_CHARACTERS");
	}

	// Set instance variables
	this.data = createDataFunction(parseResult.value);
	this.elementSelector = elementSelector;
}

Renderer.prototype.render = function(/* templateElement */) {
	// Intentionally left empty
};

// Answer the data function
Renderer.prototype.getData = function() {
	return this.data;
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

// Answer whether receiver is AttributeRenderer
Renderer.prototype.isAttributeRenderer = function() {
	return false;
};

// Answer whether receiver is StyleRenderer
Renderer.prototype.isStyleRenderer = function() {
	return false;
};

// Answer whether receiver is GroupRenderer
Renderer.prototype.isGroupRenderer = function() {
	return false;
};

// Answer whether receiver is RepeatRenderer
Renderer.prototype.isRepeatRenderer = function() {
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
	this.getElement(templateElement).text(this.getData());
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
	this.getElement(templateElement).attr(this.attribute, this.getData());
};

// Answer whether receiver is AttributeRenderer
AttributeRenderer.prototype.isAttributeRenderer = function() {
	return true;
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
	this.getElement(templateElement).style(this.style, this.getData());
};

// Answer whether receiver is StyleRenderer
StyleRenderer.prototype.isStyleRenderer = function() {
	return true;
};

// GroupRenderer - Renders data to a repeating group of elements
export function GroupRenderer(fieldSelector, elementSelector, childElement) {
	Renderer.call(this, fieldSelector, elementSelector);
	this.childElement = childElement;
	this.eventHandlersMap = {};
	this.renderers = [];
}

GroupRenderer.prototype = Object.create(Renderer.prototype);
GroupRenderer.prototype.constructor = GroupRenderer;
GroupRenderer.prototype.render = function(templateElement, transition) {

	// Sanity check
	if(this.childElement.size() === 0) {
		return;
	}

	// Join data onto DOM
	var joinedElements = this.getElement(templateElement)
		.selectAll(function() { return this.children; })
			.data(this.getData())
	;

	// Add new elements
	var self = this;
	var newElements = joinedElements
		.enter()
			.append(function() { return self.childElement.node().cloneNode(true); })
	;

	// Make data same for all children of the new elements
	newElements.each(function(d, i, nodes) {
		var newElement = select(this);
		var data = newElement.datum();	// New elements receive data in root by enter/append above
		copyDataToChildren(data, newElement);

		// Copy repeat data onto element
		if(self.isRepeatRenderer()) {
			this[REPEAT_GROUP_INFO] = {
				index: i,
				position: i + 1,
				length: nodes.length
			};
		}
	});

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

	// Render children (both new and updated)
	var childElements = newElements.merge(joinedElements);
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(childElements, transition);
	});
};

// Add event handlers for specified (sub)element (through a selector) to the receiver
GroupRenderer.prototype.addEventHandlers = function(selector, eventHandlers) {
	var entry = this.eventHandlersMap[selector];
	this.eventHandlersMap[selector] = entry ? entry.concat(eventHandlers) : eventHandlers;
};

// Add renderers for child elements to the receiver
GroupRenderer.prototype.addRenderer = function(renderer) {

	// Append group renderers in order received, but insert attribute or style renderers (on the same element)
	// This allows filters on repeat elements to use the attribute or style values which are also be rendered
	if(renderer.isAttributeRenderer() || renderer.isStyleRenderer()) {

		// Find first group renderer which will render on the same element
		var firstGroupRendererIndex = -1;
		var currentIndex = this.renderers.length - 1;
		var isGroupRendererOnSameElement = function(currentRenderer) {
			return currentRenderer.elementSelector === renderer.elementSelector &&
				currentRenderer.isGroupRenderer()
			;
		};
		while(currentIndex >= 0 && isGroupRendererOnSameElement(this.renderers[currentIndex])) {
			firstGroupRendererIndex = currentIndex;
			currentIndex--;
		}

		// If such group renderer is found, insert (attr/style) renderer before (otherwise append)
		if(firstGroupRendererIndex >= 0) {
			this.renderers.splice(firstGroupRendererIndex, 0, renderer);
		} else {
			this.renderers.push(renderer);
		}
	} else {
		this.renderers.push(renderer);
	}
};

// Answer whether receiver is GroupRenderer
GroupRenderer.prototype.isGroupRenderer = function() {
	return true;
};

// RepeatRenderer - Renders data to a repeating group of elements
export function RepeatRenderer(fieldSelector, elementSelector, childElement) {
	GroupRenderer.call(this, fieldSelector, elementSelector, childElement);
}

RepeatRenderer.prototype = Object.create(GroupRenderer.prototype);
RepeatRenderer.prototype.constructor = RepeatRenderer;

// Answer whether group renderer is RepeatRenderer
RepeatRenderer.prototype.isRepeatRenderer = function() {
	return true;
};

// IfRenderer - Renders data to a conditional group of elements
export function IfRenderer(fieldSelector, elementSelector, childElement) {
	GroupRenderer.call(this, fieldSelector, elementSelector, childElement);
}

IfRenderer.prototype = Object.create(GroupRenderer.prototype);
IfRenderer.prototype.constructor = IfRenderer;

IfRenderer.prototype.getData = function() {

	// Use d3's data binding of arrays to handle conditionals.
	// For conditional group create array with either the data as single element or empty array.
	// This will ensure that a single element is created/updated or an existing element is removed.
	var self = this;
	return function(d, i, nodes) { return Renderer.prototype.getData.call(self)(d, i, nodes) ? [ d ] : []; };
};

// WithRenderer - Renders data to a group of elements with new scope
export function WithRenderer(fieldSelector, elementSelector, childElement) {
	GroupRenderer.call(this, fieldSelector, elementSelector, childElement);
}

WithRenderer.prototype = Object.create(GroupRenderer.prototype);
WithRenderer.prototype.constructor = WithRenderer;

WithRenderer.prototype.getData = function() {

	// Use d3's data binding of arrays to handle with.
	// For with group create array with the new scoped data as single element
	// This will ensure that all children will receive newly scoped data
	var self = this;
	return function(d, i, nodes) { return [ Renderer.prototype.getData.call(self)(d, i, nodes) ]; };
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
	var initialValueFunction = fieldSelectors[0] === "." ?
		function(d) { return d; } :
		function(d) {
			return fieldSelectors.reduce(function(text, selector) {
				return text !== undefined && text !== null ? text[selector] : text;
			}, d);
		}
	;

	// Create data function based on filters and initial value
	return function(d, i, nodes) {
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
}

// Copy specified data onto all children of the element (recursively)
var copyDataToChildren = function(data, element) {
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		childElement.datum(data);
		copyDataToChildren(data, childElement);
	});
}
