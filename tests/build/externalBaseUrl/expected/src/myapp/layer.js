define('myapp/src',[
	"myLib/main"
], function () {
    return {
		log: function () {
			console.log("src !");
		}
	};
});
;
define('myLib/main',[],function () {
	return {
		init: function () {
			console.log("main !");
		}

	};
})