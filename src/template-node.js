import { select } from "d3-selection";
import { TemplatePath } from "./template-path";

// Constants
var NODE_BOUNDARY_CLASS = "d3t7s";
var EVENT_HANDLERS = "__on";

// ---- TemplateNode class ----
// I am a node in a template and I join and render data onto templates.
// When joining data onto a template I create (partial) DOM trees.
// These newly created DOM trees will have data bound to them.
// After data is bound to a template I can render attributes and text
// onto the template. I therefore use the renderers I know.
// I also know a number of child nodes within the template which will
// do the joining and rendering of childs further down the DOM tree.
export function TemplateNode(element, dataFunction) {

	// Set instance variables
	this.templatePath = new TemplatePath(element);
	this.dataFunction = dataFunction;
	this.childNodes = [];
	this.renderers = [];

	// Mark element as node boundary
	element.classed(NODE_BOUNDARY_CLASS, true);
}

// ---- TemplateNode class methods ----
// Answer the template selector for the specified element
TemplateNode.templateSelector = function(element) {
	return TemplatePath.selector(element);
};

// Copy specified data onto all children of the template node (recursively)
TemplateNode.copyDataToChildren = function(data, element) {
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		childElement.datum(data);
		if(!childElement.classed(NODE_BOUNDARY_CLASS)) {
			TemplateNode.copyDataToChildren(data, childElement);
		}
	});
};

// ---- TemplateNode instance methods ----
// Answer the elements referred to by the receivers selector
TemplateNode.prototype.resolveTemplateElements = function(rootElement) {
	return this.templatePath.resolve(rootElement);
};

// Answer the data function
TemplateNode.prototype.getDataFunction = function() {
	return this.dataFunction;
};

// Add child template node to the receiver
TemplateNode.prototype.addChildNode = function(childNode) {
	this.childNodes.push(childNode);
};

// Add renderer to the receiver
TemplateNode.prototype.addRenderer = function(renderer) {
	this.renderers.push(renderer);
};

// Join data onto the template
// The data is already present at the specified root element (ie at rootElement.datum())
TemplateNode.prototype.joinData = function(rootElement) {

	// Get data from element and copy to children
	TemplateNode.copyDataToChildren(rootElement.datum(), rootElement);

	// Join data for the child nodes
	this.childNodes.forEach(function(childNode) {
		childNode.joinData(rootElement);
	});

	return this;
};

// Render data onto the template
// Render attributes and text as well as child nodes.
TemplateNode.prototype.render = function(rootElement, transition) {

	// Render attributes
	var element = this.resolveTemplateElements(rootElement); // @@ element or selection or elements?
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(element, transition);
	});

	// Render nodes
	this.renderNodes(element, transition);

	return this;
};

// Render data onto the child nodes of the template
TemplateNode.prototype.renderNodes = function(element, transition) {
	this.childNodes.forEach(function(childNode) {
		childNode.render(element, transition);
	});

	return this;
};

// ---- GroupingNode class ----
// I am a TemplateNode and I create DOM trees based on my (or my
// subclasses') specific purpose. I work like a conditional or control
// flow element. I also know about event handlers on the template.
// When I join data onto the template (and thereby create DOM
// trees) I also apply these event handlers from the template onto
// the newly created DOM trees.
function GroupingNode(element, dataFunction, childElement) {
	TemplateNode.call(this, element, dataFunction);
	this.childElement = childElement;
	this.storedEvents = [];
}
GroupingNode.prototype = Object.create(TemplateNode.prototype);
GroupingNode.prototype.constructor = GroupingNode;

// ---- GroupingNode instance methods ----
// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
GroupingNode.prototype.joinData = function(rootElement) {

	// Sanity check
	if(this.childElement.size() === 0) {
		return;
	}

	// Join data onto DOM
	var joinedElements = this.resolveTemplateElements(rootElement)
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
	this.applyEventHandlers(newElements);

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

	return this;
};

// Add event handlers for specified element to the receiver
GroupingNode.prototype.addEventHandlers = function(element) {

	// Add event handlers for element
	var eventHandlers = element.node()[EVENT_HANDLERS];
	if(eventHandlers && eventHandlers.length > 0) {
		this.storedEvents.push({
			templatePath: new TemplatePath(element),
			eventHandlers: eventHandlers
		});
	}

	// Add event handlers for direct children (recursively)
	var self = this;
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		self.addEventHandlers(childElement);
	});
};

// Apply event handlers onto specified elements (which where created by joining data)
GroupingNode.prototype.applyEventHandlers = function(elements) {
	this.storedEvents.forEach(function(storedEvent) {
		var selection = storedEvent.templatePath.resolve(elements);
		var eventHandlers = storedEvent.eventHandlers;
		eventHandlers.forEach(function(eventHandler) {
			var typename = eventHandler.type;
			if(eventHandler.name) {
				typename += "." + eventHandler.name;
			}
			selection.on(typename, eventHandler.value, eventHandler.capture);
		});
	});
};

// Render data onto the child nodes of the template
GroupingNode.prototype.renderNodes = function(element, transition) {
	var childElements = element.selectAll(function() { return this.children; });
	this.childNodes.forEach(function(childNode) {
		childNode.render(childElements, transition);
	});

	return this;
};

// ---- RepeatNode class ----
// I am a GroupingNode and I create DOM trees based on repeatable
// data (meaning an Array of values).
// Implementation: GroupingNode already contains the default
// implementation for repeating data.
export function RepeatNode(element, dataFunction, childElement) {
	GroupingNode.call(this, element, dataFunction, childElement);
}
RepeatNode.prototype = Object.create(GroupingNode.prototype);
RepeatNode.prototype.constructor = RepeatNode;

// ---- IfNode class ----
// I am a GroupingNode and I create DOM trees based on a conditional
// value (meaning any 'thruthy' value)
// see https://developer.mozilla.org/en-US/docs/Glossary/Truth)
export function IfNode(element, dataFunction, childElement) {
	GroupingNode.call(this, element, dataFunction, childElement);
}
IfNode.prototype = Object.create(GroupingNode.prototype);
IfNode.prototype.constructor = IfNode;

// ---- IfNode instance methods ----
// Answer a data function based on a conditional value
IfNode.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle conditionals.
	// For conditional group create array with either the data as single element or an empty array.
	// This will ensure that a single element is created/updated or an existing element is removed.
	var self = this;
	return function(d, i, nodes) {
		var node = this;
		return TemplateNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ? [ d ] : [];
	};
};

// ---- WithNode class ----
// I am a GroupingNode and I create DOM trees based on an object's property
// value (resulting in a DOM subtree if the property is present)
export function WithNode(element, dataFunction, childElement) {
	GroupingNode.call(this, element, dataFunction, childElement);
}
WithNode.prototype = Object.create(GroupingNode.prototype);
WithNode.prototype.constructor = WithNode;

// ---- WithNode instance methods ----
// Answer a data function based on the value's property
WithNode.prototype.getDataFunction = function() {

	// Use d3's data binding of arrays to handle with.
	// For this scope group create array with the new scoped data as single element
	// This will ensure that all children will receive newly scoped data
	var self = this;
	return function(d, i, nodes) {
		var node = this;
		return [ TemplateNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ];
	};
};
