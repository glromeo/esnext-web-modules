module.exports = {
    fakes: {
        "react/cjs/react.production.min.js": `module.exports = {};`,
        "react-dom/cjs/react-dom.production.min.js": `module.exports = {};`
    },
    squash: [
        "@babel/runtime/**"
    ]
}