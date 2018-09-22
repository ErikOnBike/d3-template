import { select } from "d3-selection";
import { TemplateNode, RepeatNode, IfNode, WithNode, ImportNode } from "./template-node";
import { FieldParser } from "./field-parser";
import { namedRenderFilters, AttributeRenderer, StyleRenderer, PropertyRenderer, TextRenderer } from "./renderer";

// ---- Defaults ----
var defaults = {
	repeatAttribute: "data-repeat",
	ifAttribute: "data-if",
	withAttribute: "data-with",
	importAttribute: "data-import"
};

// ---- Constants ----
var FIELD_SELECTOR_REG_EX = /^\s*\{\{\s*(.*)\s*\}\}\s*$/u;
var ATTRIBUTE_REFERENCE_REG_EX = /^data-attr-(.*)$/u;
var STYLE_REFERENCE_REG_EX = /^data-style-(.*)$/u;
var PROPERTY_REFERENCE_REG_EX = /^data-prop-(.*)$/u;
var ALL_DIRECT_CHILDREN = function() { return this.children; };
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


// ---- Main functions ----
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

		if(!Template.isTemplate(rootElement)) {

			// Create a template root node for the element
			var rootNode = new TemplateNode(rootElement);

			// Create template using specified identification mechanism
			var template = new Template(rootNode, options);

			// Add renderers so template can be rendered when data is provided
			template.addNodesAndRenderers(rootElement, rootNode);

			// Store template in DOM node
			this.__d3t7__ = template;
		}
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
		if(!Template.isTemplate(element)) {
			throw new Error("Method render() called on non-template selection.");
		}
		var template = this.__d3t7__;

		// Join data and render template
		template
			.joinData(element, data)
			.render(element, transition)
		;
	});

	return selectionOrTransition;
}

// ---- Template class ----
export function Template(rootNode, options) {
	this.rootNode = rootNode;
	this.options = options;
}

// ---- Template class methods ----
// Answer whether specified element is a template
Template.isTemplate = function(element) {
	var node = element.node();
	return node.__d3t7__ && node.__d3t7__.render;
};

// Answer a fixed (ie non live) list of attributes for the specified element
Template.getAttributesFor = function(element) {
	var attributes = [];
	if(element.node().hasAttributes()) {
		var attributeMap = element.node().attributes;
		for(var i = 0; i < attributeMap.length; i++) {
			var name = attributeMap[i].name;
			var localName;
			var prefix;
			var separatorIndex = name.indexOf(":");
			if(separatorIndex >= 0) {
				prefix = name.slice(0, separatorIndex);
				localName = name.slice(separatorIndex + 1);
			} else {
				prefix = undefined;
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

	return attributes;
};

// Answer a new data function based on the specified field selector and optional filter(s)
var fieldParser = new FieldParser();
Template.createDataFunction = function(fieldSelectorAndFilters) {

	// Temporary code follows
	if(fieldSelectorAndFilters.fieldSelectors) {

		var parsedField = fieldSelectorAndFilters;
		var fieldSelectors = parsedField.fieldSelectors;
		var filterReferences = parsedField.filterReferences;

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
	} else {
		// Parse field selector and (optional) filters
		var parseResult = fieldParser.parse(fieldSelectorAndFilters);
		if(parseResult.value === undefined) {
			throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": " + parseResult.errorCode);
		} else if(parseResult.index !== fieldSelectorAndFilters.length) {
			throw new SyntaxError("Failed to parse field selector and/or filter <" + fieldSelectorAndFilters + "> @ " + parseResult.index + ": EXTRA_CHARACTERS");
		}

		// Recursive call (only temporary here)
		return Template.createDataFunction(parseResult.value);
	}
};

// ---- Template instance methods ----
// Join data onto receiver
Template.prototype.joinData = function(rootElement, data) {
	rootElement.datum(data);
	this.rootNode.joinData(rootElement);

	return this;
};

// Render data onto receiver
Template.prototype.render = function(rootElement, transition) {
	this.rootNode.render(rootElement, transition);

	return this;
};

// Add renderers for the specified element to specified parent node
Template.prototype.addNodesAndRenderers = function(element, parentNode) {

	// Validate templates do not overlap
	if(Template.isTemplate(element)) {
		throw new Error("Templates should not overlap. Use 'import' here.");
	}

	// Add template nodes for groupings and renderers for attributes and text (order is important!)
	this.addGroupingNodes(element, parentNode);
	this.addAttributeRenderers(element, parentNode);
	this.addTextRenderers(element, parentNode);

	// Process all direct children recursively
	var self = this;
	element.selectAll(ALL_DIRECT_CHILDREN).each(function() {
		var childElement = select(this);
		self.addNodesAndRenderers(childElement, parentNode);
	});
};

// Add grouping nodes (like repeat, if, with or import) for the specified element to specified parent node
Template.prototype.addGroupingNodes = function(element, parentNode) {

	// Handle grouping nodes
	var groupings = [
		{ attr: this.options.repeatAttribute, nodeClass: RepeatNode, match: false },
		{ attr: this.options.ifAttribute, nodeClass: IfNode, match: false },
		{ attr: this.options.withAttribute, nodeClass: WithNode, match: false },
		{ attr: this.options.importAttribute, nodeClass: ImportNode, match: false }
	];
	var withGrouping = groupings[2];
	var importGrouping = groupings[3];

	// Collect grouping node info from element
	groupings.forEach(function(grouping) {
		var field = element.attr(grouping.attr);
		if(field) {
			grouping.match = field.match(FIELD_SELECTOR_REG_EX);
		}
	});

	// Validate there is 0 or 1 match (handle import separately)
	groupings = groupings.filter(function(grouping) { return grouping !== importGrouping && grouping.match; });
	if(groupings.length > 1) {
		throw new Error("A repeat, if or with grouping can't be combined on same element. Wrap one in the other.");
	}

	// Handle import specifically
	// Import can only be combined with the with-grouping. If with-grouping is present 
	// use its data function for the import (or otherwise the default pass through data
	// function).
	if(importGrouping.match) {
		if(groupings.length === 1 && !withGrouping.match) {
			throw new Error("A repeat or if grouping can't be combined with import on the same element. Wrap one in the other.");
		}
		if(element.node().children.length > 0) {
			throw new Error("No child elements allowed within an import grouping.");
		}
		if(element.text().trim().length !== 0) {
			throw new Error("No text allowed within an import grouping.");
		}

		// Set groupings to only contain the import grouping
		importGrouping.importSelector = importGrouping.match[1];
		importGrouping.match = withGrouping.match ? withGrouping.match : [ "{{.}}", "." ];
		groupings = [ importGrouping ];
	}

	// Handle grouping
	if(groupings.length === 1) {

		// Select and extract first child as the grouping element
		var childElement = element
			.select(function() { return this.firstElementChild; })
				.remove()
		;

		// Text should be wrapped inside element
		if(childElement.size() === 0 && element.text().trim().length !== 0) {
			throw new Error("A child element should be present within repeat, if or with grouping. Wrap text in a DOM element.");
		}

		// Additional children are not allowed
		if(element.node().children.length > 0) {
			throw new Error("Only a single child element allowed within repeat, if or with grouping. Wrap child elements in a container element.");
		}

		// Set child element to the child element selector in case of import
		// For import there can't be a child so it is okay to 'overwrite' it.
		if(importGrouping.importSelector) {
			childElement = Template.createDataFunction(importGrouping.importSelector);
		}

		// Add grouping nodes
		var grouping = groupings[0];
		var groupingNode = new grouping.nodeClass(
			element,
			Template.createDataFunction(grouping.match[1]),
			childElement
		);
		parentNode.addChildNode(groupingNode);

		// Remove grouping attribute(s)
		element.attr(grouping.attr, null);
		if(withGrouping.match) {
			element.attr(withGrouping.attr, null);
		}

		// Add template nodes and renderers for the grouping element's child (except for import)
		if(!importGrouping.importSelector) {
			if(childElement.size() === 1) {
				this.addNodesAndRenderers(childElement, groupingNode);

				// Store event handlers in the grouping node (it will be used there).
				// This is only relevant for childElement since it is removed
				// from the DOM and will later be 'created' again during a data join.
				// Because the child might be (re)created multiple times (in a repeat)
				// through a 'clone' operation, the event handlers will be lost.
				// Storing these explictly will allow the event handlers to be
				// present on all child elements.
				// At this point any (sub)groupings of childElement are removed,
				// so childElement is 'cleaned' from further child elements from
				// another grouping and events will be stored only once.
				groupingNode.storeEventHandlers(childElement);
			}
		}
	}
};

// Add attribute renderers (include attributes referring to style properties) for the specified element to specified parent node
Template.prototype.addAttributeRenderers = function(element, parentNode) {

	// Create a fixed (ie non live) list of attributes
	// (since attributes will be removed during processing)
	var attributes = Template.getAttributesFor(element);
	
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
			parentNode.addRenderer(new renderClass(
				element,
				Template.createDataFunction(match[1]),
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

// Add text renderers for the specified element to specified parent node
Template.prototype.addTextRenderers = function(element, parentNode) {

	// Handle text nodes (no other children allowed on these elements)
	if(element.node().children.length === 0) {

		// Check if field selector is present
		var text = element.text();
		var match = text.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Add renderer
			var textRenderer = new TextRenderer(element, Template.createDataFunction(match[1]));
			parentNode.addRenderer(textRenderer);

			// Remove field selector from text node
			element.text(null);
		}
	}
};
