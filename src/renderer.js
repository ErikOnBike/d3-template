import { select } from "d3-selection";

// Globals
export var namedRenderFilters = {};

// Main function
export function renderFilter(name, filterFunc) {
	return renderFilterPrivate(name, filterFunc, false);
}

export function renderTweenFilter(name, tweenFilterFunc) {
	return renderFilterPrivate(name, tweenFilterFunc, true);
}

function renderFilterPrivate(name, filterFunc, isTweenFilter) {
	if(filterFunc === null) {
		delete namedRenderFilters[name];
	} else if(filterFunc === undefined) {
		return namedRenderFilters[name];
	} else {
		if(typeof filterFunc !== "function") {
			throw new Error("No function specified when registering renderFilter: " + name);
		}
		if(isTweenFilter) {
			filterFunc.isTweenFunction = true;
		}
		namedRenderFilters[name] = filterFunc;
	}
}

// Renderer - Renders data on element
function Renderer(templatePath) {
	this.templatePath = templatePath;
}

Renderer.prototype.render = function(/* templateElement */) {
	// Intentionally left empty
};

// Answer the templatePath of the receiver
Renderer.prototype.getTemplatePath = function() {
	return this.templatePath;
};

// Answer the element referred to by the receivers templatePath
Renderer.prototype.getElementIn = function(rootElement) {
	return this.getTemplatePath().getElementIn(rootElement);
};

// Answer the data function of the receiver
Renderer.prototype.getDataFunction = function() {
	return this.getTemplatePath().getDataFunction();
};

// Answer whether receiver is TemplateNode
Renderer.prototype.isTemplateNode = function() {
	return false;
};

// TextRenderer - Renders data as text of element
export function TextRenderer(templatePath) {
	Renderer.call(this, templatePath);
}

TextRenderer.prototype = Object.create(Renderer.prototype);
TextRenderer.prototype.constructor = TextRenderer;
TextRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render text
	var element = this.getElementIn(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.tween("text", function(d, i, nodes) {
				var tweenElement = select(this);
				var self = this;
				return function(t) {
					tweenElement.text(dataFunction.call(self, d, i, nodes)(t));
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.text(function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.text(dataFunction);
	}
};

// AttributeRenderer - Renders data as attribute of element
export function AttributeRenderer(templatePath, attribute) {
	Renderer.call(this, templatePath);
	this.attribute = attribute;
}

AttributeRenderer.prototype = Object.create(Renderer.prototype);
AttributeRenderer.prototype.constructor = AttributeRenderer;
AttributeRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render attribute
	var element = this.getElementIn(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.attrTween(this.attribute, function(d, i, nodes) {
				var self = this;
				return function(t) {
					return dataFunction.call(self, d, i, nodes)(t);
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.attr(this.attribute, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.attr(this.attribute, dataFunction);
	}
};

// StyleRenderer - Renders data as style of element
export function StyleRenderer(templatePath, style) {
	Renderer.call(this, templatePath);
	this.style = style;
}

StyleRenderer.prototype = Object.create(Renderer.prototype);
StyleRenderer.prototype.constructor = StyleRenderer;
StyleRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	if(transition) {
		templateElement = templateElement.transition(transition);
	}

	// Render style
	var element = this.getElementIn(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.styleTween(this.style, function(d, i, nodes) {
				var self = this;
				return function(t) {
					return dataFunction.call(self, d, i, nodes)(t);
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.style(this.style, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.style(this.style, dataFunction);
	}
};

// PropertyRenderer - Renders data as property of element
export function PropertyRenderer(templatePath, property) {
	Renderer.call(this, templatePath);
	this.property = property;
}

PropertyRenderer.prototype = Object.create(Renderer.prototype);
PropertyRenderer.prototype.constructor = PropertyRenderer;
PropertyRenderer.prototype.render = function(templateElement, transition) {

	// Do not attach transition to element (like with AttributeRenderer and StyleRenderer)
	// since properties are not supported within a transition. A tween function can however
	// be used with a property.

	// Render property
	var element = this.getElementIn(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {

			// Attach tween to transition and perform update
			var property = this.property;
			transition.tween(property, function(d, i, nodes) {
				var self = this;
				return function(t) {
					element.property(property, dataFunction.call(self, d, i, nodes)(t));
				};
			});
		} else {

			// If no transition is present, use the final state (t = 1.0)
			element.property(this.property, function(d, i, nodes) {
				return dataFunction.call(this, d, i, nodes)(1.0);
			});
		}
	} else {
		element.property(this.property, dataFunction);
	}
};
