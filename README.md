# d3-template

*(This version is meant for V4/V5 and has not been tested on V3 or earlier versions of D3)*

d3-template is a D3 plugin to support templates using D3's data binding mechanism.  This means you can use D3's familiar functionality directly on or with your templates. Apply transactions or add event handlers to template elements with access to the bound data. Render new data on a template thereby updating attributes, styles and text. Also new elements are added and superfluous elements are removed from repeating groups (D3's enter/exit). This works for both HTML as well as SVG elements. Templates will normally be acting on the live DOM, but can be used on virtual DOM's (like [jsdom](https://github.com/jsdom/jsdom)) as well.

If you are looking for existing templating support like Handlebars, Mustache or Nunjucks have a look at [d3-templating](https://github.com/jkutianski/d3-templating).

The following information is available:
* [Usage](#Usage)
* [Installing](#Installing)
* [Features](#Features)
* [Limitations](#Limitations)
* [API Reference](#API-Reference)
* [Render filters](#Render-filters)
* [Repeating groups](#Repeating-groups)
* [Event handlers](#Event-handlers)
* [Examples](examples/README.md)
* [License](LICENSE)

## <a name="Usage">Usage</a>

Templates look like they do in most other templating tools: add references to data by placing them within curly braces. Standard as well as custom filters are supported.

The general usage is probably best described by an example (see example on [bl.ocks.org](https://bl.ocks.org/ErikOnBike/f36ce2b4c88ef525d0cfe34a766d8067)):

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

## <a name="Installing">Installing</a>

To install via [NPM](https://www.npmjs.com) use `npm install d3-template-plugin`. Or use/install directly using [unpkg](https://unpkg.com/).

    <script src="https://unpkg.com/d3-template-plugin/build/d3-template.min.js"></script>

## <a name="Features">Features</a>

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
* Standard filters (like `upper`, `lower`, `substr`, `prefix`, `subarr`, `sort`, `numberFormat`, `timeFormat`, ...) For the full list see [render filters](#Render-filters).
* Custom filters can be added by calling:

    ```Javascript
    d3.renderFilter(name, function(value[, parameters ], i, nodes) { return /* ...your code here... */; });
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
* Tweens (for style, attribute or text) can also be used in combination with a transition by providing a [tween filter](#renderTweenFilter).

## <a name="Limitations">Limitations</a>

The following known *limitations* are present:
* Data references (the curly braces) can only be applied to the full element or the full attribute value. Filters can be used to format fields within a given text. (For completeness: Surrounding whitespace is allowed for elements or attributes, but will be removed.)

    ```HTML
    <!-- This will not be recognised by d3-template -->
    <div data-style-width="{{width}}px">...</div>

    <!-- Use the following instead (beware of single quotes) -->
    <div data-style-width='{{width|unit: "px"}}'>...</div>

    <!-- This will not be recognised by d3-template -->
    <span>{{jobCount}} jobs</span>

    <!-- Use one of the following instead -->
    <span>{{jobCount|postfix: " jobs"}}</span>
    <span>{{jobCount|format: "{.} jobs"}}</span>
    <span><span>{{jobCount}}</span> jobs</span>
    <span>{{jobCount}}</span> <span>jobs</span>
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
        <span>{{requests|format: "Requests: {.} (per month)"}}</span>
        <!-- Or
        <span>{{.|format: "Requests: {requests} (per month)"}}</span>
        -->
    </span>
    ```

* No support for the 'import' of a template within another template yet.

## <a name="API-Reference">API Reference</a>

<a name="template" href="#template">#</a> d3.<b>template</b>(<i>selection[, options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L30)

Creates a template from the specified *selection*. The selection might be changed as a result of this. Attributes or text consisting of template references will be removed. Child elements of an element containing a valid grouping attribute (`data-repeat`, `data-if` or `data-with`) will be removed. Different elements will have an attribute (`data-template`) applied for identification purposes.

If *options* is specified it should be an object containing properties describing the template attribute names being used. Only the properties that need custom values should be present. The following are the default options values:

```Javascript
{
    repeatAttribute: "data-repeat",
    ifAttribute: "data-if",
    withAttribute: "data-with",
    elementSelectorAttribute: "data-template"  // Used to add identification to elements
}
```

<a name="render" href="#render">#</a> d3.<b>render</b>(<i>selection, data[, options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L62)

Renders *data* onto the specified *selection*. If the `elementSelectorAttribute` is changed during template creation using the *options* parameter, this same value has to be provided for *options* parameter of the *render* function. If no template has been created from *selection* an exception is thrown.

<a name="renderFilter" href="#renderFilter">#</a> d3.<b>renderFilter</b>(<i>name[, filterFunc]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/renderer.js#L10)

Retrieve or register a render filter for the specified *name*. If *filterFunc* is not specified the current filter named *name* is returned. If *filterFunc* is `null` an already registered filter for *name* is removed. If *filterFunc* is a function it is registered under *name* possibly replacing an existing filter. If *filterFunc* is not a function (nor null) an exception is thrown.

The filter function *filterFunc* is called during rendering with the data bound to the element being rendered and `this` set to the node being rendered. Arguments can be specified in the template. These will be passed to the *filterFunc* as well. Also D3's typical `i` and `nodes` arguments are passed as the last two arguments in the function call. The function should return the filtered result.

```HTML
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
```

<a name="renderTweenFilter" href="#renderTweenFilter">#</a> d3.<b>renderTweenFilter</b>(<i>name[, tweenFilterFunc]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/renderer.js#L14)

Retrieve or register a tween filter for the specified *name*. If *tweenFilterFunc* is not specified the current tween filter named *name* is returned. If *tweenFilterFunc* is `null` an already registered tween filter for *name* is removed. If *tweenFilterFunc* is a function it is registered under *name* possibly replacing an existing tween filter. If *tweenFilterFunc* is not a function (nor null) an exception is thrown.

The tween filter function should return a function accepting a single parameter `t` in accordance with the regular tween functions [attrTween](https://github.com/d3/d3-transition#transition_attrTween), [styleTween](https://github.com/d3/d3-transition#transition_styleTween) and/or [tween](https://github.com/d3/d3-transition#transition_tween). A tween filter can only be applied as the last filter in a definition (within a template). There are currently no default tween filters, because required behaviour is often very specific.

If a tween filter is specified within a template, but the render is performed without an active transition then the final tween result is shown directly (ie the value returned by calling the tween filter with value `1.0`).

```HTML
<div data-style-background-color="{{fill|fillTween}}">
    <span>{{text|upper|textTween}}</span>
</div>
<!-- The following will not work because the tween filter is not the last filter
<span>{{text|textTween|upper}}</span>
-->
<script>
    d3.renderTweenFilter("fillTween", function(d) {
        return d3.interpolateRgb("white", d);
    });
    d3.renderTweenFilter("textTween", function(d) {
        return function(t) {
            return d.substr(0, Math.floor(t * d.length));
        };
    });
</script>
```

Arguments specified within the template can only be literal (JSON) values. Removing the quotes around `"arg1"` or `"lowerCase"` will result in an exception since these will become references instead of string literals. The arguments (everything after the colon) are parsed as a list of comma separated JSON values. This means literal values like `true`, `false` and `null` are allowed and strings are surrounded by double quotes (see also [JSON](http://json.org)). Use standard HTML attribute escaping with %34 for a double and %39 for a single quote if both are needed in the same filter in an attribute. An easy way to be able to use double quotes within attributes, is to define the attributes with single quotes (although double quotes are the predominant variant).

<a name="selection_template" href="#selection_template">#</a> <i>selection</i>.<b>template</b>(<i>[options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L25)

Creates a template from this *selection*. The following are all equivalent:

```Javascript
d3.template(selection, options);
selection.template(options);
selection.call(d3.template, options)
```

<a name="selection_render" href="#selection_render">#</a> <i>selection</i>.<b>render</b>(<i>data[, options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L57)

Renders *data* onto this *selection*. (See also [d3.render](#render)) The following are all equivalent:

```Javascript
d3.render(selection, data);
selection.render(data);
selection.call(d3.render, data);
```

<a name="transition_render" href="#transition_render">#</a> <i>transition</i>.<b>render</b>(<i>data[, options]</i>) [<>](https://github.com/ErikOnBike/d3-template/blob/master/src/template.js#L62)

To render data onto a selection using a transaction use the following approach:

```Javascript
selection
    .transaction()
        .delay(100)
        .duration(600)
        .on("start", function() {
            var transition = d3.active(this);
            transition.render(data);
        })
;
```

### <a name="Render-filters">Render filters</a>
The following list shows the standard render filters available. For usage see [renderFilter](#renderFilter).

  | Filter | Usage |
  ---------|-------|
  | | *Generic filters (data can be of any type)* |
  | **default**: *defaultValue* | Answer *defaultValue* if the data is `null` or `undefined`, otherwise data itself |
  | **emptyDefault**: *defaultValue* | Answer *defaultValue* if the data is falsy or has length 0, otherwise data itself |
  | **equals**: *otherValue* | Answer a boolean as the result of comparing data with *otherValue* using `===` |
  | **length** | Answer the length of the data (valid for Strings and Arrays) |
  | **format**: *specifier* | Answer the data formatted using [*specifier*](#formatSpecifier) |
  | | *String filters (data must be a [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String))* |
  | **upper** | Answer the data converted to uppercase using [toLocaleUpperCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleUpperCase) |
  | **lower** | Answer the data converted to lowercase using [toLocaleLowerCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleLowerCase) |
  | **prefix**: *prefix* | Answer *prefix* and the data concatenated as a string |
  | **postfix**: *postfix* | Answer the data and *postfix* concatenated as a string |
  | **substr**: *from\[, length \]* | Answer the substring of data using [substr](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr) |
  | | *Numeric filters (data must be a number)* |
  | **numberFormat**: *specifier* | Answer the data formatted using [*specifier*](https://github.com/d3/d3-format#locale_format) |
  | *Date/time filters* | *Data must be a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)* |
  | **timeFormat**: *specifier* | Answer the data formatted using [*specifier*](https://github.com/d3/d3-time-format#locale_format) |
  | | *Boolean filters (data must be a boolean)* |
  | **not** | Answer the negation of data |
  | | *Array filters (data must be an [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array))* |
  | **subarr**: *from\[, length \]* | Answer the subarray of data similar to **substr** filter above |
  | **sort**: *sortFields* | Answer data sorted as specified by [*sortFields*](#sortFields) |
  | **shuffle** | Answer data in random order |
  | | *Unit and conversion filters* |
  | **unit**: *unit* | Answer the data (numeric) and *unit* concatenated as a string |
  | **color2rgb** | Answer the data (a [d3.color](https://github.com/d3/d3-color#color)) as a rgb string "ie rgb(127, 0, 255)" |
  | | *<a name="Repeat-group-filters">Repeat group filters</a>* |
  | **repeatIndex** | Answer the index (starts at 0) of the current element within the enclosing repeat group (filter data is ignored) |
  | **repeatPosition** | Answer the position (starts at 1) of the current element within the enclosing repeat group (filter data is ignored) |
  | **repeatLength** | Answer the length of the enclosing repeat group (filter data is ignored) |

<a name="formatSpecifier"></a>
The *specifier* argument for the **format** filter should be a (JSON) string containing template references with optional filter references. For example: `"translate({x},{y})"` or `"Value: {value|default: \"<unknown>\"}"`.

<a name="sortFields"></a>
The *sortFields* argument for the **sort** filter should be a (JSON) string with comma separated list of field names. Each name can be prepended by `-` or `+` to indicate descending or ascending order (with ascending as default if none specified). Fields should be singular. It is currently not possible to specify "address.street" to access the field "street" of the address instance.

```HTML
<!-- Sort by last name (ascending) and birth date (descending, ie youngest first) -->
<ul data-repeat='{{.|sort: "lastName,-birthDate"}}'>
```
	
### <a name="Repeating-groups">Repeating groups</a>

Repeating groups can only be applied on arrays. The array will be bound to the element when rendered. The group's child element will be appended conform the regular D3 enter/exit pattern. A copy of the child element will be rendered for every array element provided.

```HTML
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
```

To use the index, position or length of the repeat group, use the special [repeat group filters](#Repeat-group-filters).

```HTML
<!-- Insert index and position of element within repeat group using special filters -->
<ul data-repeat="{{.}}">
    <li data-index="{{.|repeatIndex}}"><span>{{.|repeatPosition}}</span> - <span>{{.}}</span></li>
</ul>
```

### <a name="Event-handlers">Event handlers</a>

If event handlers are applied to a selection before a template is being created from it, these event handlers will be applied to the rendered result as well. When an event handler is called it will receive the normal D3 style arguments `d, i, nodes` and `this` will be set to the node receiving the event.

```HTML
<ul id="lang-list" data-repeat="{{.}}">
    <li>{{english}}</li>
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
