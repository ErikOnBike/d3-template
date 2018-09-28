# d3-template

*(This version is meant for V4/V5 and has not been tested on V3 or earlier versions of D3)*

d3-template is a D3 plugin to support templates using D3's data binding mechanism.  This means you can use D3's familiar functionality directly on or with your templates. Apply transitions or add event handlers to template elements with access to the bound data. Render new data on a template thereby updating attributes, styles, properties and text. Also new elements are added and superfluous elements are removed from repeating groups (D3's enter/exit update pattern). This works for both HTML as well as SVG elements both in the Browser as well as within Node. Templates will normally be acting on the live DOM, but can be used on virtual DOM's (like [jsdom](https://github.com/jsdom/jsdom)) as well.

If you are looking for existing templating support like Handlebars, Mustache or Nunjucks have a look at [d3-templating](https://github.com/jkutianski/d3-templating).

The following information is available:
* [Usage](#Usage)
* [Installing](#Installing)
* [Features](#Features)
* [Limitations](#Limitations)
* [API Reference](#API-Reference)
* [Repeating groups](#Repeating-groups)
* [Import templates](#Import-templates)
* [Transitions](#Transitions)
* [Event handlers](#Event-handlers)
* [Examples](examples/README.md)
* [License](LICENSE)

## <a name="Usage">Usage</a>

Templates look like they do in most other templating tools: add references to data by placing expressions within curly braces.

The general usage is probably best described by an example (see example on [bl.ocks.org](https://bl.ocks.org/ErikOnBike/f36ce2b4c88ef525d0cfe34a766d8067)):

```HTML
<div class="person">
    <div>
        <span>Name: <span>{{d.name}}</span></span>
    </div>
    <div>
        <span>{{`Birthdate: ${d3.timeFormat("%-d %B %Y")(d.date)}`}}</span>
    </div>
    <div>
	<span>Honours given name to:</span>
        <ul data-repeat="{{d.honours.given}}">
            <li>{{d}}</li>
        </ul>
    </div>
</div>
<script>

    // Add event handler to list element before template creation
    d3.select(".person ul li")
        .on("click", function(d, i, nodes) {
            // d will be entry from the honours.given array
            // i will be current index
            // nodes will be the li nodes
            // this will refer to the current node (ie nodes[i])
            console.log(d, i, nodes.length);
        })
    ;

    // Turn selection into a template
    // This will remove some elements from the DOM as well as add some attributes to elements
    // for identification.
    d3.select(".person")
        .template()
    ;

    // ...

    // Render data onto earlier created template
    // Information retrieved from https://en.wikipedia.org/wiki/Alan_Turing#Awards,_honours,_recognition,_and_tributes
    d3.select(".person")
        .render({
            name: "Alan Turing",
            birthdate: new Date(1912, 5, 23),
            honours: {
                received: [
                    "Order of the British Empire",
                    "Fellow of the Royal Society"
                ],
                given: [
                    "Good–Turing frequency estimation",
                    "Turing completeness",
                    "Turing degree",
                    "Turing fixed-point combinator",
                    "Turing Institute",
                    "Turing Lecture",
                    "Turing machine examples",
                    "Turing patterns",
                    "Turing reduction",
                    "Turing switch"
                ]
            }
        })
    ;

    // The click event handler is now present on all li elements
</script>
```

When rendering data onto a template which is already rendered, the new data will be bound and elements will be updated accordingly. A transition can be created to animate the new data rendering.

## <a name="Installing">Installing</a>

To install via [NPM](https://www.npmjs.com) use `npm install d3-template-plugin`. Or use/install directly using [unpkg](https://unpkg.com/).

    <script src="https://unpkg.com/d3-template-plugin/build/d3-template.min.js"></script>

## <a name="Features">Features</a>

The following *features* are present:
* Data rendering onto attributes and text directly.
* Data can also be rendered on attributes, styles or properties indirectly (through `data-attr-<name>`, `data-style-<name>` and `data-prop-<name>`). Properties can be useful for setting the `value` or `checked` property of HTML input elements for example. The indirect rendering is especially useful for SVG because most browsers do not like 'invalid' attribute values:

    ```HTML
    <!-- Most browsers do not like this (invalid according to SVG spec) -->
    <circle cx="{{x}}" cy="{{y}}" r="{{radius}}"></circle>

    <!-- Most browsers are okay with this (valid according to SVG spec) -->
    <circle data-attr-cx="{{x}}" data-attr-cy="{{y}}" data-attr-r="{{radius}}"></circle>
    ```

* Repeating and conditional groups (through `data-repeat` and `data-if` attribute).
* A scope group similar to the Javascript `with` statement (through `data-with` attribute).
* Other templates can be imported. Which template gets imported can be decided on render time based on the bound data.
* Possibility to overwrite the template attribute names with custom names. If for example `repeat`, `if` and `with` is preferred over de long names, this can be specified when creating a template. Although such custom attributes are not compliant with HTML5 or SVG specifications, most browsers will accept it without complaining.
* Event handlers added onto elements before the template was created (using `selection.on()`), will be (re)applied when rendering the template.
* Rendering can be done within a transition allowing animations.
* Tweens (for attribute, style, property or text) can also be used in combination with a transition by providing a [tween data function](#tweenDataFunction).

## <a name="Limitations">Limitations</a>

The following known *limitations* are present:
* Data references (the curly braces) can only be applied to the full element or the full attribute value. (For completeness: Surrounding whitespace is allowed for elements or attributes, but will be removed.)

    ```HTML
    <!-- This will not be recognised by d3-template -->
    <div data-style-width="{{width}}px">...</div>

    <!-- Use one of the following instead -->
    <div data-style-width="{{d.width + 'px'}}">...</div>
    <div data-style-width="{{`${d.width}px`}}">...</div>

    <!-- This will not be recognised by d3-template -->
    <span>{{jobCount}} jobs</span>

    <!-- Use one of the following instead -->
    <span>{{d.jobCount + " jobs"}}</span>
    <span>{{`${d.jobCount} jobs`}}</span>
    <span><span>{{d.jobCount}}</span> jobs</span>
    <span>{{d.jobCount}}</span> <span>jobs</span>
    ```

* There should be none or one child element for a grouping element (`repeat`, `if` or `with`). If more child elements are needed, these have to be wrapped in a container element. If only text is present, this has to be wrapped in a container element as well. An exception will be thrown during parsing of the template if such invalid structures are present. (Having no child element on a group is actually useless, but allowed for convenience during development.)

    ```HTML
    <!-- This is not allowed by d3-template -->
    <ul data-repeat="{{d}}">
        <li>{{d}}</li>
        <li class="separator"></li>
    </ul>

    <!-- Use the following (or something similar) instead -->
    <ul data-repeat="{{d}}">
        <li>
            <div>{{d}}</div>
            <div class="separator"></div>
        </li>
    </ul>

    <!-- This is not allowed by d3-template -->
    <div data-repeat="{{d.stats}}">
        Requests: <span>{{d.requests}}</span> (per month)
    </div>

    <!-- Use the following (or something similar) instead -->
    <div data-repeat="{{d.stats}}">
        <span>{{`Requests: ${d.requests} (per month)`}}</span>
    </span>
    ```

* Grouping elements (`repeat`, `if` or `with`) can not be combined on the same element. One has to be wrapped inside the other.
* An import element can only be combined with the `with` grouping to scope (or map) the data for the imported template. Combining `import` with `repeat` or `if` is not allowed.
* Setting properties of (for example) HTML input elements can not be done using transitions, since D3 transitions do not support it. It is however possible to create a [tween data function](#tweenDataFunction).

## <a name="API-Reference">API Reference</a>

<a name="template" href="#template">#</a> d3.<b>template</b>(<i>selection[, options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L101)

Creates a template from the specified *selection*. The selection might be changed as a result of this. Attributes or text consisting of template references will be removed. Child elements of an element containing a valid grouping attribute (`data-repeat`, `data-if` or `data-with`) will be removed. Different elements will have an attribute (`data-d3t7s` or `data-d3t7b`) applied for identification purposes.

If *options* is specified it should be an object containing properties describing the template attribute names being used. Only the properties that need custom values should be present. The following are the default options values:

```Javascript
{
    repeatAttribute: "data-repeat",
    ifAttribute: "data-if",
    withAttribute: "data-with",
    importAttribute: "data-import",
    indirectAttributePrefix: "data-attr-",
    indirectStylePrefix: "data-style-",
    indirectPropertyPrefix: "data-prop-"
}
```

<a name="render" href="#render">#</a> d3.<b>render</b>(<i>selection, data</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L142)

Renders *data* onto the specified *selection*. If no template has been created from *selection* an exception is thrown.

<a name="selection_template" href="#selection_template">#</a> <i>selection</i>.<b>template</b>(<i>[options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L96)

Creates a template from this *selection*. The following are all equivalent:

```Javascript
d3.template(selection, options);
selection.template(options);
selection.call(d3.template, options)
```

<a name="selection_render" href="#selection_render">#</a> <i>selection</i>.<b>render</b>(<i>data</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L135)

Renders *data* onto this *selection*. The following are all equivalent:

```Javascript
d3.render(selection, data);
selection.render(data);
selection.call(d3.render, data);
```

<a name="transition_render" href="#transition_render">#</a> <i>transition</i>.<b>render</b>(<i>data</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L140)

To render data onto a selection using a transition use the following:

```Javascript
selection
    .transition()
        .delay(100)
        .duration(600)
        .render(data)
;
```

### <a name="Repeating-groups">Repeating groups</a>

Repeating groups can only be used with arrays as data. The array will be bound to the element when rendered. The group's child element will be appended conform the regular D3 enter/exit pattern. A copy of the child element will be rendered for every array element provided. It will have the corresponding array element bound as data.

```HTML
<ul id="my-list" data-repeat="{{d}}">
   <li>{{d}}</li>
</ul>
<script>
    var list = d3.select("#my-list").template();

    // Render a list containing the numbers 1 to 4
    list.render([ 1, 2, 3, 4 ]);

    // Render a list of words (replacing the numbers)
    list.render([ "Hello", "I", "Just", "Called", "To", "Say", "I", "Love", "You" ]);

    // Render an empty list (all existing li elements will be removed)
    list.render([]);
</script>
```

To use the index or length of the repeat group, use the D3 typical `i` or `nodes` parameters:

```HTML
<!-- Insert index and position of element within repeat group -->
<ul data-repeat="{{d}}">
    <li data-index="{{i}}"><span>{{`${i + 1} of ${nodes.length}`}}</span> - <span>{{d}}</span></li>
</ul>
```

### <a name="Import-templates">Import templates</a>

It is possible to import another template. The data bound to the element during rendering can be used to dynamically decide which template gets imported. An element with an import can not have children in the template (the imported template will be the child). An import can be combined with `with` grouping to scope (or map) the data onto the imported template.

```HTML
<div id="templates" style="display: none;">
	<div id="incoming-message">
		<div>
			<div>{{`From: ${d.sender}`}}</div>
			<div>{{d.content}}</div>
		</div>
	</div>
	<div id="outgoing-message">
		<div>{{d.content}}</div>
	</div>
</div>
<div id="messenger">
	<div class="list" data-repeat="{{d}}">
		<div data-import="{{d.sender === 'Me' ? '#outgoing-message' : '#incoming-message'}}"></div>
	</div>
</div>
<script>
	var messages = [
		{ sender: "Someone", content: "Hello world" },
		{ sender: "Me", content: "Hello to you too" },
		{ sender: "Someone", content: "What are you doing?" },
		{ sender: "Me", content: "Writing a D3 template" },
		{ sender: "Someone", content: "That sounds interesting" },
		{ sender: "Someone", content: "I am already familiar with D3" },
		{ sender: "Someone", content: "Where can I learn about that?" },
		{ sender: "Me", content: "Check out the other examples" }
	];

	// Create templates from the two message types incoming and outgoing
	d3.select("#incoming-message").template();
	d3.select("#outgoing-message").template();

	// Create template from the messages group and render data
	d3.select("#messenger")
		.template()
		.render(messages)
	;
</script>
```

### <a name="Transitions">Transitions</a>

Transitions can be combined with rendering data onto a template. This allows for example SVG diagrams to transition from one shape to another. The general approach for rendering on a transition is the following:

```Javascript
selection
    .transition()
        .delay(100)
        .duration(700)
	.render(data)
;
```

Some data like text or strings do not animate well. Also sometimes a bit more control is needed on the way data is transitioned. In D3 there are tween functions for that. In d3-template these can be created by tagging a data function with the tag 'tween'.

```HTML
<div id="tweenBlock" data-style-background-color="{{tween:d3.interpolateRgb('white', d.color)}}">
    <span>{{tween:textTween(d.text)}}</span>
</div>
<script>
    function textTween(d) {
        return function(t) {
            return d.substr(0, Math.floor(t * d.length));
        };
    }

    d3.selection("#tweenBlock")
        .template()
        .transition()
            .delay(100)
            .duration(700)
            .render({ fill: "red", text: "Hello world" })
    ;
</script>
```

The tween data function should return a function accepting a single parameter `t` in accordance with the regular tween functions [attrTween](https://github.com/d3/d3-transition#transition_attrTween), [styleTween](https://github.com/d3/d3-transition#transition_styleTween) and/or [tween](https://github.com/d3/d3-transition#transition_tween).

A tween data function is to be used in combination with rendering on a [transition](#transition_render). If a tween data function is specified within a template, but the render is performed without an active transition then the final tween result is rendered directly (ie the value returned by calling the tween data function with value `1.0`).

### <a name="Event-handlers">Event handlers</a>

If event handlers are applied to a selection before a template is being created from it, these event handlers will be applied to the rendered result as well. When an event handler is called it will receive the normal D3 style arguments `d, i, nodes` and `this` will be set to the node receiving the event.

```HTML
<ul id="lang-list" data-repeat="{{d}}">
    <li>{{d.english}}</li>
</ul>
<script>
    var list = d3.select("#lang-list");

    // Add event handler
    list.select("li").on("click", function(d) {
	window.alert("'" + d.english + "' translates into '" + d.dutch + "' for the Dutch language");
    });
        
    // Create template now that the event handlers are applied
    list.template();

    // Render words
    var words = [
        { english: "one", dutch: "een" },
        { english: "two", dutch: "twee" },
        { english: "three", dutch: "drie" },
        { english: "four", dutch: "vier" }
    ];
    list.render(words);

    // Clicking on a list element will show the alert specified 
</script>
```
