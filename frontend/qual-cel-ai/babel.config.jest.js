module.exports = {
  presets: [
    "@babel/preset-env",
    ["@babel/preset-react", { runtime: "automatic" }], // React 19
    "@babel/preset-typescript",
  ],
};
