import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: "index",
  output: {
    extend: true,
    file: "build/d3-template.js",
    format: "umd",
    name: "d3",
    globals: {
      "d3-selection": "d3",
      "d3-transition": "d3",
      "d3-format": "d3",
      "d3-time-format": "d3",
      "d3-array": "d3"
    }
  },
  plugins: [
    resolve({
      main: true,
      jsnext: true,
      browser: true
    }),
    commonjs()
  ],
  external: [
    "d3-selection",
    "d3-transition",
    "d3-format",
    "d3-time-format",
    "d3-array"
  ]
};
