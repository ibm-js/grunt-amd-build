define([
	"mypackage/foo",
	"mypackage/bar",
	"requirejs-text/text!./msg.txt",
	"requirejs-dplugins/i18n!myapp/nls/bundleA",
	"requirejs-dplugins/i18n!myapp/nls/en/bundleB",
	"requirejs-dplugins/css!css/src.css",
	"angular"
], function (foo, bar, msg, msgA, msgB, css, angular) {
    return { 
		log: function(){
			bar.log();
			foo.log();
			console.log(msg);
			console.log(msgA.MSG);
			console.log(msgB.MSG);
			if (angular) {
				angular.noop();
				console.log("8. Angular was properly loaded");
			}
		}
	};
});
