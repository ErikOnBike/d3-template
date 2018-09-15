import { matcher } from "d3-selection";

// TemplatePath class
export function TemplatePath(selector, dataFunction) {
	this.selector = selector;
	this.dataFunction = dataFunction;
}

// Instance methods
// Answer the element the receiver refers to (from a root element)
TemplatePath.prototype.getElementIn = function(rootElement) {

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
