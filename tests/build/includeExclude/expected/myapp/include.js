define('mypackage/foo',["./bar"], function (bar) {
	return {
		log: function () {
			bar.log;
			console.log("foo !");
		}
	};
});
;
define('mypackage/bar',{
	log: function () {
		console.log("bar !");
	}
});
