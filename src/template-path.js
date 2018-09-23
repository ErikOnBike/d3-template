import { matcher } from "d3-selection";

// ---- Constants ----
var ELEMENT_SELECTOR_ATTRIBUTE = "data-d3t7s";

// ---- TemplatePath class ----
// I am a template path. I refer to elements within a template.
// Starting from a (parent/root) element in a template I can resolve
// the element I refer to. Since multiple copies of a template
// element can exist (through repeating groups) I might resolve
// to multiple elements. I am constructed from a single initial element
// within a template.
//
// Implementation: I give the initial element a specific identification.
// This identification is stored on the element as an attribute. This
// allows the element to be copied/cloned without losing the identifaction
// (which would happen if the identifaction is set as a property on the
// DOM node directly). I use the identification when resolving myself.
// Since the template elements I am referring to can be copied the
// resolving might occur on a single root element as well as multiple
// root elements.
export function TemplatePath(element) {
	this.selector = TemplatePath.generateUniqueSelector(element);
}

// ---- TemplatePath class methods ----
// Generate a unique selector for specified element
// or use existing if one is already present
// (this selector might be copied into siblings for repeat groupings,
// so uniqueness is not absolute)
var selectorIdCounter = 0;
TemplatePath.generateUniqueSelector = function(element) {

	// Check for presence of selector id
	var selectorId = element.attr(ELEMENT_SELECTOR_ATTRIBUTE);

	if(!selectorId) {

		// Add new id and set template class
		selectorId = selectorIdCounter.toString(36);
		selectorIdCounter++;
		element.attr(ELEMENT_SELECTOR_ATTRIBUTE, selectorId);
	}

	// Answer the selector
	return "[" + ELEMENT_SELECTOR_ATTRIBUTE + "=\"" + selectorId + "\"]";
};

// ---- TemplatePath instance methods ----
// Answer the elements the receiver refers to (based on a root element)
TemplatePath.prototype.resolve = function(rootElement) {

	// The resulting element is either the root element itself or child(ren) of the root element
	var selection = rootElement.filter(matcher(this.selector));
	if(selection.size() === 0) {
		selection = rootElement.selectAll(this.selector);
	}
	return selection;
};
