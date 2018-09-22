import { select } from "d3-selection";
import { TemplatePath } from "./template-path";

// ---- Constants ----
var ELEMENT_BOUNDARY_ATTRIBUTE = "data-d3t7b";
var BOOLEAN_ATTRIBUTE_VALUE = "1";	// Smallest (somewhat meaningful) thruthy string value
var ALL_DIRECT_CHILDREN = function() { return this.children; };

// ---- TemplateNode class ----
// I am a node in a template and I join and render data onto templates.
// After data is bound to a template I can render attributes and text
// onto the template. I therefore use the renderers I know.
// I also know a number of child nodes within the template which will
// do the joining and rendering of childs further down the DOM tree.
export function TemplateNode(rootElement) {

	// Set instance variables
	this.templatePath = new TemplatePath(rootElement);
	this.childNodes = [];
	this.renderers = [];

	// Mark root element as a boundary
	rootElement.attr(ELEMENT_BOUNDARY_ATTRIBUTE, BOOLEAN_ATTRIBUTE_VALUE);
}

// ---- TemplateNode class methods ----
// Copy specified data onto all children of the DOM node (recursively)
// Parameter data is optional. If not supplied the node's data is used.
TemplateNode.copyDataToChildren = function(node, data) {

	// Retrieve data from node if no data is supplied
	if(arguments.length < 2) {
		data = node.__data__;
	}

	// Set data to children and their children recursively
	var children = node.children;
	for(var i = 0; i < children.length; i++) {
		children[i].__data__ = data;
		if(!children[i].hasAttribute(ELEMENT_BOUNDARY_ATTRIBUTE)) {
			TemplateNode.copyDataToChildren(children[i], data);
		}
	}
};

// ---- TemplateNode instance methods ----
// Answer the elements referred to by the receiver
TemplateNode.prototype.resolveTemplateElements = function(rootElement) {
	return this.templatePath.resolve(rootElement);
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
TemplateNode.prototype.joinData = function(rootElement) {

	// Copy data to children (data is already present in rootElement so don't provide it here)
	TemplateNode.copyDataToChildren(rootElement.node());

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
	var templateElements = this.resolveTemplateElements(rootElement);
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(templateElements, transition);
	});

	// Render nodes
	this.renderNodes(templateElements, transition);

	return this;
};

// Render data onto the child nodes of the template
TemplateNode.prototype.renderNodes = function(templateElements, transition) {
	this.childNodes.forEach(function(childNode) {
		childNode.render(templateElements, transition);
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
	TemplateNode.call(this, element);
	this.dataFunction = dataFunction;
	this.childElement = childElement;
	this.storedEventHandlers = [];
}
GroupingNode.prototype = Object.create(TemplateNode.prototype);
GroupingNode.prototype.constructor = GroupingNode;

// ---- GroupingNode instance methods ----
// Answer the data function of the receiver
GroupingNode.prototype.getDataFunction = function() {
	return this.dataFunction;
};

// Answer the child element of the receiver
GroupingNode.prototype.getChildElement = function(/* rootElement */) {
	return this.childElement;
};

// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
GroupingNode.prototype.joinData = function(rootElement) {

	// Sanity check
	var childElement = this.getChildElement(rootElement);
	if(childElement.size() === 0) {
		return;
	}
	var childNode = childElement.node();

	// Join data onto DOM
	var joinedElements = this.resolveTemplateElements(rootElement)
		.selectAll(ALL_DIRECT_CHILDREN)
			.data(this.getDataFunction())
	;

	// Add new elements
	var newElements = joinedElements
		.enter()
			.append(function() {

				// Return a clone of the child element
				// (removing its id for uniqueness and copying template if applicable)
				var clonedNode = childNode.cloneNode(true);
				clonedNode.removeAttribute("id");
				if(childNode.__d3t7__ && childNode.__d3t7__.render) {
					clonedNode.__d3t7__ = childNode.__d3t7__;
				}
				return clonedNode;
			})
	;

	// Add event handlers to new elements
	this.applyEventHandlers(newElements);

	// Remove superfluous elements
	joinedElements
		.exit()
			.remove()
	;

	// Update data of children (both new and updated)
	var updatedElements = newElements.merge(joinedElements);
	updatedElements.each(function() {

		// Elements receive data in root by enter/append above so don't provide data
		TemplateNode.copyDataToChildren(this);
	});

	// Create additional child elements on newly created childs
	this.childNodes.forEach(function(childNode) {
		childNode.joinData(updatedElements);
	});

	return this;
};

// Store the event handlers of the specified element in the receiver
GroupingNode.prototype.storeEventHandlers = function(element) {

	// Add event handlers for element
	// Defined in D3 see https://github.com/d3/d3-selection/blob/master/src/selection/on.js
	var eventHandlers = element.node().__on;
	if(eventHandlers && eventHandlers.length > 0) {
		this.storedEventHandlers.push({
			templatePath: new TemplatePath(element),
			eventHandlers: eventHandlers
		});
	}

	// Add event handlers for direct children (recursively)
	var self = this;
	element.selectAll(ALL_DIRECT_CHILDREN).each(function() {
		var childElement = select(this);
		self.storeEventHandlers(childElement);
	});
};

// Apply event handlers onto specified elements (which where created by joining data)
GroupingNode.prototype.applyEventHandlers = function(elements) {
	this.storedEventHandlers.forEach(function(storedEventHandler) {
		var selection = storedEventHandler.templatePath.resolve(elements);
		var eventHandlers = storedEventHandler.eventHandlers;
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
GroupingNode.prototype.renderNodes = function(templateElements, transition) {
	var childElements = templateElements.selectAll(ALL_DIRECT_CHILDREN);
	this.childNodes.forEach(function(childNode) {
		childNode.render(childElements, transition);
	});

	return this;
};

// ---- RepeatNode class ----
// I am a GroupingNode and I create DOM trees based on repeatable
// data (meaning an Array of values).
//
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
		return GroupingNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ? [ d ] : [];
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
		return [ GroupingNode.prototype.getDataFunction.call(self).call(node, d, i, nodes) ];
	};
};

// ---- ImportNode class ----
// I am a GroupingNode and I create DOM trees based on another
// template which I import AND an object's property value
// (just like a WithNode).
//
// Implementation: I do not have a fixed (child) element to
// import. The child element is regarded as a data function
// which results in a selector for specifying the right
// template.
export function ImportNode(element, dataFunction, childElement) {
	GroupingNode.call(this, element, dataFunction, childElement);
}
ImportNode.prototype = Object.create(GroupingNode.prototype);
ImportNode.prototype.constructor = ImportNode;

// ---- ImportNode instance methods ----
// Answer a data function (same as for WithNode) for applying an enter-update-exit pattern
ImportNode.prototype.getDataFunction = WithNode.prototype.getDataFunction;

// Answer the data function for regular usage (see explanation above)
ImportNode.prototype.getRegularDataFunction = GroupingNode.prototype.getDataFunction;

// Answer the actual child element (based on the specified root element)
ImportNode.prototype.getChildElement = function(rootElement) {

	// The childElement instance variable contains either the selection or a selector
	var childElementOrSelector = this.childElement.call(rootElement.node(), rootElement.datum(), 0, rootElement.nodes());
	return childElementOrSelector.selectAll ? childElementOrSelector : select(childElementOrSelector);
};

// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
ImportNode.prototype.joinData = function(rootElement) {

	// Handle element for element allowing each to have its own
	// child element imported.
	var self = this;
	this.resolveTemplateElements(rootElement).each(function() {
		var element = select(this);
		GroupingNode.prototype.joinData.call(self, element);
	});
};

// Render data onto the template
ImportNode.prototype.render = function(rootElement, transition) {

	// Delegate the rendering to the child elements (the imported templates)
	var self = this;
	var templateElements = this.resolveTemplateElements(rootElement);
	templateElements.select(function() { return this.firstElementChild; }).each(function() {
		var element = select(this);

		// Bind the transition (if applicable)
		if(transition) {
			element = element.transition(transition);
		}

		// Render the imported template
		element.render(self.getRegularDataFunction());
	});
};
