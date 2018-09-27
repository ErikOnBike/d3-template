import { uglify } from "rollup-plugin-uglify";

export default [
  {
    input: "index",
    output: {
      extend: true,
      file: "build/d3-template.js",
      format: "umd",
      name: "d3",
      globals: {
        "d3-selection": "d3",
        "d3-transition": "d3"
      }
    },
    external: [
      "d3-selection",
      "d3-transition"
    ]
  },
  {
    input: "index",
    output: {
      extend: true,
      file: "build/d3-template.min.js",
      format: "umd",
      name: "d3",
      globals: {
        "d3-selection": "d3",
        "d3-transition": "d3"
      }
    },
    external: [
      "d3-selection",
      "d3-transition"
    ],
    plugins: [uglify()]
  },
];
