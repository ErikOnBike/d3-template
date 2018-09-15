import { select, matcher } from "d3-selection";

// Constants
var SCOPE_BOUNDARY = "d3t7s";

// TemplateNode - Renders data to a repeating group of elements
export function TemplateNode(templatePath) {

	// Set instance variables
	this.templatePath = templatePath;
	this.childNodes = [];
	this.renderers = [];
}

// Class methods
// Copy specified data onto all children of the element (recursively)
TemplateNode.copyDataToChildren = function(data, element) {
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		childElement.datum(data);
		if(!childElement.classed(SCOPE_BOUNDARY)) {
			TemplateNode.copyDataToChildren(data, childElement);
		}
	});
};

// Instance methods
// Answer the templatePath of the receiver
TemplateNode.prototype.getTemplatePath = function() {
	return this.templatePath;
};

// Answer the element referred to by the receivers templatePath
TemplateNode.prototype.getElementIn = function(rootElement) {
	return this.getTemplatePath().getElementIn(rootElement);
};

// Answer the data function
TemplateNode.prototype.getDataFunction = function() {
	return this.getTemplatePath().getDataFunction();
};

TemplateNode.prototype.render = function(templateElement, transition) {

	// Render attributes
	var element = this.getElementIn(templateElement);
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(element, transition);
	});

	// Render nodes
	this.renderNodes(element, transition);
};

TemplateNode.prototype.renderNodes = function(element, transition) {
	this.childNodes.forEach(function(childNode) {
		childNode.render(element, transition);
	});
};

// Add child (template) elements to the receiver
TemplateNode.prototype.addChildNode = function(childNode) {
	this.childNodes.push(childNode);
};

// Add renderers for child elements to the receiver
TemplateNode.prototype.addRenderer = function(renderer) {
	this.renderers.push(renderer);
};

// RootNode class
export function RootNode(templatePath) {
	TemplateNode.call(this, templatePath);
}
RootNode.prototype = Object.create(TemplateNode.prototype);
RootNode.prototype.constructor = RootNode;

// Instance methods
// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
// The root element already has a datum bound (it will be used in copyDataToChildren)
RootNode.prototype.joinData = function(rootElement) {

	// Get data from element and copy to children
	TemplateNode.copyDataToChildren(rootElement.datum(), rootElement);

	// Join data for the child nodes
	this.childNodes.forEach(function(childNode) {
		childNode.joinData(rootElement);
	});
};

// GroupingNode class
function GroupingNode(templatePath, childElement) {
	TemplateNode.call(this, templatePath);
	this.childElement = childElement;
	this.eventHandlersMap = {};
}
GroupingNode.prototype = Object.create(TemplateNode.prototype);
GroupingNode.prototype.constructor = GroupingNode;

// Class methods
// Add event handlers for specified (sub)element (through a selector) to the receiver
GroupingNode.prototype.addEventHandlers = function(selector, eventHandlers) {
	var entry = this.eventHandlersMap[selector];
	this.eventHandlersMap[selector] = entry ? entry.concat(eventHandlers) : eventHandlers;
};

// Apply specified event handlers onto selection
GroupingNode.applyEventHandlers = function(eventHandlers, selection) {
	eventHandlers.forEach(function(eventHandler) {
		var typename = eventHandler.type;
		if(eventHandler.name) {
			typename += "." + eventHandler.name;
		}
		selection.on(typename, eventHandler.value, eventHandler.capture);
	});
};

// Instance methods
// Join data onto the receiver (using templateElement as base for selecting the DOM elements)
GroupingNode.prototype.joinData = function(templateElement) {

	// Sanity check
	if(this.childElement.size() === 0) {
		return;
	}

	// Join data onto DOM
	var joinedElements = this.getElementIn(templateElement)
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
		GroupingNode.applyEventHandlers(self.eventHandlersMap[selector], selection);
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
		TemplateNode.copyDataToChildren(data, childElement);
	});

	// Create additional child elements on newly created childs
	this.childNodes.forEach(function(childNode) {
		childNode.joinData(childElements);
	});
};

// @@
GroupingNode.prototype.renderNodes = function(element, transition) {
	var childElements = element.selectAll(function() { return this.children; });
	this.childNodes.forEach(function(childNode) {
		childNode.render(childElements, transition);
	});
};

// RepeatNode - Renders data to a repeating group of elements
export function RepeatNode(templatePath, childElement) {
	GroupingNode.call(this, templatePath, childElement);
}
RepeatNode.prototype = Object.create(GroupingNode.prototype);
RepeatNode.prototype.constructor = RepeatNode;

// IfNode - Renders data to a conditional group of elements
export function IfNode(templatePath, childElement) {
	GroupingNode.call(this, templatePath, childElement);
}

IfNode.prototype = Object.create(GroupingNode.prototype);
IfNode.prototype.constructor = IfNode;

IfNode.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle conditionals.
	// For conditional group create array with either the data as single element or empty array.
	// This will ensure that a single element is created/updated or an existing element is removed.
	var self = this;
	return function(d, i, nodes) {
		var node = this;
		return TemplateNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ? [ d ] : [];
	};
};

// WithNode - Renders data to a group of elements with new scope
export function WithNode(templatePath, childElement) {
	GroupingNode.call(this, templatePath, childElement);
}

WithNode.prototype = Object.create(GroupingNode.prototype);
WithNode.prototype.constructor = WithNode;

WithNode.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle with.
	// For with group create array with the new scoped data as single element
	// This will ensure that all children will receive newly scoped data
	var self = this;
	return function(d, i, nodes) {
		var node = this;
		return [ TemplateNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ];
	};
};
