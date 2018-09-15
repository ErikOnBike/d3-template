import { select } from "d3-selection";
import { TemplatePath } from "./template-path";
import { RootNode, RepeatNode, IfNode, WithNode } from "./template-node";
import { FieldParser } from "./field-parser";
import { namedRenderFilters, AttributeRenderer, StyleRenderer, PropertyRenderer, TextRenderer } from "./renderer";

// Defaults
var defaults = {
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
var ELEMENT_SELECTOR_ATTRIBUTE = "data-d3t7s";
var SCOPE_BOUNDARY_CLASS = "d3t7s";
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
		var rootElement = select(this);

		// Create a template root node for the element
		var rootNode = new RootNode(Template.createTemplatePath(rootElement, "."));

		// Create template using specified identification mechanism
		var template = new Template(rootNode, options);

		// Add renderers so template can be rendered when data is provided
		template.addRenderers(rootElement, rootNode);

		// Store template 
		var templateSelector = rootElement.attr(ELEMENT_SELECTOR_ATTRIBUTE);
		templates[templateSelector] = template;
	});

	return selection;
}

// Render data on receiver (ie, a selection or transition since this method will be added to the d3 selection and transition prototypes)
export function selection_render(data) {
	return render(this, data);
}

// Render data on specified selection (selection should consist of a template)
export function render(selectionOrTransition, data) {

	// Render templates in the current selection
	var transition = selectionOrTransition.duration !== undefined ? selectionOrTransition : null;
	selectionOrTransition.each(function() {
		var element = select(this);

		// Retrieve template for element
		var templateSelector = element.attr(ELEMENT_SELECTOR_ATTRIBUTE);
		if(!templateSelector) {
			throw new Error("Method render() called on non-template selection.");
		}
		var template = templates[templateSelector];

		// Join data and render on root (will render data on children as well)
		element.datum(data);
		template.rootNode.joinData(element);
		template.rootNode.render(element, transition);
	});

	return selectionOrTransition;
}

// Template class
export function Template(rootNode, options) {
	this.rootNode = rootNode;
	this.options = options;
}

// Class methods
// Answer a new TemplatePath instance for the supplied selector and filter
var fieldParser = new FieldParser();
Template.createTemplatePath = function(element, fieldSelectorAndFilters) {

	// Parse field selector and (optional) filters
	var parseResult = fieldParser.parse(fieldSelectorAndFilters);
	if(parseResult.value === undefined) {
		throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": " + parseResult.errorCode);
	} else if(parseResult.index !== fieldSelectorAndFilters.length) {
		throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": EXTRA_CHARACTERS");
	}

	return new TemplatePath(Template.generateUniqueSelector(element), Template.createDataFunction(parseResult.value));
};

// Instance methods
// Add renderers for the specified element to specified owner
Template.prototype.addRenderers = function(element, owner) {

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
			Template.createTemplatePath(element, group.match[1]),
			childElement
		);
		owner.addChildNode(groupRenderer);

		// Remove group attribute
		element.attr(group.attr, null);

		// Mark element as scope boundary
		element.classed(SCOPE_BOUNDARY_CLASS, true);

		// Add renderers for the group element's child (the group renderer is the owner)
		if(childElement.size() === 1) {
			this.addRenderers(childElement, groupRenderer);

			// Add event handlers to the group renderer
			// (At this point any (sub)groups of childElement are removed, so childElement is 'clean')
			this.copyEventHandlers(childElement, groupRenderer);
		}
	}
};

// Copy all event handlers of element (and its children) to the groupRenderer
Template.prototype.copyEventHandlers = function(element, groupRenderer) {

	// Add event handlers from element (root node)
	var eventHandlers = element.node()[EVENT_HANDLERS];
	if(eventHandlers && eventHandlers.length > 0) {
		var selector = Template.generateUniqueSelector(element);
		groupRenderer.addEventHandlers(selector, eventHandlers);
	}

	// Add event handlers for direct children (recursively)
	var self = this;
	element.selectAll(function() { return this.children; }).each(function() {
		var childElement = select(this);
		self.copyEventHandlers(childElement, groupRenderer);
	});
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
				Template.createTemplatePath(element, match[1]),
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
				Template.createTemplatePath(element, match[1])
			));

			// Remove field selector from text node
			element.text(null);
		}
	}
};

// Answer a d3 data function for specified field selector
Template.createDataFunction = function(parseFieldResult) {
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
};

// Generate a unique selector within group scope (this selector might be copied into siblings for repeating groups, so uniqueness is not absolute)
var selectorIdCounter = 0;
Template.generateUniqueSelector = function(element) {

	// Check for presence of selector id
	var selectorId = element.attr(ELEMENT_SELECTOR_ATTRIBUTE);

	if(!selectorId) {

		// Add new id and set template class
		selectorId = "_" + selectorIdCounter.toString(36) + "_";
		selectorIdCounter++;
		element.attr(ELEMENT_SELECTOR_ATTRIBUTE, selectorId);
	}

	// Answer the selector
	return "[" + ELEMENT_SELECTOR_ATTRIBUTE + "=\"" + selectorId + "\"]";
};
