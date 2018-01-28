import {select} from "d3-selection";
import {GroupRenderer, RepeatRenderer, IfRenderer, WithRenderer, AttributeRenderer, StyleRenderer, TextRenderer} from "./renderer";

// Defaults
var defaults = {
	elementSelectorAttribute: "data-template",
	repeatAttribute: "data-repeat",
	ifAttribute: "data-if",
	withAttribute: "data-with"
};

// Constants
var FIELD_SELECTOR_REG_EX = /^\s*\{\{\s*(.*)\s*\}\}\s*$/u;
var ATTRIBUTE_REFERENCE_REG_EX = /^data-attr-(.*)$/iu;
var STYLE_REFERENCE_REG_EX = /^data-style-(.*)$/iu;
var SCOPE_BOUNDARY = "__templateScope";
var EVENT_HANDLERS = "__on";

// Globals
var namedTemplates = {};

// Main functions

// Create template from the specified selection
export function template(selection, options) {
	return selection.template(options);
}

// Create template from receiver (this method will be added to the d3 selection prototype)
export function selection_template(options) {

	// Decide to use options or defaults
	options = Object.assign({}, defaults, options || {});

	// Create templates from the current selection
	this.each(function() {
		var element = select(this);

		// Create template using specified identification mechanism
		var template = new Template(options);

		// Generate unique selector so template can be referenced
		template.generateUniqueSelector(element);

		// Add renderers so template can be rendered when data is provided
		template.addRenderers(element, template);

		// Store template 
		var templateName = element.attr(options.elementSelectorAttribute);
		namedTemplates[templateName] = template;
	});

	return this;
}

// Render data on specified selection (selection should consist of a template)
export function render(selection, data, options) {
	return selection.render(data, options);
}

// Render data on receiver (ie, a selection since this method will be added to the d3 selection prototype)
export function selection_render(data, options) {

	// Decide to use options or defaults
	options = Object.assign({}, defaults, options || {});

	// Render templates in the current selection
	var transition = this.duration !== undefined ? this : null;
	this.each(function() {
		var element = select(this);

		// Retrieve template for element
		var templateName = element.attr(options.elementSelectorAttribute);
		if(!templateName) {
			throw new Error("Method render() called on non-template selection.");
		}
		var template = namedTemplates[templateName];

		// Render data on template
		template.render(data, element, transition);
	});

	return this;
}

// Template class
function Template(options) {
	this.options = options;
	this.renderers = [];
}

// Add renderers
Template.prototype.addRenderer = GroupRenderer.prototype.addRenderer;

// Render data on specified template element
Template.prototype.render = function(data, element, transition) {

	// Join data
	this.joinData(data, element);

	// Render data on element
	this.renderers.forEach(function(renderer) {
		renderer.render(element, transition);
	});
};

// Join data on template element(s)
Template.prototype.joinData = function(data, element) {

	// Set data on element
	element.datum(data);

	// Set data on all descendants (within root scope, remainder will be set by renderers)
	var copyDataToChildren = function(element) {
		element.selectAll(function() { return this.children; }).each(function() {
			var childElement = select(this);
			childElement.datum(data);
			if(!this[SCOPE_BOUNDARY]) {
				copyDataToChildren(childElement);
			}
		})
	};
	copyDataToChildren(element);
};

// Add renderers for the specified element to specified owner
Template.prototype.addRenderers = function(element, owner) {

	// Add renderers for groups, attributes and text (order is important!)
	this.addGroupRenderers(element, owner);
	this.addAttributeRenderers(element, owner);
	this.addTextRenderers(element, owner);

	// Process all direct children recursively
	var self = this;
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		self.addRenderers(childElement, owner);
	});
};

// Add group renderers (like repeat, if, with) for the specified element to specified owner
Template.prototype.addGroupRenderers = function(element, owner) {

	// Handle groups
	var groups = [
		{ attr: this.options.repeatAttribute, renderClass: RepeatRenderer, match: false },
		{ attr: this.options.ifAttribute, renderClass: IfRenderer, match: false },
		{ attr: this.options.withAttribute, renderClass: WithRenderer, match: false }
	];

	// Collect group info from element
	groups.forEach(function(group) {
		var field = element.attr(group.attr);
		if(field) {
			group.match = field.match(FIELD_SELECTOR_REG_EX);
		}
	});

	// Validate there is 0 or 1 match
	groups = groups.filter(function(group) { return group.match; });
	if(groups.length > 1) {
		throw new Error("A repeat, if or with grouping can't be combined on same element. Wrap one in the other.");
	}

	// Handle group
	if(groups.length === 1) {

		// Select and extract first child as the grouping element
		var childElement = element
			.select(function() { return this.firstElementChild; })
				.remove()
		;

		// Text should be wrapped inside element
		if(childElement.size() === 0 && element.text().trim().length !== 0) {
			throw new Error("A child element should be present within repeat, if or with group. Wrap text in a DOM element.");
		}

		// Additional children are not allowed
		if(element.selectAll("*").size() > 0) {
			throw new Error("Only a single child element allowed within repeat, if or with group. Wrap child elements in a container element.");
		}

		// Add group renderer
		var group = groups[0];
		var groupRenderer = new group.renderClass(
			group.match[1],
			this.generateUniqueSelector(element),
			childElement
		);
		owner.addRenderer(groupRenderer);

		// Remove group attribute
		element.attr(group.attr, null);

		// Mark element as scope boundary
		element.node()[SCOPE_BOUNDARY] = true;

		// Add renderers for the group element's child (the group renderer is the owner)
		if(childElement.size() === 1) {
			this.addRenderers(childElement, groupRenderer);

			// Add event handlers to the group renderer
			// (At this point any (sub)groups of childElement are removed, so childElement is 'clean')
			this.copyEventHandlers(childElement, groupRenderer);
		}
	}
};

// Add attribute renderers (include attributes referring to style properties) for the specified element to specified owner
Template.prototype.addAttributeRenderers = function(element, owner) {

	// Create a fixed (ie non live) list of attributes since attributes will be removed during processing
	var attributes = [];
	if(element.node().hasAttributes()) {
		var attributeMap = element.node().attributes;
		for(var i = 0; i < attributeMap.length; i++) {
			attributes.push({ name: attributeMap[i].name, value: attributeMap[i].value });
		}
	}
	
	// Handle attributes (and styles)
	var self = this;
	attributes.forEach(function(attribute) {

		// Check if field selector is present
		var match = attribute.value.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Decide which attribute/style will be rendered
			var isStyle = false;
			var renderAttributeName = attribute.name;
			var nameMatch = renderAttributeName.match(ATTRIBUTE_REFERENCE_REG_EX);
			if(nameMatch) {
				renderAttributeName = nameMatch[1];	// Render the referenced attribute
			} else {
				nameMatch = renderAttributeName.match(STYLE_REFERENCE_REG_EX);
				if(nameMatch) {
					renderAttributeName = nameMatch[1];	// Render the referenced style
					isStyle = true;
				}
			}

			// Add renderer
			var renderClass = isStyle ? StyleRenderer : AttributeRenderer;
			owner.addRenderer(new renderClass(
				match[1],
				self.generateUniqueSelector(element),
				renderAttributeName
			));

			// Remove attribute
			element.attr(attribute.name, null);
		}
	});
};

// Add text renderers for the specified element to specified owner
Template.prototype.addTextRenderers = function(element, owner) {

	// Handle text nodes (no other children allowed on these elements)
	if(element.node().children.length === 0) {

		// Check if field selector is present
		var text = element.text();
		var match = text.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Add renderer
			owner.addRenderer(new TextRenderer(
				match[1],
				this.generateUniqueSelector(element)
			));

			// Remove field selector from text node
			element.text(null);
		}
	}
};

// Generate a unique selector within group scope (this selector might be copied into sibblings for repeating groups, so uniqueness is not absolute)
var selectorIdCounter = 0;
Template.prototype.generateUniqueSelector = function(element) {

	// Check for presence of selector id
	var elementSelectorAttribute = this.options.elementSelectorAttribute;
	var selectorId = element.attr(elementSelectorAttribute);

	if(!selectorId) {

		// Add new id and set template class
		selectorId = "_" + selectorIdCounter.toString(36) + "_";
		selectorIdCounter++;
		element.attr(elementSelectorAttribute, selectorId);
	}

	// Answer the selector
	return "[" + elementSelectorAttribute + "=\"" + selectorId + "\"]";
};

// Copy all event handlers of element (and its children) to the groupRenderer
Template.prototype.copyEventHandlers = function(element, groupRenderer) {

	// Add event handlers from element (root node)
	var eventHandlers = element.node()[EVENT_HANDLERS];
	if(eventHandlers && eventHandlers.length > 0) {
		var selector = this.generateUniqueSelector(element);
		groupRenderer.addEventHandlers(selector, eventHandlers);
	}

	// Add event handlers for direct children (recursively)
	var self = this;
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		self.copyEventHandlers(childElement, groupRenderer);
	});
};
