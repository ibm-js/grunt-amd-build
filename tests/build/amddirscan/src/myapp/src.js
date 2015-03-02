define([
	"./plugin!./{{template}}",
	"myapp/other" // this module should not be included as a dependency.
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
});
