define(["./bar"], function (bar) {
	return {
		log: function () {
			bar.log();
			console.log("3. foo patch");
		}
	};
});
