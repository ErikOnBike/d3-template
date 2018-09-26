import { select } from "d3-selection";
import { TemplatePath } from "./template-path";

// ---- Renderer class ----
// I am a renderer of data onto template elements. I know
// the template path referring to the element within the
// template which should be the target for rendering the
// data on.
//
// Implementation: I am an abstract class and therefore
// my subclasses need to implement the specific render
// behaviour.
function Renderer(element, dataFunction) {
	this.templatePath = new TemplatePath(element);
	this.dataFunction = dataFunction;
}

// ---- Renderer instance methods ----
// Render the receiver's data onto the template element specified
// using the (optional) transition specified
Renderer.prototype.render = function(/* templateElement, transition */) {
	// Intentionally left empty
};

// Answer the element referred to by the receivers template path
Renderer.prototype.resolveToRenderElement = function(templateElement) {
	return this.templatePath.resolve(templateElement);
};

// Answer the data function of the receiver
Renderer.prototype.getDataFunction = function() {
	return this.dataFunction;
};

// ---- TextRenderer class ----
// I am a Renderer and I render text inside template elements.
//
// Implementation: I render text inside HTML or SVG elements/tags.
export function TextRenderer(element, dataFunction) {
	Renderer.call(this, element, dataFunction);
}
TextRenderer.prototype = Object.create(Renderer.prototype);
TextRenderer.prototype.constructor = TextRenderer;

// ---- TextRenderer instance methods ----
// Render the receiver's data as text onto the template element specified
// using the (optional) transition specified
TextRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	var element = this.resolveToRenderElement(templateElement);
	if(transition) {
		element = element.transition(transition);
	}

	// Render text
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

// ---- AttributeRenderer class ----
// I am a Renderer and I render attributes inside template elements.
//
// Implementation: I render attributes of HTML or SVG elements/tags.
export function AttributeRenderer(element, dataFunction, attribute) {
	Renderer.call(this, element, dataFunction);
	this.attribute = attribute;
}
AttributeRenderer.prototype = Object.create(Renderer.prototype);
AttributeRenderer.prototype.constructor = AttributeRenderer;

// ---- AttributeRenderer instance methods ----
// Render the receiver's data as attribute onto the template element specified
// using the (optional) transition specified
AttributeRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	var element = this.resolveToRenderElement(templateElement);
	if(transition) {
		element = element.transition(transition);
	}

	// Render attribute
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.attrTween(this.attribute, dataFunction);
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

// ---- StyleRenderer class ----
// I am a Renderer and I render styles inside template elements.
//
// Implementation: I render styles of HTML or SVG elements/tags.
export function StyleRenderer(element, dataFunction, style) {
	Renderer.call(this, element, dataFunction);
	this.style = style;
}
StyleRenderer.prototype = Object.create(Renderer.prototype);
StyleRenderer.prototype.constructor = StyleRenderer;

// ---- StyleRenderer instance methods ----
// Render the receiver's data as style onto the template element specified
// using the (optional) transition specified
StyleRenderer.prototype.render = function(templateElement, transition) {

	// Attach transition to element (if present)
	var element = this.resolveToRenderElement(templateElement);
	if(transition) {
		element = element.transition(transition);
	}

	// Render style
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {
			element.styleTween(this.style, dataFunction);
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

// ---- PropertyRenderer class ----
// I am a Renderer and I render properties inside template elements.
//
// Implementation: I render properties of HTML or SVG elements/tags.
export function PropertyRenderer(element, dataFunction, property) {
	Renderer.call(this, element, dataFunction);
	this.property = property;
}
PropertyRenderer.prototype = Object.create(Renderer.prototype);
PropertyRenderer.prototype.constructor = PropertyRenderer;

// ---- PropertyRenderer instance methods ----
// Render the receiver's data as property onto the template element specified
// using the (optional) transition specified
PropertyRenderer.prototype.render = function(templateElement, transition) {

	// Do not attach transition to element (like with AttributeRenderer and StyleRenderer)
	// since properties are not supported within a transition. A tween function can however
	// be used with a property.

	// Render property
	var element = this.resolveToRenderElement(templateElement);
	var dataFunction = this.getDataFunction();
	if(dataFunction.isTweenFunction) {
		if(transition) {

			// Attach tween to transition and perform update
			var property = this.property;
			transition.tween(property, function(d, i, nodes) {
				var tweenElement = select(this);
				var self = this;
				return function(t) {
					tweenElement.property(property, dataFunction.call(self, d, i, nodes)(t));
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
