import {select,matcher} from "d3-selection";
import {fieldParser, createDataFunction, AttributeRenderer, StyleRenderer, PropertyRenderer, TextRenderer} from "./renderer";

// Defaults
var defaults = {
	elementSelectorAttribute: "data-template",
	repeatAttribute: "data-repeat",
	ifAttribute: "data-if",
	withAttribute: "data-with",
	importAttribute: "data-import"
};

// Constants
var FIELD_SELECTOR_REG_EX = /^\s*\{\{\s*(.*)\s*\}\}\s*$/u;
var ATTRIBUTE_REFERENCE_REG_EX = /^data-attr-(.*)$/u;
var STYLE_REFERENCE_REG_EX = /^data-style-(.*)$/u;
var PROPERTY_REFERENCE_REG_EX = /^data-prop-(.*)$/u;
var SCOPE_BOUNDARY = "d3t7s";
var EVENT_HANDLERS = "__on";
var SVG_CAMEL_CASE_ATTRS = {};	// Combined SVG 1.1 and SVG 2 (draft 14 feb 2018)
[
	"attributeName",
	"attributeType",
	"baseFrequency",
	"baseProfile",
	"calcMode",
	"clipPathUnits",
	"contentScriptType",
	"contentStyleType",
	"diffuseConstant",
	"edgeMode",
	"externalResourcesRequired",
	"filterRes",
	"filterUnits",
	"glyphRef",
	"gradientTransform",
	"gradientUnits",
	"hatchContentUnits",
	"hatchUnits",
	"kernelMatrix",
	"kernelUnitLength",
	"keyPoints",
	"keySplines",
	"keyTimes",
	"lengthAdjust",
	"limitingConeAngle",
	"markerHeight",
	"markerUnits",
	"markerWidth",
	"maskContentUnits",
	"maskUnits",
	"numOctaves",
	"pathLength",
	"patternContentUnits",
	"patternTransform",
	"patternUnits",
	"pointsAtX",
	"pointsAtY",
	"pointsAtZ",
	"preserveAlpha",
	"preserveAspectRatio",
	"primitiveUnits",
	"refX",
	"refY",
	"repeatCount",
	"repeatDur",
	"requiredExtensions",
	"requiredFeatures",
	"specularConstant",
	"specularExponent",
	"spreadMethod",
	"startOffset",
	"stdDeviation",
	"stitchTiles",
	"surfaceScale",
	"systemLanguage",
	"tableValues",
	"targetX",
	"targetY",
	"textLength",
	"viewBox",
	"viewTarget",
	"xChannelSelector",
	"yChannelSelector",
	"zoomAndPan"
].forEach(function(attributeName) {
	SVG_CAMEL_CASE_ATTRS[attributeName.toLowerCase()] = attributeName;
});


// Globals
var templates = {};

// Main functions

// Create template from receiver (this method will be added to the d3 selection prototype)
export function selection_template(options) {
	return template(this, options);
}

// Create template from the specified selection
export function template(selection, options) {

	// Decide to use options or defaults
	options = Object.assign({}, defaults, options || {});

	// Create templates from the current selection
	selection.each(function() {
		var element = select(this);

		// Create template using specified identification mechanism
		var template = new Template(options);

		// Generate unique selector so template can be referenced
		template.generateUniqueSelector(element);

		// Add renderers so template can be rendered when data is provided
		template.addRenderers(element, template);

		// Store template 
		var templateSelector = element.attr(options.elementSelectorAttribute);
		templates[templateSelector] = template;
	});

	return selection;
}

// Render data on receiver (ie, a selection or transition since this method will be added to the d3 selection and transition prototypes)
export function selection_render(data, options) {
	return render(this, data, options);
}

// Render data on specified selection (selection should consist of a template)
export function render(selectionOrTransition, data, options) {

	// Decide to use options or defaults
	options = Object.assign({}, defaults, options || {});

	// Render templates in the current selection
	var transition = selectionOrTransition.duration !== undefined ? selectionOrTransition : null;
	selectionOrTransition.each(function() {
		var element = select(this);

		// Retrieve template for element
		var templateSelector = element.attr(options.elementSelectorAttribute);
		if(!templateSelector) {
			throw new Error("Method render() called on non-template selection.");
		}
		var template = templates[templateSelector];

		// Render data on template
		template.render(data, element, transition);
	});

	return selectionOrTransition;
}

// Template class
function Template(options) {
	this.options = options;
	this.childElements = [];
	this.renderers = [];
}

// Class methods
// Join data on template element(s)
Template.joinData = function(data, element) {

	// Set data on element
	element.datum(data);

	// Set data on all descendants (within root scope, remainder will be set by renderers)
	if(!element.classed(SCOPE_BOUNDARY)) {
		element.selectAll(function() { return this.children; }).each(function() {
			Template.joinData(data, select(this));
		});
	}
};

// Instance methods
// Render data on specified template element
Template.prototype.render = function(data, element, transition) {

	// Join data
	Template.joinData(data, element);

	// Join data on child elements (creating DOM in the process)
	this.childElements.forEach(function(childElement) {
		childElement.joinData(element);
	});

	// Render data on element
	this.renderers.forEach(function(renderer) {
		renderer.render(element, transition);
	});
	this.childElements.forEach(function(childElement) {
		childElement.render(element, transition);
	});
};

// Add renderers for the specified element to specified owner
Template.prototype.addRenderers = function(element, owner) {

	// First handle importing/cloning a DOM element
	this.performImport(element);

	// Add renderers for groups, attributes and text (order is important!)
	this.addTemplateElements(element, owner);
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
Template.prototype.addTemplateElements = function(element, owner) {

	// Handle groups
	var groups = [
		{ attr: this.options.repeatAttribute, renderClass: RepeatNode, match: false },
		{ attr: this.options.ifAttribute, renderClass: IfNode, match: false },
		{ attr: this.options.withAttribute, renderClass: WithNode, match: false }
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
		if(element.node().children.length > 0) {
			throw new Error("Only a single child element allowed within repeat, if or with group. Wrap child elements in a container element.");
		}

		// Add group renderer
		var group = groups[0];
		var groupRenderer = new group.renderClass(
			group.match[1],
			this.generateUniqueSelector(element),
			childElement
		);
		owner.addChildElement(groupRenderer);

		// Remove group attribute
		element.attr(group.attr, null);

		// Mark element as scope boundary
		element.classed(SCOPE_BOUNDARY, true);

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
			var name = attributeMap[i].name;
			var localName;
			var prefix = undefined;
			var separatorIndex = name.indexOf(":");
			if(separatorIndex >= 0) {
				prefix = name.slice(0, separatorIndex);
				localName = name.slice(separatorIndex + 1);
			} else {
				localName = name;
			}
			attributes.push({
				prefix: prefix,
				localName: localName,
				name: name,
				value: attributeMap[i].value
			});
		}
	}
	
	// Handle attributes (and styles)
	var self = this;
	attributes.forEach(function(attribute) {

		// Check if field selector is present
		var match = attribute.value.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Decide which attribute/style will be rendered
			var renderClass = AttributeRenderer;
			var renderAttributeName = attribute.localName;
			var nameMatch = renderAttributeName.match(ATTRIBUTE_REFERENCE_REG_EX);
			if(nameMatch) {
				renderAttributeName = nameMatch[1];	// Render the referenced attribute

				// Fix camel case for some SVG attribute names
				// data-* attributes are lowercase according to specification (also for SVG).
				// Remap these to there camelCase variant if applied on SVG element.
				if(element.node().ownerSVGElement !== undefined) {
					var camelCaseAttributeName = SVG_CAMEL_CASE_ATTRS[renderAttributeName];
					if(camelCaseAttributeName) {
						renderAttributeName = camelCaseAttributeName;
					}
				}
			} else {
				nameMatch = renderAttributeName.match(STYLE_REFERENCE_REG_EX);
				if(nameMatch) {
					renderAttributeName = nameMatch[1];	// Render the referenced style
					renderClass = StyleRenderer;
				} else {
					nameMatch = renderAttributeName.match(PROPERTY_REFERENCE_REG_EX);
					if(nameMatch) {
						renderAttributeName = nameMatch[1];	// Render the referenced property
						renderClass = PropertyRenderer;
					}
				}
			}

			// Re-apply namespace
			if(attribute.prefix) {
				renderAttributeName = attribute.prefix + ":" + renderAttributeName;
			}

			// Add renderer
			owner.addRenderer(new renderClass(
				match[1],
				self.generateUniqueSelector(element),
				renderAttributeName
			));

			// Remove attribute
			if(nameMatch && attribute.prefix) {
				// Special case: when attribute is indirect the namespace is not
				// recognised as such and needs to be removed as a normal attribute.
				element.node().removeAttribute(attribute.name);
			} else {
				element.attr(attribute.name, null);
			}
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

// Generate a unique selector within group scope (this selector might be copied into siblings for repeating groups, so uniqueness is not absolute)
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

// TemplateNode - Renders data to a repeating group of elements
function TemplateNode(fieldSelectorAndFilters, elementSelector, childElement) {

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
	this.childElements = [];
	this.renderers = [];
}

// Class methods
// Copy specified data onto all children of the element (recursively)
TemplateNode.copyDataToChildren = function(data, element) {
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		if(!childElement.classed(SCOPE_BOUNDARY)) {
			childElement.datum(data);
			TemplateNode.copyDataToChildren(data, childElement);
		}
	});
};

// Answer the element which should be rendered (indicated by the receivers elementSelector)
TemplateNode.prototype.getElement = function(templateElement) {

	// Element is either template element itself or child(ren) of the template element (but not both)
	var selection = templateElement.filter(matcher(this.elementSelector));
	if(selection.size() === 0) {
		selection = templateElement.select(this.elementSelector);
	}
	return selection;
};

// Answer the data function
TemplateNode.prototype.getDataFunction = function() {
	return this.dataFunction;
};

TemplateNode.prototype.joinData = function(templateElement) {

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
		TemplateNode.copyDataToChildren(data, childElement);
	});

	// Create child elements
	this.childElements.forEach(function(childElement) {
		childElement.joinData(childElements);
	});
};

TemplateNode.prototype.render = function(templateElement, transition) {

	// Render children
	var childElements = this.getElement(templateElement).selectAll(function() { return this.children; });
	this.renderers.forEach(function(childRenderer) {
		childRenderer.render(childElements, transition);
	});
	this.childElements.forEach(function(childElement) {
		childElement.render(childElements, transition);
	});
};

// Add event handlers for specified (sub)element (through a selector) to the receiver
TemplateNode.prototype.addEventHandlers = function(selector, eventHandlers) {
	var entry = this.eventHandlersMap[selector];
	this.eventHandlersMap[selector] = entry ? entry.concat(eventHandlers) : eventHandlers;
};

// Add child (template) elements to the receiver
TemplateNode.prototype.addChildElement = function(childElement) {
	this.childElements.push(childElement);
};

// Add renderers for child elements to the receiver
TemplateNode.prototype.addRenderer = function(renderer) {
	this.renderers.push(renderer);
};

// Answer whether receiver is TemplateNode
TemplateNode.prototype.isTemplateNode = function() {
	return true;
};

// RepeatNode - Renders data to a repeating group of elements
function RepeatNode(fieldSelector, elementSelector, childElement) {
	TemplateNode.call(this, fieldSelector, elementSelector, childElement);
}

RepeatNode.prototype = Object.create(TemplateNode.prototype);
RepeatNode.prototype.constructor = RepeatNode;

// IfNode - Renders data to a conditional group of elements
function IfNode(fieldSelector, elementSelector, childElement) {
	TemplateNode.call(this, fieldSelector, elementSelector, childElement);
}

IfNode.prototype = Object.create(TemplateNode.prototype);
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
function WithNode(fieldSelector, elementSelector, childElement) {
	TemplateNode.call(this, fieldSelector, elementSelector, childElement);
}

WithNode.prototype = Object.create(TemplateNode.prototype);
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

// Perform an import/clone of another DOM element (incl. its children)
Template.prototype.performImport = function(element) {

	// Handle import
	var importSelector = element.attr(this.options.importAttribute);
	if(importSelector) {

		// Validate there are no childs presents
		if(element.node().children.length > 0 || element.text().trim().length !== 0) {
			throw new Error("No child element or text allowed within elements with an \"import\".");
		}

		// Clone nodes of specified DOM element
		element
			.append(function() {
				var importElement = select(importSelector);
				if(importElement.size() !== 1) {
					throw new Error("Specified selector \"" + importSelector + "\" for \"import\" does not exist.");
				}
				return importElement.node().cloneNode(true);
			})
			.attr("id", null)	// Remove identity (if any) to prevent duplicate id's
		;
	}
};

// Add renderers
Template.prototype.addRenderer = TemplateNode.prototype.addRenderer;
Template.prototype.addChildElement = TemplateNode.prototype.addChildElement;

