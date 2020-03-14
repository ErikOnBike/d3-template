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

	// Add receiver to root element (if none is present yet)
	if(!rootElement.property("__d3t7tn__")) {
		rootElement.property("__d3t7tn__", this);
	}
}

// ---- TemplateNode class methods ----
// Answer whether specified element (singular) is a template node
TemplateNode.isTemplateNode = function(element) {
	var node = element.node();
	return !!node.__d3t7tn__;
};

// Retrieve closest template node element of the specified DOM element (singular)
// going higher up the DOM tree (ie only current element and parents are searched for).
// If no template node is present null will be answered.
TemplateNode.getTemplateNode = function(element) {
	var node = element.node();
	while(node && !node.__d3t7tn__) {
		node = node.parentNode;
	}
	return node ? node.__d3t7tn__ : null;
};

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

// Apply specified event handlers onto the selection or nodes
TemplateNode.applyEventHandlersToSelection = function(eventHandlers, selectionOrNodes) {

	// Sanity check
	if(!eventHandlers || eventHandlers.length === 0) {
		return;
	}

	// Apply the events
	var selection = selectionOrNodes.selectAll ? selectionOrNodes : select(selectionOrNodes);
	eventHandlers.forEach(function(eventHandler) {
		var typename = eventHandler.type;
		if(eventHandler.name) {
			typename += "." + eventHandler.name;
		}
		selection.on(typename, eventHandler.value, eventHandler.capture);
	});
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

// Render data onto the template
TemplateNode.prototype.renderData = function(data, element, transition) {
	element.datum(data);
	this
		.joinData(element)
		.render(element, transition)
	;

	return this;
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

// Render attributes and text as well as child nodes using existing datum/data
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

// ---- GroupingNode class methods ----
// Answer a clone of the specified childNode
GroupingNode.cloneChildNode = function(childNode) {

	// Clone the child element
	var clonedNode = childNode.cloneNode(true);

	// Remove its id for uniqueness
	clonedNode.removeAttribute("id");

	return clonedNode;
};

// ---- GroupingNode instance methods ----
// Answer the data function of the receiver
GroupingNode.prototype.getDataFunction = function() {
	return this.dataFunction;
};

// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
GroupingNode.prototype.joinData = function(rootElement) {

	// Sanity check
	if(this.childElement.size() === 0) {
		return this;
	}

	// Create DOM structure
	var updatedElements = this.createDOMStructure(rootElement, function() {

		// Clone the child element
		var childNode = this.childElement.node();
		var clonedNode = GroupingNode.cloneChildNode(childNode);

		// Copy the TemplateNodes onto the clone
		if(childNode.__d3t7tn__) {
			clonedNode.__d3t7tn__ = childNode.__d3t7tn__;
		}
		var childNodes = this.childNodes;
		select(clonedNode).selectAll("[" + ELEMENT_BOUNDARY_ATTRIBUTE + "]").each(function(d, i) {
			this.__d3t7tn__ = childNodes[i];
		});

		return clonedNode;
	});

	// Update data of children (both new and updated)
	updatedElements.each(function() {

		// Elements receive data in root by enter/append above so don't provide data
		TemplateNode.copyDataToChildren(this);
	});

	// Join data on newly created childs
	if(updatedElements.size() > 0) {
		this.childNodes.forEach(function(childNode) {
			childNode.joinData(updatedElements);
		});
	}

	return this;
};

// Create the DOM structure for the receiver and answer the updated DOM nodes (elements) as selection
// The parameter createChildNode is a function responsible for creating a new child node.
// It will and should be called repeatedly since childs can be different elements based on their data value.
// `this` is set to the receiver when calling the createChildNode function.
GroupingNode.prototype.createDOMStructure = function(rootElement, createChildNode) {

	// Join data onto DOM
	var joinedElements = this.resolveTemplateElements(rootElement)
		.selectAll(ALL_DIRECT_CHILDREN)
			.data(this.getDataFunction())
	;

	// Add new elements
	var self = this;
	var newElements = joinedElements
		.enter()
			.append(function() {
				return createChildNode.call(self);
			})
	;

	// Add event handlers to new elements
	this.applyEventHandlers(newElements);

	// Remove superfluous elements
	joinedElements
		.exit()
			.remove()
	;

	// Answer the new and updated elements
	return newElements.merge(joinedElements);
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

	return this;
};

// Apply event handlers onto specified elements (which where created by joining data)
GroupingNode.prototype.applyEventHandlers = function(elements) {

	// Validate there are elements to apply the event handlers on
	if(elements.size() === 0) {
		return this;
	}

	// Apply event handlers
	this.storedEventHandlers.forEach(function(storedEventHandler) {
		var selection = storedEventHandler.templatePath.resolve(elements);
		var eventHandlers = storedEventHandler.eventHandlers;
		TemplateNode.applyEventHandlersToSelection(eventHandlers, selection);
	});

	return this;
};

// Render data onto the child nodes of the template
GroupingNode.prototype.renderNodes = function(templateElements, transition) {
	var childElements = templateElements.selectAll(ALL_DIRECT_CHILDREN);
	if(childElements.size() > 0) {
		this.childNodes.forEach(function(childNode) {
			childNode.render(childElements, transition);
		});
	}

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

// Join data onto the receiver (using rootElement as base for selecting the DOM elements)
ImportNode.prototype.joinData = function(rootElement) {

	// Handle element for element allowing each to have its own child element imported
	var self = this;
	this.resolveTemplateElements(rootElement).each(function(d, i, nodes) {

		// Retrieve element and child element
		var element = select(this);
		var childElementOrSelector = self.childElement.call(this, d, i, nodes);
		var childElement = childElementOrSelector.selectAll ? childElementOrSelector : select(childElementOrSelector);
		var childNode = childElement.node();
		var templateNode = childNode.__d3t7tn__;

		// If imported template has changed, remove current child(ren)
		// (a new one will be created when the DOM structure is created)
		if(this.firstElementChild && this.firstElementChild.__d3t7tn__ !== templateNode) {
			this.removeChild(this.firstElementChild);
		}

		// Create the DOM structure
		var importedElement = self.createDOMStructure(element, function() {

			// Clone the child element
			var clonedNode = GroupingNode.cloneChildNode(childNode);

			// Copy the TemplateNodes onto the clone
			clonedNode.__d3t7tn__ = templateNode;
			var childNodes = templateNode.childNodes;
			select(clonedNode).selectAll("[" + ELEMENT_BOUNDARY_ATTRIBUTE + "]").each(function(d, i) {
				this.__d3t7tn__ = childNodes[i];
			});

			// Copy the event handlers
			TemplateNode.applyEventHandlersToSelection(childNode.__on, clonedNode);
			var allChildrenNodes = select(childNode).selectAll("*").nodes();
			var allClonedChildrenNodes = select(clonedNode).selectAll("*").nodes();
			allChildrenNodes.forEach(function(childNode, i) {
				TemplateNode.applyEventHandlersToSelection(childNode.__on, allClonedChildrenNodes[i]);
			});

			return clonedNode;
		});

		// Join data on the newly created structure
		if(importedElement.size() > 0) {
			templateNode.joinData(importedElement);
		}
	});

	return this;
};

// Render data onto the template
ImportNode.prototype.render = function(rootElement, transition) {

	// Delegate the rendering to the child elements (the imported templates)
	this.resolveTemplateElements(rootElement).each(function() {

		// Render the imported template
		var importedNode = this.firstElementChild;
		var importedElement = select(importedNode);
		var templateNode = importedNode.__d3t7tn__;
		templateNode.render(importedElement, transition);
	});

	return this;
};
