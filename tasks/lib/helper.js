"use strict";

module.exports = (function () {
    return {
        pathToMid: function (filepath) {
            return filepath.substring(0, filepath.length - 3);
        },
        midToPath: function (mid) {
            return mid + ".js";
        },
        addModuleName: function (src, filepath) {
            return src.replace(/^define\(/, "define('" + this.pathToMid(filepath) + "',");
        }
    };

}());
