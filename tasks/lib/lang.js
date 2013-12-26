"use strict";

module.exports = (function () {

    return {
        getOwn: function (obj, prop) {
            return obj.hasOwnProperty(prop) && obj[prop];
        },
        eachProp: function (obj, func) {
            var prop;
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    func(prop, obj[prop]);
                }
            }
        }
    };
})();
