import {select,matcher} from "d3-selection";

// Constants
var FIELD_SELECTOR_REG_EX = /^([^|]+)\s*(\|\s*([a-zA-Z0-9\-_\.]+)\s*(:\s*(.*))?)?$/u;
var REPEAT_GROUP_INFO = "__repeatGroupInfo";

// Globals
var namedRenderFilters = {};

// Main function
export function renderFilter(name, filterFunc) {
	if(arguments.length === 2) {
		if(filterFunc === null) {
			delete namedRenderFilters[name];
		} else {
			if(typeof filterFunc !== "function") {
				throw "No function specified when registering renderFilter: " + name;
			}
			namedRenderFilters[name] = filterFunc;
		}
	} else {
		return namedRenderFilters[name];
	}
}

// Renderer - Renders data on element
function Renderer(fieldSelector, elementSelector) {
	var trimmed = function(value) { return value ? value.trim() : value; };
	var match = fieldSelector.match(FIELD_SELECTOR_REG_EX);
	this.fieldSelector = match ? trimmed(match[1]) : fieldSelector;
	this.elementSelector = elementSelector;
	this.filterReference = match ? createFilterReference(trimmed(match[3]), trimmed(match[5])) : null;
	this.data = createDataFunction(this.fieldSelector);
}

Renderer.prototype.render = function(/* templateElement */) {
	// Intentionally left empty
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

// Answer the data function of the receiver with the receivers filterReference applied (if applicable)
Renderer.prototype.getFilteredData = function() {
	if(this.filterReference) {
		var filter = namedRenderFilters[this.filterReference.name];
		if(filter) {
			var self = this;
			var args = this.filterReference.args.slice(0);
			return function(d, i, nodes) {
				args[0] = self.data(d, i, nodes);
				return filter.apply(this, args);
			};
		}
	}
	return this.data;
}

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
	this.getElement(templateElement).text(this.getFilteredData());
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
	this.getElement(templateElement).attr(this.attribute, this.getFilteredData());
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
	this.getElement(templateElement).style(this.style, this.getFilteredData());
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
			.data(this.getFilteredData())
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

// Answer specified repeat group property
RepeatRenderer.getProperty = function(node, property) {

	// Find the property by walking up the parent chain until found
	while(node) {
		if(node[REPEAT_GROUP_INFO]) {
			return node[REPEAT_GROUP_INFO][property];
		}
		node = node.parentNode;
	}

	return -1;
};

// IfRenderer - Renders data to a conditional group of elements
export function IfRenderer(fieldSelector, elementSelector, childElement) {
	GroupRenderer.call(this, fieldSelector, elementSelector, childElement);
}

IfRenderer.prototype = Object.create(GroupRenderer.prototype);
IfRenderer.prototype.constructor = IfRenderer;

IfRenderer.prototype.getFilteredData = function() {

	// Use d3's data binding of arrays to handle conditionals.
	// For conditional group create array with either the data as single element or empty array.
	// This will ensure that a single element is created/updated or an existing element is removed.
	var self = this;
	return function(d, i, nodes) { return Renderer.prototype.getFilteredData.call(self)(d, i, nodes) ? [ d ] : []; };
};

// WithRenderer - Renders data to a group of elements with new scope
export function WithRenderer(fieldSelector, elementSelector, childElement) {
	GroupRenderer.call(this, fieldSelector, elementSelector, childElement);
}

WithRenderer.prototype = Object.create(GroupRenderer.prototype);
WithRenderer.prototype.constructor = WithRenderer;

WithRenderer.prototype.getFilteredData = function() {

	// Use d3's data binding of arrays to handle with.
	// For with group create array with the new scoped data as single element
	// This will ensure that all children will receive newly scoped data
	var self = this;
	return function(d, i, nodes) { return [ Renderer.prototype.getFilteredData.call(self)(d, i, nodes) ]; };
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
function createDataFunction(fieldSelector) {
	if(fieldSelector === ".") {
		return function(d) { return d; };
	} else {
		return function(d) {
			var fieldSelectors = fieldSelector.split(".");
			return fieldSelectors.reduce(function(text, selector) {
				return text !== undefined && text !== null ? text[selector] : text;
			}, d);
		};
	}
}

// Create a filter reference consisting of 'name' and 'arguments' pair (to be used during rendering)
function createFilterReference(name, argumentsString) {
	if(!name) {
		return null;
	}

	// Parse arguments string into array of literal values (ie no references allowed)
	var args = null;
	if(argumentsString) {
		try {

			// Arguments prefixed by single null value which will be replaced by the data during rendering
			args = JSON.parse("[null," + argumentsString + "]");
		} catch(ex) {
			throw new SyntaxError("Can't parse filter arguments: \"" + argumentsString + "\". Exception: " + ex.message);
		}
	} else {
		args = [ null ];
	}

	// Answer filter pair
	return {
		name: name,
		args: args
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
