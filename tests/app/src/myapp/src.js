define([
	"mypackage/foo",
	"mypackage/bar",
	"requirejs-text/text!./msg.txt",
	"requirejs-dplugins/i18n!myapp/nls/bundleA",
	"requirejs-dplugins/i18n!myapp/nls/en/bundleB",
	"requirejs-dplugins/css!css/src.css"
], function (foo, bar, msg, msgA, msgB) {
    return { 
		log: function(){
			bar.log();
			foo.log();
			console.log(msg);
			console.log(msgA.MSG);
			console.log(msgB.MSG);
		}
	};
});
