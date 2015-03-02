define([
	"mypackage/foo"
], function (foo) {
    return {
		log: function () {
			foo.log();
			console.log("self !");
		}
	};
});
