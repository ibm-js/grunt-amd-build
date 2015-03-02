define(["./bar"], function (bar) {
	return {
		log: function () {
			bar.log;
			console.log("qux !");
		}
	};
});
