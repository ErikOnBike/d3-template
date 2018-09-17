// TemplatePath class
export function TemplatePath(element, dataFunction) {
	this.element = element;
	this.dataFunction = dataFunction;
}

// Instance methods
// Answer the dataFunction of the receiver
TemplatePath.prototype.getDataFunction = function() {
	return this.dataFunction;
};
