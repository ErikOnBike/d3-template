import { matcher } from "d3-selection";

// Constants
var ELEMENT_SELECTOR_ATTRIBUTE = "data-d3t7s";

// ---- TemplatePath class ----
// I am a template path and can resolve to a selection based on a
// root element provided. I am constructed from an initial element
// which I give a specific identification. I use this identification
// when resolving myself. Since the template elements I am referring
// to can be copied, I need to be resolved based on a root element.
export function TemplatePath(element, dataFunction) {
	this.selector = TemplatePath.generateUniqueSelector(element);
	this.dataFunction = dataFunction;
}

// ---- TemplatePath class methods ----
// Generate a unique selector for specified element (this selector might be copied into siblings for repeat groupings, so uniqueness is not absolute)
var selectorIdCounter = 0;
TemplatePath.generateUniqueSelector = function(element) {

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

// @@
TemplatePath.selector = function(element) {
	return element.attr(ELEMENT_SELECTOR_ATTRIBUTE);
};

// ---- TemplatePath instance methods ----
// Answer the selection the receiver refers to (from a root element)
TemplatePath.prototype.resolve = function(rootElement) {

	// The resulting element is either the root element itself or child(ren) of the root element
	var selection = rootElement.filter(matcher(this.selector));
	if(selection.size() === 0) {
		selection = rootElement.selectAll(this.selector);
	}
	return selection;
};

// Answer the dataFunction of the receiver
TemplatePath.prototype.getDataFunction = function() {
	return this.dataFunction;
};
