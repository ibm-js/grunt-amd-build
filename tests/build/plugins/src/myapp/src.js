define([
	"./plugin!./{{template}}",
	"./plugin!./{{template}}", // Twice to test resources are processed only once.
	"./plugin!myapp/resource.xxx", // Third to test resources are normalized correctly.
	"./plugin!myapp/other" // load another resource.
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
});
