# d3-template

*(This version has not been tested on V3 or earlier versions of D3)*

d3-template is a D3 plugin to support templates using D3's data binding mechanism.  This means you can use D3's familiar functionality directly on or with your templates. Apply transactions or add event handlers to template elements with access to the bound data. Render new data on a template thereby updating attributes, styles and text. Also new elements are added and superfluous elements are removed from repeating groups (D3's enter/exit). This works for both HTML as well as SVG elements.

If you are looking for existing templating support like Handlebars, Mustache or Nunjucks have a look at [d3-templating](https://github.com/jkutianski/d3-templating).

## Usage

Templates look like they do in most other templating tools: add references to data by placing them within curly braces. Standard as well as custom filters are supported.

The general usage is probably best described by an example:

```HTML
<div class="person">
    <div>
        <span>Name: <span>{{name}}</span></span>
    </div>
    <div>
        <span>Birthdate: <span>{{birthdate|timeFormat: "%-d %B %Y"}}</span></span>
    </div>
    <div>
	<span>Honours given name to:</span>
        <ul data-repeat="{{honours.given}}">
            <li>{{.}}</li>
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

When rendering data onto a template which is already rendered, the new data will be bound and elements will be updated accordingly.

## Features

The following *features* are present:
* Data rendering onto attributes and text directly.
* Data can also be rendered on attributes or styles indirectly (through `data-attr-<name>` and `data-style-<name>`). Especially useful for SVG because most browsers do not like 'invalid' attributes.

    ```HTML
    <!-- Most browsers do not like this (invalid according to SVG spec) -->
    <circle cx="{{x}}" cy="{{y}}" r="{{radius}}"></circle>

    <!-- Most browsers are okay with this (valid according to SVG spec) -->
    <circle data-attr-cx="{{x}}" data-attr-cy="{{y}}" data-attr-r="{{radius}}"></circle>
    ```

* Repeating and conditional groups (through `data-repeat` and `data-if` attribute).
* A scope group similar to the Javascript `with` statement (through `data-with` attribute) for convenience (but beware, there is no 'parent' operator).
* Possibility to overwrite the template attribute names with custom names. If for example `repeat`, `if` and `with` is preferred over de long names, this can be specified when creating a template. Beware that such custom attributes are not compliant with HTML5 or SVG specifications and therefore browser behaviour may be unpredictable.
* Standard filters (like `upper`, `lower`, `substr`, `prefix`, `subarr`, `sort`, `numberFormat`, `timeFormat`, ...).
* Custom filters can be added by calling:

    ```Javascript
    d3.renderFilter(name, function(value[, parameters ]) { return /* ...your code here... */; });
    ```

* Event handlers added onto elements before the template was created (using `selection.on()`), will be (re)applied when rendering the template. The normal D3-style event handler arguments are passed when the handlers are called (ie `d, i, nodes` and `this` is set to the node receiving the event).
* Rendering can also be done within a transition using the following approach:

    ```Javascript
    selection
        .transition()
            .delay(750)
            .duration(1000)
            .on("start", function() {
                var transition = d3.active(this);
                transition.render(data);
            })
    ;
    ```

## Limitations

The following known *limitations* are present:
* Data references (the curly braces) can only be applied to the full element or the full attribute value. Filters can be used to format fields within a given text. (For completeness: Surrounding whitespace is allowed for elements or attributes, but will be removed.)

    ```HTML
    <!-- This will not be recognised by d3-template -->
    <div data-style-width="{{width}}px">...</div>

    <!-- Use the following instead (beware of single quotes) -->
    <div data-style-width='{{width|unit: "px"}}'>...</div>

    <!-- This will not be recognised by d3-template -->
    <span>{{.}} jobs</span>

    <!-- Use one of the following instead -->
    <span>{{.|postfix: " jobs"}}</span>
    <span><span>{{.}}</span> jobs</span>
    <span>{{.}}</span> <span>jobs</span>
    ```

  See [renderFilter](#renderFilter) for an explanation why the single quotes are required in the example above.

* There should be none or one child element for a grouping element (`repeat`, `if` or `with`). If more child elements are needed, these have to be wrapped in a container element. If only text is present, this has to be wrapped in a container element as well. An exception will be thrown during parsing of the template if such invalid structures are present. (Having no child element on a group is actually useless, but allowed for convenience during development.)

    ```HTML
    <!-- This is not allowed by d3-template -->
    <ul data-repeat="{{.}}">
        <li>{{.}}</li>
        <li class="separator"></li>
    </ul>

    <!-- Use the following (or something similar) instead -->
    <ul data-repeat="{{.}}">
        <li>
            <div>{{.}}</div>
            <div class="separator"></div>
        </li>
    </ul>

    <!-- This is not allowed by d3-template -->
    <div data-repeat="{{stats}}">
        Requests: <span>{{requests}}</span> (per month)
    </div>

    <!-- Use the following (or something similar) instead -->
    <div data-repeat="{{stats}}">
        <span>Requests: <span>{{requests}}</span> (per month)</span>
    </span>
    ```

* Currently only a single filter can be applied. By creating a custom filter more elaborate functionality is possible to reach the same effect.
* No support for the 'import' of a template within another template yet.

## Installing

TODO: add npm package

## API Reference

<a name="template" href="#template">#</a> d3.<b>template</b>(<i>selection[, options]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L25)

Creates a template from the specified *selection*. The selection might be changed as a result of this. Attributes or text consisting of template references will be removed. Child elements of an element containing a valid grouping attribute (`data-repeat`, `data-if` or `data-with`) will be removed. Different elements will have an attribute (`data-template`) applied for identification purposes.

If *options* is specified it should be an object containing properties describing the template attribute names being used. Only the properties that need custom values should be present. The following are the default options values:

    {
        repeatAttribute: "data-repeat",
        ifAttribute: "data-if",
        withAttribute: "data-with",
        elementSelectorAttribute: "data-template"  // Used to add identification to elements
    }

<a name="render" href="#render">#</a> d3.<b>render</b>(<i>selection, data[, options]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L57)

Renders *data* onto the specified *selection*. If the `elementSelectorAttribute` is changed during template creation using the *options* parameter, this same value has to be provided for *options* parameter of the *render* function. If no template has been created from *selection* an exception is thrown.

<a name="renderFilter" href="#renderFilter">#</a> d3.<b>renderFilter</b>(<i>name[, filterFunc]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/render.js#L10)

Retrieve or register a render filter for the specified *name*. If *filterFunc* is not specified the current filter named *name* is returned. If *filterFunc* is `null` an already registered filter for *name* is removed. If *filterFunc* is a function it is registered under *name* possibly replacing an existing filter. If *filterFunc* is not a function (nor null) an exception is thrown.

The filter function *filterFunc* is called during rendering with the data bound to the element being rendered. Arguments can be specified in the template. These will be passed to the *filterFunc* as well. The function should return the filtered result.

    <div>{{value|filter: "arg1", 2, { "lowerCase": true }}}</div>
    <script>
        d3.renderFilter("filter", function(d, aString, aNumber, convert) {
            var result = aString + d.repeat(aNumber);
            if(convert.lowerCase) {
                result = result.toLowerCase();
            }
            return result;
        });
    </script>

Arguments can only be literal values. Removing the quotes around `"arg1"` or `"lowerCase"` will result in an exception since these will become references instead of string literals. The arguments (everything after the colon) are parsed as one JSON array. This means literal values like `true`, `false` and `null` are allowed and strings are surrounded by double quotes. Use standard HTML attribute escaping with %34 for a double and %39 for a single quote if both are needed in the same filter in an attribute.

<a name="selection_template" href="#selection_template">#</a> <i>selection</i>.<b>template</b>(<i>[options]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L30)

Creates a template from this *selection*. The following are all equivalent:

    d3.template(selection, options);
    selection.template(options);
    selection.call(d3.template, options)

<a name="selection_render" href="#selection_render">#</a> <i>selection</i>.<b>render</b>(<i>data[, options]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L62)

Renders *data* onto this *selection*. (See also [d3.render](#render)) The following are all equivalent:

    d3.render(selection, data);
    selection.render(data);
    selection.call(d3.render, data);

<a name="transition_render" href="#transition_render">#</a> <i>transition</i>.<b>render</b>(<i>data[, options]</i>) [<>](http://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L62)

To render data onto a selection using a transaction use the following approach:

    selection
        .transaction()
            .delay(100)
            .duration(600)
            .on("start", function() {
                var transition = d3.active(this);
                transition.render(data);
            })
    ;

### Repeating groups

Repeating groups can only be applied on arrays. The array will be bound to the element when rendered. The group's child element will be appended conform the regular D3 enter/exit pattern. A copy of the child element will be rendered for every array element provided.

    <ul id="my-list" data-repeat="{{.}}">
       <li>{{.}}</li>
    </ul>
    <script>
        var list = d3.select("#my-list").template();

        // Render a list containing the numbers 1 to 4
        list.render([ 1, 2, 3, 4 ]);

        // Render a list of words (replacing the numbers)
        list.render([ "Hello", "I", "Just", "Called", "To", "Say", "I", "Love", "You" ]);

        // Render an empty list (no li element will be rendered anymore)
        list.render([]);
    </script>

### Event handlers

If event handlers are applied to a selection before a template is being created from it, these event handlers will be applied to the rendered result as well. When an event handler is called it will receive the normal D3 style arguments `d, i, nodes` and `this` will be set to the node receiving the event.

    <ul id="other-list" data-repeat="{{.}}">
        <li>{{english}}</li>
    </ul>
    <script>
        var list = d3.select("#other-list");

        // Add event handler
        list.select("li").on("click", function(d) {
		window.alert(d.english + " translates into " + d.dutch + " for the Dutch language");
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
