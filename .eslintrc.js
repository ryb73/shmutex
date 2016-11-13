module.exports = {
    env: {
        node: true,
        es6: true,
    },

    extends: [ "eslint:recommended" ],

    parserOptions: {
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
        },
    },

    rules: {
        "linebreak-style": [
            "error",
            "unix"
        ],

        semi: [
            "error",
            "always"
        ],

        "no-unused-vars": [
            "error",
            { vars: "all", args: "none" }
        ],

        eqeqeq: [ "error", "always" ],
    },
};