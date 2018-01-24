import {selection} from "d3-selection";
import {transition} from "d3-transition";
import {selection_template, selection_render} from "./template";
import "./renderer-utils";

selection.prototype.template = selection_template;
selection.prototype.render = selection_render;
transition.prototype.render = selection_render;
