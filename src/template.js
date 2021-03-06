import { select } from "d3-selection";
import { TemplateNode, RepeatNode, IfNode, WithNode, ImportNode } from "./template-node";
import { AttributeRenderer, StyleRenderer, PropertyRenderer, ClassRenderer, TextRenderer } from "./renderer";

// ---- Defaults ----
var defaults = {
	repeatAttribute: "data-repeat",
	ifAttribute: "data-if",
	withAttribute: "data-with",
	importAttribute: "data-import",
	indirectAttributePrefix: "data-attr-",
	indirectStylePrefix: "data-style-",
	indirectPropertyPrefix: "data-prop-",
	indirectClassPrefix: "data-class-"
};

// ---- Fix for IE (small kneefall because difficult to fix otherwise) ----
var REG_EX_FLAG = "";
/* istanbul ignore next */
try { if((new RegExp(".*", "u")).unicode) { REG_EX_FLAG = "u"; } } catch(e) { /* Ignore */ }

// ---- Constants ----
var FIELD_SELECTOR_REG_EX = new RegExp("^\\s*\\{\\{\\s*(.*)\\s*\\}\\}\\s*$", REG_EX_FLAG);
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

	// Store regular expressions for accessing indirect attributes
	options.indirectAttributeRegEx = new RegExp("^" + options.indirectAttributePrefix + "(.*)$", REG_EX_FLAG);
	options.indirectStyleRegEx = new RegExp("^" + options.indirectStylePrefix + "(.*)$", REG_EX_FLAG);
	options.indirectPropertyRegEx = new RegExp("^" + options.indirectPropertyPrefix + "(.*)$", REG_EX_FLAG);
	options.indirectClassRegEx = new RegExp("^" + options.indirectClassPrefix + "(.*)$", REG_EX_FLAG);

	// Create templates from the current selection
	selection.each(function() {
		var rootElement = select(this);

		// Check for existing template
		var templateNode = TemplateNode.getTemplateNode(rootElement);
		if(templateNode) {
			throw new Error("Templates should not overlap. Use 'import' here.");
		} else {

			// Create a template root node for the element
			var rootNode = new TemplateNode(rootElement);

			// Create template parser using specified identification mechanism
			var templateParser = new TemplateParser(options);

			// Add renderers to root node so template can be rendered when data is provided
			templateParser.parse(rootElement, rootNode);
		}
	});

	return selection;
}

// Render data on selection
export function selection_render(data) {
	return render(this, data);
}

// Render data on transition
export function transition_render(data) {
	var self = this;
	this.on("start.d3t7", function() {
		render(self, data);
	});
	return this;
}

// Render data on specified selection (selection should consist of a template)
// If selection consists of multiple elements, the same data is rendered on all
// elements.
export function render(selectionOrTransition, data) {

	// Render templates in the current selection
	var transition = selectionOrTransition.duration !== undefined ? selectionOrTransition : null;
	selectionOrTransition.each(function() {
		var element = select(this);

		// Validate that element is a template node (which can be rendered)
		if(!TemplateNode.isTemplateNode(element)) {
			throw new Error("Method render() called on non-template selection.");
		}

		// Retrieve template for element
		var templateNode = TemplateNode.getTemplateNode(element);

		// Join data and render template
		templateNode.renderData(data, element, transition);
	});

	return selectionOrTransition;
}

// ---- TemplateParser class ----
function TemplateParser(options) {
	this.options = options;
}

// ---- TemplateParser class methods ----
// Answer a fixed (ie non live) list of attributes for the specified element
TemplateParser.getAttributesFor = function(element) {
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

// Answer a data function based on the specified expression
TemplateParser.createDataFunction = function(expression) {

	// Check tags for data function
	var isTweenFunction = false;
	if(expression.startsWith("tween:")) {
		isTweenFunction = true;
		expression = expression.slice(6);
	}

	// Create data function
	var dataFunction;
	try {
		var functionBody = "return " + expression.trim();
		dataFunction = new Function("d", "i", "nodes", functionBody);
	} catch(e) {
		throw new Error("Invalid expression \"" + expression + "\". Error: " + e.message);
	}

	// Add tween indicator (if applicable)
	if(isTweenFunction) {
		dataFunction.isTweenFunction = true;
	}

	return dataFunction;
};

// ---- TemplateParser instance methods ----
// Parse template by adding template nodes and renderers for the specified element to specified template node
TemplateParser.prototype.parse = function(element, templateNode) {

	// Validate templates do not overlap
	if(TemplateNode.isTemplateNode(element) && TemplateNode.getTemplateNode(element) !== templateNode) {
		throw new Error("Templates should not overlap. Use 'import' here.");
	}

	// Add template nodes for groupings and renderers for attributes and text (order is important!)
	this.parseGroupingNodes(element, templateNode);
	this.parseAttributeRenderers(element, templateNode);
	this.parseTextRenderers(element, templateNode);

	// Process all direct children recursively
	var self = this;
	element.selectAll(ALL_DIRECT_CHILDREN).each(function() {
		var childElement = select(this);
		self.parse(childElement, templateNode);
	});
};

// Parse template by adding grouping nodes (like repeat, if, with or import) for the specified element to specified template node
TemplateParser.prototype.parseGroupingNodes = function(element, templateNode) {

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
		importGrouping.match = withGrouping.match ? withGrouping.match : [ "{{d}}", "d" ];
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
			childElement = TemplateParser.createDataFunction(importGrouping.importSelector);
		}

		// Add grouping nodes
		var grouping = groupings[0];
		var groupingNode = new grouping.nodeClass(
			element,
			TemplateParser.createDataFunction(grouping.match[1]),
			childElement
		);
		templateNode.addChildNode(groupingNode);

		// Remove grouping attribute(s)
		element.attr(grouping.attr, null);
		if(withGrouping.match) {
			element.attr(withGrouping.attr, null);
		}

		// Add template nodes and renderers for the grouping element's child (except for import)
		if(!importGrouping.importSelector) {
			if(childElement.size() === 1) {
				this.parse(childElement, groupingNode);

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

// Parse template by adding attribute renderers (include attributes referring to style properties) for the specified element to specified template node
TemplateParser.prototype.parseAttributeRenderers = function(element, templateNode) {

	// Create a fixed (ie non live) list of attributes
	// (since attributes will be removed during processing)
	var attributes = TemplateParser.getAttributesFor(element);
	
	// Handle attributes (and styles)
	var options = this.options;
	attributes.forEach(function(attribute) {

		// Check if field selector is present
		var match = attribute.value.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Decide which attribute/style will be rendered
			var renderClass = AttributeRenderer;
			var renderAttributeName = attribute.localName;
			var nameMatch = renderAttributeName.match(options.indirectAttributeRegEx);
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
				nameMatch = renderAttributeName.match(options.indirectStyleRegEx);
				if(nameMatch) {
					renderAttributeName = nameMatch[1];	// Render the referenced style
					renderClass = StyleRenderer;
				} else {
					nameMatch = renderAttributeName.match(options.indirectPropertyRegEx);
					if(nameMatch) {
						renderAttributeName = nameMatch[1];	// Render the referenced property
						renderClass = PropertyRenderer;
					} else {
						nameMatch = renderAttributeName.match(options.indirectClassRegEx);
						if(nameMatch) {
							renderAttributeName = nameMatch[1];	// Render the referenced class name
							renderClass = ClassRenderer;
						}
					}
				}
			}

			// Re-apply namespace
			if(attribute.prefix) {
				renderAttributeName = attribute.prefix + ":" + renderAttributeName;
			}

			// Add renderer
			templateNode.addRenderer(new renderClass(
				element,
				TemplateParser.createDataFunction(match[1]),
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

// Parse template by adding text renderers for the specified element to specified template node
TemplateParser.prototype.parseTextRenderers = function(element, templateNode) {

	// Handle text nodes (no other children allowed on these elements)
	if(element.node().children.length === 0) {

		// Check if field selector is present
		var text = element.text();
		var match = text.match(FIELD_SELECTOR_REG_EX);
		if(match) {

			// Add renderer
			var textRenderer = new TextRenderer(element, TemplateParser.createDataFunction(match[1]));
			templateNode.addRenderer(textRenderer);

			// Remove field selector from text node
			element.text(null);
		}
	}
};
