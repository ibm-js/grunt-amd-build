require.config({"config":{"requirejs-dplugins/i18n":{"bundlesMap":{"myapp/nls/src":["myapp/nls/bundleA"]},"localesMap":{"myapp/nls/src":["root","fr","fr-fr"]}}}});require.config({"config":{"requirejs-dplugins/css":{"layersMap":{"css/src.css":"myapp/css/layer.css"}}}});define('requirejs-text/text!myapp/msg.txt',[],function () { return '4. A text file';});
;define('requirejs-dplugins/i18n!myapp/nls/en/bundleB',{"MSG":"6. Root Text from Bundle B","_pseudoRoot":{},"_flattened":true});/**
 * CSS loading plugin for widgets.
 *
 * This plugin will load and wait for a css file. This can be handy to load the css
 * specific to a widget.
 *
 * This plugin uses the link load event and a work-around on old webkit browsers.
 * The work-around watches a stylesheet until its rules are
 * available (not null or undefined).
 *
 * This plugin will return the path of the inserted css file relative to requirejs baseUrl.
 *
 * @example:
 *      To load the css file `myproj/comp.css`:
 *      ```
 *      require(["requirejs-dplugins/css!myproj/comp.css"], function (){
 *          // Code placed here will wait for myproj/comp.css before running.
 *      });
 *      ```
 *
 *      Or as a widget dependency:
 *      ```
 *      define(["requirejs-dplugins/css!myproj/comp.css"], function (){
 *          // My widget factory
 *      });
 *      ```
 *
 * @module requirejs-dplugins/css
 */

define('requirejs-dplugins/css',[
	"./has",
	"dojo/Deferred",
	"module"
], function (has, Deferred, module) {
	"use strict";

	has.add("event-link-onload-api", function (global) {
		var wk = global.navigator.userAgent.match(/AppleWebKit\/([\d.]+)/);
		return !wk || parseInt(wk[1], 10) > 535;
	});
	var cache = {},
		lastInsertedLink;

	/**
	 * Return a promise that resolves when the specified link has finished loading.
	 * @param {HTMLLinkElement} link - The link element to be notified for.
	 * @returns {module:dojo/promise/Promise} - A promise.
	 */
	var listenOnLoad = function (link) {
		var def = new Deferred(),
			loadHandler = has("event-link-onload-api") ?
				function () {
					// We're using "readystatechange" because IE happily support both
					link.onreadystatechange = link.onload = function () {
						if (!link.readyState || link.readyState === "complete") {
							link.onreadystatechange = link.onload = null;
							def.resolve();
						}
					};
				} :
				function () {
					// watches a stylesheet for loading signs.
					var sheet = link.sheet || link.styleSheet,
						styleSheets = document.styleSheets;
					if (sheet && Array.prototype.lastIndexOf.call(styleSheets, sheet) !== -1) {
						def.resolve();
					} else {
						setTimeout(loadHandler, 25);
					}
				};

		loadHandler();
		return def.promise;
	};

	var loadCss = {
		id: module.id,

		/*jshint maxcomplexity: 11*/
		/**
		 * Loads a css file.
		 * @param {string} path - The css file to load.
		 * @param {Function} require - A local require function to use to load other modules.
		 * @param {Function} callback - A function to call when the specified stylesheets have been loaded.
		 * @method
		 */
		load: function (path, require, callback) {
			if (has("builder")) {
				buildFunctions.addOnce(loadList, path);
				callback();
				return;
			}

			// Replace single css bundles by corresponding layer.
			var config = module.config();
			if (config.layersMap) {
				path = config.layersMap[path] || path;
			}

			var head = document.head || document.getElementsByTagName("head")[0],
				url = require.toUrl(path),
				link;

			// if the url has not already been injected/loaded, create a new promise.
			if (!cache[url]) {
				// hook up load detector(s)
				link = document.createElement("link");
				link.rel = "stylesheet";
				link.type = "text/css";
				link.href = url;
				head.insertBefore(link, lastInsertedLink ? lastInsertedLink.nextSibling : head.firstChild);
				lastInsertedLink = link;
				cache[url] = listenOnLoad(link);
			}

			cache[url].then(function () {
				// The stylesheet has been loaded, so call the callback
				callback(path);
			});
		}
	};

	if (has("builder")) {
		// build variables
		var loadList = [],
			writePluginFiles;

		var buildFunctions = {
			/**
			 * Write the layersMap configuration to the corresponding modules layer.
			 * The configuration will look like this:
			 * ```js
			 * require.config({
			 *     config: {
			 *         "requirejs-dplugins/css": {
			 *             layersMap: {
			 *                 "module1.css": "path/to/layer.css",
			 *                 "module2.css": "path/to/layer.css"
			 *             }
			 *         }
			 *     }
			 * });
			 * ```
			 *
			 * @param {Function} write - This function takes a string as argument
			 * and writes it to the modules layer.
			 * @param {string} mid - Current module id.
			 * @param {string} dest - Current css layer path.
			 * @param {Array} loadList - List of css files contained in current css layer.
			 */
			writeConfig: function (write, mid, dest, loadList) {
				var cssConf = {
					config: {}
				};
				cssConf.config[mid] = {
					layersMap: {}
				};
				loadList.forEach(function (path) {
					cssConf.config[mid].layersMap[path] = dest;
				});

				write("require.config(" + JSON.stringify(cssConf) + ");");
			},

			/**
			 * Concat and optimize all css files required by a modules layer and write the result.
			 * The node module `clean-css` is responsible for optimizing the css and correcting
			 * images paths.
			 *
			 * @param {Function} writePluginFiles - The write function provided by the builder to `writeFile`.
			 * and writes it to the modules layer.
			 * @param {string} dest - Current css layer path.
			 * @param {Array} loadList - List of css files contained in current css layer.
			 */
			writeLayer: function (writePluginFiles, dest, loadList) {
				function tryRequire(paths) {
					var module;
					var path = paths.shift();
					if (path) {
						try {
							// This is a node-require so it is synchronous.
							module = require.nodeRequire(path);
						} catch (e) {
							return tryRequire(paths);
						}
					}
					return module;
				}

				var path = require.getNodePath(require.toUrl(module.id).replace(/[^\/]*$/, "node_modules/clean-css"));
				var CleanCSS = tryRequire([path, "clean-css"]);

				if (CleanCSS) {
					var result = "";
					loadList = loadList.map(require.toUrl)
						.filter(function (path) {
							var fs = require.nodeRequire("fs");
							if (!fs.existsSync(path)) {
								console.log(">> Css file '" + path + "' was not found.");
								return false;
							}
							return true;
						});
					loadList.forEach(function (src) {
						result += new CleanCSS({
							relativeTo: "./",
							target: dest
						}).minify("@import url(" + src + ");");
					});

					writePluginFiles(dest, result);
				} else {
					console.log(">> Node module clean-css not found. Skipping CSS inlining. If you want CSS inlining" +
						" run 'npm install clean-css' in your console.");
				}
			},

			/**
			 * Add the string to `ary` if it's not already in it.
			 * @param {Array} ary - Destination array.
			 * @param {string} element - Element to add.
			 */
			addOnce: function (ary, element) {
				if (ary.indexOf(element) === -1) {
					ary.push(element);
				}
			}
		};

		loadCss.writeFile = function (pluginName, resource, require, write) {
			writePluginFiles = write;
		};

		loadCss.onLayerEnd = function (write, data) {
			if (data.name && data.path) {
				var dest = data.path.replace(/^(?:\.\/)?(([^\/]*\/)*)[^\/]*$/, "$1css/layer.css");
				var destMid = data.name.replace(/^(([^\/]*\/)*)[^\/]*$/, "$1css/layer.css");

				// Write layer file
				buildFunctions.writeLayer(writePluginFiles, dest, loadList);
				// Write css config on the layer
				buildFunctions.writeConfig(write, module.id, destMid, loadList);
				// Reset loadList
				loadList = [];
			}
		};

		// Expose build functions to be used by delite/theme
		loadCss.buildFunctions = buildFunctions;
	}

	return loadCss;
});
;define('dojo/Deferred',[
	"./has",
	"./_base/lang",
	"./errors/CancelError",
	"./promise/Promise",
	"./has!config-deferredInstrumentation?./promise/instrumentation"
], function(has, lang, CancelError, Promise, instrumentation){
	"use strict";

	// module:
	//		dojo/Deferred

	var PROGRESS = 0,
			RESOLVED = 1,
			REJECTED = 2;
	var FULFILLED_ERROR_MESSAGE = "This deferred has already been fulfilled.";

	var freezeObject = Object.freeze || function(){};

	var signalWaiting = function(waiting, type, result, rejection, deferred){
		if(has("config-deferredInstrumentation")){
			if(type === REJECTED && Deferred.instrumentRejected && waiting.length === 0){
				Deferred.instrumentRejected(result, false, rejection, deferred);
			}
		}

		for(var i = 0; i < waiting.length; i++){
			signalListener(waiting[i], type, result, rejection);
		}
	};

	var signalListener = function(listener, type, result, rejection){
		var func = listener[type];
		var deferred = listener.deferred;
		if(func){
			try{
				var newResult = func(result);
				if(type === PROGRESS){
					if(typeof newResult !== "undefined"){
						signalDeferred(deferred, type, newResult);
					}
				}else{
					if(newResult && typeof newResult.then === "function"){
						listener.cancel = newResult.cancel;
						newResult.then(
								// Only make resolvers if they're actually going to be used
								makeDeferredSignaler(deferred, RESOLVED),
								makeDeferredSignaler(deferred, REJECTED),
								makeDeferredSignaler(deferred, PROGRESS));
						return;
					}
					signalDeferred(deferred, RESOLVED, newResult);
				}
			}catch(error){
				signalDeferred(deferred, REJECTED, error);
			}
		}else{
			signalDeferred(deferred, type, result);
		}

		if(has("config-deferredInstrumentation")){
			if(type === REJECTED && Deferred.instrumentRejected){
				Deferred.instrumentRejected(result, !!func, rejection, deferred.promise);
			}
		}
	};

	var makeDeferredSignaler = function(deferred, type){
		return function(value){
			signalDeferred(deferred, type, value);
		};
	};

	var signalDeferred = function(deferred, type, result){
		if(!deferred.isCanceled()){
			switch(type){
				case PROGRESS:
					deferred.progress(result);
					break;
				case RESOLVED:
					deferred.resolve(result);
					break;
				case REJECTED:
					deferred.reject(result);
					break;
			}
		}
	};

	var Deferred = function(canceler){
		// summary:
		//		Creates a new deferred. This API is preferred over
		//		`dojo/_base/Deferred`.
		// description:
		//		Creates a new deferred, as an abstraction over (primarily)
		//		asynchronous operations. The deferred is the private interface
		//		that should not be returned to calling code. That's what the
		//		`promise` is for. See `dojo/promise/Promise`.
		// canceler: Function?
		//		Will be invoked if the deferred is canceled. The canceler
		//		receives the reason the deferred was canceled as its argument.
		//		The deferred is rejected with its return value, or a new
		//		`dojo/errors/CancelError` instance.

		// promise: dojo/promise/Promise
		//		The public promise object that clients can add callbacks to. 
		var promise = this.promise = new Promise();

		var deferred = this;
		var fulfilled, result, rejection;
		var canceled = false;
		var waiting = [];

		if(has("config-deferredInstrumentation") && Error.captureStackTrace){
			Error.captureStackTrace(deferred, Deferred);
			Error.captureStackTrace(promise, Deferred);
		}

		this.isResolved = promise.isResolved = function(){
			// summary:
			//		Checks whether the deferred has been resolved.
			// returns: Boolean

			return fulfilled === RESOLVED;
		};

		this.isRejected = promise.isRejected = function(){
			// summary:
			//		Checks whether the deferred has been rejected.
			// returns: Boolean

			return fulfilled === REJECTED;
		};

		this.isFulfilled = promise.isFulfilled = function(){
			// summary:
			//		Checks whether the deferred has been resolved or rejected.
			// returns: Boolean

			return !!fulfilled;
		};

		this.isCanceled = promise.isCanceled = function(){
			// summary:
			//		Checks whether the deferred has been canceled.
			// returns: Boolean

			return canceled;
		};

		this.progress = function(update, strict){
			// summary:
			//		Emit a progress update on the deferred.
			// description:
			//		Emit a progress update on the deferred. Progress updates
			//		can be used to communicate updates about the asynchronous
			//		operation before it has finished.
			// update: any
			//		The progress update. Passed to progbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently no progress can be emitted.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				signalWaiting(waiting, PROGRESS, update, null, deferred);
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		this.resolve = function(value, strict){
			// summary:
			//		Resolve the deferred.
			// description:
			//		Resolve the deferred, putting it in a success state.
			// value: any
			//		The result of the deferred. Passed to callbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be resolved.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				// Set fulfilled, store value. After signaling waiting listeners unset
				// waiting.
				signalWaiting(waiting, fulfilled = RESOLVED, result = value, null, deferred);
				waiting = null;
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		var reject = this.reject = function(error, strict){
			// summary:
			//		Reject the deferred.
			// description:
			//		Reject the deferred, putting it in an error state.
			// error: any
			//		The error result of the deferred. Passed to errbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be rejected.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				if(has("config-deferredInstrumentation") && Error.captureStackTrace){
					Error.captureStackTrace(rejection = {}, reject);
				}
				signalWaiting(waiting, fulfilled = REJECTED, result = error, rejection, deferred);
				waiting = null;
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		this.then = promise.then = function(callback, errback, progback){
			// summary:
			//		Add new callbacks to the deferred.
			// description:
			//		Add new callbacks to the deferred. Callbacks can be added
			//		before or after the deferred is fulfilled.
			// callback: Function?
			//		Callback to be invoked when the promise is resolved.
			//		Receives the resolution value.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			//		Receives the rejection error.
			// progback: Function?
			//		Callback to be invoked when the promise emits a progress
			//		update. Receives the progress update.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback(s).
			//		This can be used for chaining many asynchronous operations.

			var listener = [progback, callback, errback];
			// Ensure we cancel the promise we're waiting for, or if callback/errback
			// have returned a promise, cancel that one.
			listener.cancel = promise.cancel;
			listener.deferred = new Deferred(function(reason){
				// Check whether cancel is really available, returned promises are not
				// required to expose `cancel`
				return listener.cancel && listener.cancel(reason);
			});
			if(fulfilled && !waiting){
				signalListener(listener, fulfilled, result, rejection);
			}else{
				waiting.push(listener);
			}
			return listener.deferred.promise;
		};

		this.cancel = promise.cancel = function(reason, strict){
			// summary:
			//		Inform the deferred it may cancel its asynchronous operation.
			// description:
			//		Inform the deferred it may cancel its asynchronous operation.
			//		The deferred's (optional) canceler is invoked and the
			//		deferred will be left in a rejected state. Can affect other
			//		promises that originate with the same deferred.
			// reason: any
			//		A message that may be sent to the deferred's canceler,
			//		explaining why it's being canceled.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be canceled.
			// returns: any
			//		Returns the rejection reason if the deferred was canceled
			//		normally.

			if(!fulfilled){
				// Cancel can be called even after the deferred is fulfilled
				if(canceler){
					var returnedReason = canceler(reason);
					reason = typeof returnedReason === "undefined" ? reason : returnedReason;
				}
				canceled = true;
				if(!fulfilled){
					// Allow canceler to provide its own reason, but fall back to a CancelError
					if(typeof reason === "undefined"){
						reason = new CancelError();
					}
					reject(reason);
					return reason;
				}else if(fulfilled === REJECTED && result === reason){
					return reason;
				}
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
		};

		freezeObject(promise);
	};

	Deferred.prototype.toString = function(){
		// returns: String
		//		Returns `[object Deferred]`.

		return "[object Deferred]";
	};

	if(instrumentation){
		instrumentation(Deferred);
	}

	return Deferred;
});
;define('dojo/promise/Promise',[
	"../_base/lang"
], function(lang){
	"use strict";

	// module:
	//		dojo/promise/Promise

	function throwAbstract(){
		throw new TypeError("abstract");
	}

	return lang.extend(function Promise(){
		// summary:
		//		The public interface to a deferred.
		// description:
		//		The public interface to a deferred. All promises in Dojo are
		//		instances of this class.
	}, {
		then: function(callback, errback, progback){
			// summary:
			//		Add new callbacks to the promise.
			// description:
			//		Add new callbacks to the deferred. Callbacks can be added
			//		before or after the deferred is fulfilled.
			// callback: Function?
			//		Callback to be invoked when the promise is resolved.
			//		Receives the resolution value.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			//		Receives the rejection error.
			// progback: Function?
			//		Callback to be invoked when the promise emits a progress
			//		update. Receives the progress update.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback(s).
			//		This can be used for chaining many asynchronous operations.

			throwAbstract();
		},

		cancel: function(reason, strict){
			// summary:
			//		Inform the deferred it may cancel its asynchronous operation.
			// description:
			//		Inform the deferred it may cancel its asynchronous operation.
			//		The deferred's (optional) canceler is invoked and the
			//		deferred will be left in a rejected state. Can affect other
			//		promises that originate with the same deferred.
			// reason: any
			//		A message that may be sent to the deferred's canceler,
			//		explaining why it's being canceled.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be canceled.
			// returns: any
			//		Returns the rejection reason if the deferred was canceled
			//		normally.

			throwAbstract();
		},

		isResolved: function(){
			// summary:
			//		Checks whether the promise has been resolved.
			// returns: Boolean

			throwAbstract();
		},

		isRejected: function(){
			// summary:
			//		Checks whether the promise has been rejected.
			// returns: Boolean

			throwAbstract();
		},

		isFulfilled: function(){
			// summary:
			//		Checks whether the promise has been resolved or rejected.
			// returns: Boolean

			throwAbstract();
		},

		isCanceled: function(){
			// summary:
			//		Checks whether the promise has been canceled.
			// returns: Boolean

			throwAbstract();
		},

		always: function(callbackOrErrback){
			// summary:
			//		Add a callback to be invoked when the promise is resolved
			//		or rejected.
			// callbackOrErrback: Function?
			//		A function that is used both as a callback and errback.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback/errback.

			return this.then(callbackOrErrback, callbackOrErrback);
		},

		otherwise: function(errback){
			// summary:
			//		Add new errbacks to the promise.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the errback.

			return this.then(null, errback);
		},

		trace: function(){
			return this;
		},

		traceRejected: function(){
			return this;
		},

		toString: function(){
			// returns: string
			//		Returns `[object Promise]`.

			return "[object Promise]";
		}
	});
});
;define('dojo/errors/CancelError',["./create"], function(create){
	// module:
	//		dojo/errors/CancelError

	/*=====
	return function(){
		// summary:
		//		Default error if a promise is canceled without a reason.
	};
	=====*/

	return create("CancelError", null, null, { dojoType: "cancel" });
});
;define('dojo/errors/create',["../_base/lang"], function(lang){
	return function(name, ctor, base, props){
		base = base || Error;

		var ErrorCtor = function(message){
			if(base === Error){
				if(Error.captureStackTrace){
					Error.captureStackTrace(this, ErrorCtor);
				}

				// Error.call() operates on the returned error
				// object rather than operating on |this|
				var err = Error.call(this, message),
					prop;

				// Copy own properties from err to |this|
				for(prop in err){
					if(err.hasOwnProperty(prop)){
						this[prop] = err[prop];
					}
				}

				// messsage is non-enumerable in ES5
				this.message = message;
				// stack is non-enumerable in at least Firefox
				this.stack = err.stack;
			}else{
				base.apply(this, arguments);
			}
			if(ctor){
				ctor.apply(this, arguments);
			}
		};

		ErrorCtor.prototype = lang.delegate(base.prototype, props);
		ErrorCtor.prototype.name = name;
		ErrorCtor.prototype.constructor = ErrorCtor;

		return ErrorCtor;
	};
});
;define('dojo/_base/lang',["./kernel", "../has", "../sniff"], function(dojo, has){
	// module:
	//		dojo/_base/lang

	has.add("bug-for-in-skips-shadowed", function(){
		// if true, the for-in iterator skips object properties that exist in Object's prototype (IE 6 - ?)
		for(var i in {toString: 1}){
			return 0;
		}
		return 1;
	});

	// Helper methods
	var _extraNames =
			has("bug-for-in-skips-shadowed") ?
				"hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor".split(".") : [],

		_extraLen = _extraNames.length,

		getProp = function(/*Array*/parts, /*Boolean*/create, /*Object*/context){
			if(!context){
				if(parts[0] && dojo.scopeMap[parts[0]]) {
					// Voodoo code from the old days where "dojo" or "dijit" maps to some special object
					// rather than just window.dojo
					context = dojo.scopeMap[parts.shift()][1];
				}else{
					context = dojo.global;
				}
			}

			try{
				for(var i = 0; i < parts.length; i++){
					var p = parts[i];
					if(!(p in context)){
						if(create){
							context[p] = {};
						}else{
							return;		// return undefined
						}
					}
					context = context[p];
				}
				return context; // mixed
			}catch(e){
				// "p in context" throws an exception when context is a number, boolean, etc. rather than an object,
				// so in that corner case just return undefined (by having no return statement)
			}
		},

		opts = Object.prototype.toString,

		efficient = function(obj, offset, startWith){
			return (startWith||[]).concat(Array.prototype.slice.call(obj, offset||0));
		},

		_pattern = /\{([^\}]+)\}/g;

	// Module export
	var lang = {
		// summary:
		//		This module defines Javascript language extensions.

		// _extraNames: String[]
		//		Lists property names that must be explicitly processed during for-in iteration
		//		in environments that have has("bug-for-in-skips-shadowed") true.
		_extraNames:_extraNames,

		_mixin: function(dest, source, copyFunc){
			// summary:
			//		Copies/adds all properties of source to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source.
			// source: Object
			//		The object from which to draw all properties to copy into dest.
			// copyFunc: Function?
			//		The process used to copy/add a property in source; defaults to the Javascript assignment operator.
			// returns:
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added to dest. Copying/adding each particular property is
			//		delegated to copyFunc (if any); copyFunc defaults to the Javascript assignment operator if not provided.
			//		Notice that by default, _mixin executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			var name, s, i, empty = {};
			for(name in source){
				// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
				// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
				// don't overwrite it with the toString() method that source inherited from Object.prototype
				s = source[name];
				if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
					dest[name] = copyFunc ? copyFunc(s) : s;
				}
			}

			if(has("bug-for-in-skips-shadowed")){
				if(source){
					for(i = 0; i < _extraLen; ++i){
						name = _extraNames[i];
						s = source[name];
						if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
							dest[name] = copyFunc ? copyFunc(s) : s;
						}
					}
				}
			}

			return dest; // Object
		},

		mixin: function(dest, sources){
			// summary:
			//		Copies/adds all properties of one or more sources to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source. If dest is falsy, then
			//		a new object is manufactured before copying/adding properties begins.
			// sources: Object...
			//		One of more objects from which to draw all properties to copy into dest. sources are processed
			//		left-to-right and if more than one of these objects contain the same property name, the right-most
			//		value "wins".
			// returns: Object
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added from sources to dest. sources are processed left to right.
			//		The Javascript assignment operator is used to copy/add each property; therefore, by default, mixin
			//		executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			// example:
			//		make a shallow copy of an object
			//	|	var copy = lang.mixin({}, source);
			// example:
			//		many class constructors often take an object which specifies
			//		values to be configured on the object. In this case, it is
			//		often simplest to call `lang.mixin` on the `this` object:
			//	|	declare("acme.Base", null, {
			//	|		constructor: function(properties){
			//	|			// property configuration:
			//	|			lang.mixin(this, properties);
			//	|
			//	|			console.log(this.quip);
			//	|			//	...
			//	|		},
			//	|		quip: "I wasn't born yesterday, you know - I've seen movies.",
			//	|		// ...
			//	|	});
			//	|
			//	|	// create an instance of the class and configure it
			//	|	var b = new acme.Base({quip: "That's what it does!" });
			// example:
			//		copy in properties from multiple objects
			//	|	var flattened = lang.mixin(
			//	|		{
			//	|			name: "Frylock",
			//	|			braces: true
			//	|		},
			//	|		{
			//	|			name: "Carl Brutanananadilewski"
			//	|		}
			//	|	);
			//	|
			//	|	// will print "Carl Brutanananadilewski"
			//	|	console.log(flattened.name);
			//	|	// will print "true"
			//	|	console.log(flattened.braces);

			if(!dest){ dest = {}; }
			for(var i = 1, l = arguments.length; i < l; i++){
				lang._mixin(dest, arguments[i]);
			}
			return dest; // Object
		},

		setObject: function(name, value, context){
			// summary:
			//		Set a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			//		Objects are created as needed along `path`. Returns the passed
			//		value if setting is successful or `undefined` if not.
			// name: String
			//		Path to a property, in the form "A.B.C".
			// value: anything
			//		value or object to place at location given by name
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		`dojo.global`.
			// example:
			//		set the value of `foo.bar.baz`, regardless of whether
			//		intermediate objects already exist:
			//	| lang.setObject("foo.bar.baz", value);
			// example:
			//		without `lang.setObject`, we often see code like this:
			//	| // ensure that intermediate objects are available
			//	| if(!obj["parent"]){ obj.parent = {}; }
			//	| if(!obj.parent["child"]){ obj.parent.child = {}; }
			//	| // now we can safely set the property
			//	| obj.parent.child.prop = "some value";
			//		whereas with `lang.setObject`, we can shorten that to:
			//	| lang.setObject("parent.child.prop", "some value", obj);

			var parts = name.split("."), p = parts.pop(), obj = getProp(parts, true, context);
			return obj && p ? (obj[p] = value) : undefined; // Object
		},

		getObject: function(name, create, context){
			// summary:
			//		Get a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			// name: String
			//		Path to an property, in the form "A.B.C".
			// create: Boolean?
			//		Optional. Defaults to `false`. If `true`, Objects will be
			//		created at any point along the 'path' that is undefined.
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			return getProp(name ? name.split(".") : [], create, context); // Object
		},

		exists: function(name, obj){
			// summary:
			//		determine if an object supports a given method
			// description:
			//		useful for longer api chains where you have to test each object in
			//		the chain. Useful for object and method detection.
			// name: String
			//		Path to an object, in the form "A.B.C".
			// obj: Object?
			//		Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			// example:
			//	| // define an object
			//	| var foo = {
			//	|		bar: { }
			//	| };
			//	|
			//	| // search the global scope
			//	| lang.exists("foo.bar"); // true
			//	| lang.exists("foo.bar.baz"); // false
			//	|
			//	| // search from a particular scope
			//	| lang.exists("bar", foo); // true
			//	| lang.exists("bar.baz", foo); // false
			return lang.getObject(name, false, obj) !== undefined; // Boolean
		},

		// Crockford (ish) functions

		isString: function(it){
			// summary:
			//		Return true if it is a String
			// it: anything
			//		Item to test.
			return (typeof it == "string" || it instanceof String); // Boolean
		},

		isArray: function(it){
			// summary:
			//		Return true if it is an Array.
			//		Does not work on Arrays created in other windows.
			// it: anything
			//		Item to test.
			return it && (it instanceof Array || typeof it == "array"); // Boolean
		},

		isFunction: function(it){
			// summary:
			//		Return true if it is a Function
			// it: anything
			//		Item to test.
			return opts.call(it) === "[object Function]";
		},

		isObject: function(it){
			// summary:
			//		Returns true if it is a JavaScript object (or an Array, a Function
			//		or null)
			// it: anything
			//		Item to test.
			return it !== undefined &&
				(it === null || typeof it == "object" || lang.isArray(it) || lang.isFunction(it)); // Boolean
		},

		isArrayLike: function(it){
			// summary:
			//		similar to isArray() but more permissive
			// it: anything
			//		Item to test.
			// returns:
			//		If it walks like a duck and quacks like a duck, return `true`
			// description:
			//		Doesn't strongly test for "arrayness".  Instead, settles for "isn't
			//		a string or number and has a length property". Arguments objects
			//		and DOM collections will return true when passed to
			//		isArrayLike(), but will return false when passed to
			//		isArray().
			return it && it !== undefined && // Boolean
				// keep out built-in constructors (Number, String, ...) which have length
				// properties
				!lang.isString(it) && !lang.isFunction(it) &&
				!(it.tagName && it.tagName.toLowerCase() == 'form') &&
				(lang.isArray(it) || isFinite(it.length));
		},

		isAlien: function(it){
			// summary:
			//		Returns true if it is a built-in function or some other kind of
			//		oddball that *should* report as a function but doesn't
			return it && !lang.isFunction(it) && /\{\s*\[native code\]\s*\}/.test(String(it)); // Boolean
		},

		extend: function(ctor, props){
			// summary:
			//		Adds all properties and methods of props to constructor's
			//		prototype, making them available to all instances created with
			//		constructor.
			// ctor: Object
			//		Target constructor to extend.
			// props: Object
			//		One or more objects to mix into ctor.prototype
			for(var i=1, l=arguments.length; i<l; i++){
				lang._mixin(ctor.prototype, arguments[i]);
			}
			return ctor; // Object
		},

		_hitchArgs: function(scope, method){
			var pre = lang._toArray(arguments, 2);
			var named = lang.isString(method);
			return function(){
				// arrayify arguments
				var args = lang._toArray(arguments);
				// locate our method
				var f = named ? (scope||dojo.global)[method] : method;
				// invoke with collected args
				return f && f.apply(scope || this, pre.concat(args)); // mixed
			}; // Function
		},

		hitch: function(scope, method){
			// summary:
			//		Returns a function that will only ever execute in the given scope.
			//		This allows for easy use of object member functions
			//		in callbacks and other places in which the "this" keyword may
			//		otherwise not reference the expected scope.
			//		Any number of default positional arguments may be passed as parameters
			//		beyond "method".
			//		Each of these values will be used to "placehold" (similar to curry)
			//		for the hitched function.
			// scope: Object
			//		The scope to use when method executes. If method is a string,
			//		scope is also the object containing method.
			// method: Function|String...
			//		A function to be hitched to scope, or the name of the method in
			//		scope to be hitched.
			// example:
			//	|	lang.hitch(foo, "bar")();
			//		runs foo.bar() in the scope of foo
			// example:
			//	|	lang.hitch(foo, myFunction);
			//		returns a function that runs myFunction in the scope of foo
			// example:
			//		Expansion on the default positional arguments passed along from
			//		hitch. Passed args are mixed first, additional args after.
			//	|	var foo = { bar: function(a, b, c){ console.log(a, b, c); } };
			//	|	var fn = lang.hitch(foo, "bar", 1, 2);
			//	|	fn(3); // logs "1, 2, 3"
			// example:
			//	|	var foo = { bar: 2 };
			//	|	lang.hitch(foo, function(){ this.bar = 10; })();
			//		execute an anonymous function in scope of foo
			if(arguments.length > 2){
				return lang._hitchArgs.apply(dojo, arguments); // Function
			}
			if(!method){
				method = scope;
				scope = null;
			}
			if(lang.isString(method)){
				scope = scope || dojo.global;
				if(!scope[method]){ throw(['lang.hitch: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
				return function(){ return scope[method].apply(scope, arguments || []); }; // Function
			}
			return !scope ? method : function(){ return method.apply(scope, arguments || []); }; // Function
		},

		delegate: (function(){
			// boodman/crockford delegation w/ cornford optimization
			function TMP(){}
			return function(obj, props){
				TMP.prototype = obj;
				var tmp = new TMP();
				TMP.prototype = null;
				if(props){
					lang._mixin(tmp, props);
				}
				return tmp; // Object
			};
		})(),
		/*=====
		delegate: function(obj, props){
			// summary:
			//		Returns a new object which "looks" to obj for properties which it
			//		does not have a value for. Optionally takes a bag of properties to
			//		seed the returned object with initially.
			// description:
			//		This is a small implementation of the Boodman/Crockford delegation
			//		pattern in JavaScript. An intermediate object constructor mediates
			//		the prototype chain for the returned object, using it to delegate
			//		down to obj for property lookup when object-local lookup fails.
			//		This can be thought of similarly to ES4's "wrap", save that it does
			//		not act on types but rather on pure objects.
			// obj: Object
			//		The object to delegate to for properties not found directly on the
			//		return object or in props.
			// props: Object...
			//		an object containing properties to assign to the returned object
			// returns:
			//		an Object of anonymous type
			// example:
			//	|	var foo = { bar: "baz" };
			//	|	var thinger = lang.delegate(foo, { thud: "xyzzy"});
			//	|	thinger.bar == "baz"; // delegated to foo
			//	|	foo.thud == undefined; // by definition
			//	|	thinger.thud == "xyzzy"; // mixed in from props
			//	|	foo.bar = "thonk";
			//	|	thinger.bar == "thonk"; // still delegated to foo's bar
		},
		=====*/

		_toArray: has("ie") ?
			(function(){
				function slow(obj, offset, startWith){
					var arr = startWith||[];
					for(var x = offset || 0; x < obj.length; x++){
						arr.push(obj[x]);
					}
					return arr;
				}
				return function(obj){
					return ((obj.item) ? slow : efficient).apply(this, arguments);
				};
			})() : efficient,
		/*=====
		 _toArray: function(obj, offset, startWith){
			 // summary:
			 //		Converts an array-like object (i.e. arguments, DOMCollection) to an
			 //		array. Returns a new Array with the elements of obj.
			 // obj: Object
			 //		the object to "arrayify". We expect the object to have, at a
			 //		minimum, a length property which corresponds to integer-indexed
			 //		properties.
			 // offset: Number?
			 //		the location in obj to start iterating from. Defaults to 0.
			 //		Optional.
			 // startWith: Array?
			 //		An array to pack with the properties of obj. If provided,
			 //		properties in obj are appended at the end of startWith and
			 //		startWith is the returned array.
		 },
		 =====*/

		partial: function(/*Function|String*/ method /*, ...*/){
			// summary:
			//		similar to hitch() except that the scope object is left to be
			//		whatever the execution context eventually becomes.
			// description:
			//		Calling lang.partial is the functional equivalent of calling:
			//		|	lang.hitch(null, funcName, ...);
			// method:
			//		The function to "wrap"
			var arr = [ null ];
			return lang.hitch.apply(dojo, arr.concat(lang._toArray(arguments))); // Function
		},

		clone: function(/*anything*/ src){
			// summary:
			//		Clones objects (including DOM nodes) and all children.
			//		Warning: do not clone cyclic structures.
			// src:
			//		The object to clone
			if(!src || typeof src != "object" || lang.isFunction(src)){
				// null, undefined, any non-object, or function
				return src;	// anything
			}
			if(src.nodeType && "cloneNode" in src){
				// DOM Node
				return src.cloneNode(true); // Node
			}
			if(src instanceof Date){
				// Date
				return new Date(src.getTime());	// Date
			}
			if(src instanceof RegExp){
				// RegExp
				return new RegExp(src);   // RegExp
			}
			var r, i, l;
			if(lang.isArray(src)){
				// array
				r = [];
				for(i = 0, l = src.length; i < l; ++i){
					if(i in src){
						r.push(lang.clone(src[i]));
					}
				}
				// we don't clone functions for performance reasons
				//		}else if(d.isFunction(src)){
				//			// function
				//			r = function(){ return src.apply(this, arguments); };
			}else{
				// generic objects
				r = src.constructor ? new src.constructor() : {};
			}
			return lang._mixin(r, src, lang.clone);
		},


		trim: String.prototype.trim ?
			function(str){ return str.trim(); } :
			function(str){ return str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); },
		/*=====
		 trim: function(str){
			 // summary:
			 //		Trims whitespace from both sides of the string
			 // str: String
			 //		String to be trimmed
			 // returns: String
			 //		Returns the trimmed string
			 // description:
			 //		This version of trim() was selected for inclusion into the base due
			 //		to its compact size and relatively good performance
			 //		(see [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript)
			 //		Uses String.prototype.trim instead, if available.
			 //		The fastest but longest version of this function is located at
			 //		lang.string.trim()
		 },
		 =====*/

		replace: function(tmpl, map, pattern){
			// summary:
			//		Performs parameterized substitutions on a string. Throws an
			//		exception if any parameter is unmatched.
			// tmpl: String
			//		String to be used as a template.
			// map: Object|Function
			//		If an object, it is used as a dictionary to look up substitutions.
			//		If a function, it is called for every substitution with following parameters:
			//		a whole match, a name, an offset, and the whole template
			//		string (see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/String/replace
			//		for more details).
			// pattern: RegEx?
			//		Optional regular expression objects that overrides the default pattern.
			//		Must be global and match one item. The default is: /\{([^\}]+)\}/g,
			//		which matches patterns like that: "{xxx}", where "xxx" is any sequence
			//		of characters, which doesn't include "}".
			// returns: String
			//		Returns the substituted string.
			// example:
			//	|	// uses a dictionary for substitutions:
			//	|	lang.replace("Hello, {name.first} {name.last} AKA {nick}!",
			//	|		{
			//	|			nick: "Bob",
			//	|			name: {
			//	|				first:	"Robert",
			//	|				middle: "X",
			//	|				last:		"Cringely"
			//	|			}
			//	|		});
			//	|	// returns: Hello, Robert Cringely AKA Bob!
			// example:
			//	|	// uses an array for substitutions:
			//	|	lang.replace("Hello, {0} {2}!",
			//	|		["Robert", "X", "Cringely"]);
			//	|	// returns: Hello, Robert Cringely!
			// example:
			//	|	// uses a function for substitutions:
			//	|	function sum(a){
			//	|		var t = 0;
			//	|		arrayforEach(a, function(x){ t += x; });
			//	|		return t;
			//	|	}
			//	|	lang.replace(
			//	|		"{count} payments averaging {avg} USD per payment.",
			//	|		lang.hitch(
			//	|			{ payments: [11, 16, 12] },
			//	|			function(_, key){
			//	|				switch(key){
			//	|					case "count": return this.payments.length;
			//	|					case "min":		return Math.min.apply(Math, this.payments);
			//	|					case "max":		return Math.max.apply(Math, this.payments);
			//	|					case "sum":		return sum(this.payments);
			//	|					case "avg":		return sum(this.payments) / this.payments.length;
			//	|				}
			//	|			}
			//	|		)
			//	|	);
			//	|	// prints: 3 payments averaging 13 USD per payment.
			// example:
			//	|	// uses an alternative PHP-like pattern for substitutions:
			//	|	lang.replace("Hello, ${0} ${2}!",
			//	|		["Robert", "X", "Cringely"], /\$\{([^\}]+)\}/g);
			//	|	// returns: Hello, Robert Cringely!

			return tmpl.replace(pattern || _pattern, lang.isFunction(map) ?
				map : function(_, k){ return lang.getObject(k, false, map); });
		}
	};

	has("extend-dojo") && lang.mixin(dojo, lang);

	return lang;
});

;define('dojo/sniff',["./has"], function(has){
	// module:
	//		dojo/sniff

	/*=====
	return function(){
		// summary:
		//		This module sets has() flags based on the current browser.
		//		It returns the has() function.
	};
	=====*/

	if(has("host-browser")){
		var n = navigator,
			dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		has.add("air", dua.indexOf("AdobeAIR") >= 0);
		has.add("msapp", parseFloat(dua.split("MSAppHost/")[1]) || undefined);
		has.add("khtml", dav.indexOf("Konqueror") >= 0 ? tv : undefined);
		has.add("webkit", parseFloat(dua.split("WebKit/")[1]) || undefined);
		has.add("chrome", parseFloat(dua.split("Chrome/")[1]) || undefined);
		has.add("safari", dav.indexOf("Safari")>=0 && !has("chrome") ? parseFloat(dav.split("Version/")[1]) : undefined);
		has.add("mac", dav.indexOf("Macintosh") >= 0);
		has.add("quirks", document.compatMode == "BackCompat");
		if(dua.match(/(iPhone|iPod|iPad)/)){
			var p = RegExp.$1.replace(/P/, "p");
			var v = dua.match(/OS ([\d_]+)/) ? RegExp.$1 : "1";
			var os = parseFloat(v.replace(/_/, ".").replace(/_/g, ""));
			has.add(p, os);		// "iphone", "ipad" or "ipod"
			has.add("ios", os);
		}
		has.add("android", parseFloat(dua.split("Android ")[1]) || undefined);
		has.add("bb", (dua.indexOf("BlackBerry") >= 0 || dua.indexOf("BB10") >= 0) && parseFloat(dua.split("Version/")[1]) || undefined);
		has.add("trident", parseFloat(dav.split("Trident/")[1]) || undefined);

		has.add("svg", typeof SVGAngle !== "undefined");

		if(!has("webkit")){
			// Opera
			if(dua.indexOf("Opera") >= 0){
				// see http://dev.opera.com/articles/view/opera-ua-string-changes and http://www.useragentstring.com/pages/Opera/
				// 9.8 has both styles; <9.8, 9.9 only old style
				has.add("opera", tv >= 9.8 ? parseFloat(dua.split("Version/")[1]) || tv : tv);
			}

			// Mozilla and firefox
			if(dua.indexOf("Gecko") >= 0 && !has("khtml") && !has("webkit") && !has("trident")){
				has.add("mozilla", tv);
			}
			if(has("mozilla")){
				//We really need to get away from this. Consider a sane isGecko approach for the future.
				has.add("ff", parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
			}

			// IE
			if(document.all && !has("opera")){
				var isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;

				//In cases where the page has an HTTP header or META tag with
				//X-UA-Compatible, then it is in emulation mode.
				//Make sure isIE reflects the desired version.
				//document.documentMode of 5 means quirks mode.
				//Only switch the value if documentMode's major version
				//is different from isIE's major version.
				var mode = document.documentMode;
				if(mode && mode != 5 && Math.floor(isIE) != mode){
					isIE = mode;
				}

				has.add("ie", isIE);
			}

			// Wii
			has.add("wii", typeof opera != "undefined" && opera.wiiremote);
		}
	}

	return has;
});
;define('dojo/_base/kernel',["../has", "./config", "require", "module"], function(has, config, require, module){
	// module:
	//		dojo/_base/kernel

	// This module is the foundational module of the dojo boot sequence; it defines the dojo object.

	var
		// loop variables for this module
		i, p,

		// create dojo, dijit, and dojox
		// FIXME: in 2.0 remove dijit, dojox being created by dojo
		global = (function () { return this; })(),
		dijit = {},
		dojox = {},
		dojo = {
			// summary:
			//		This module is the foundational module of the dojo boot sequence; it defines the dojo object.

			// notice dojo takes ownership of the value of the config module
			config:config,
			global:global,
			dijit:dijit,
			dojox:dojox
		};


	// Configure the scope map. For a 100% AMD application, the scope map is not needed other than to provide
	// a _scopeName property for the dojo, dijit, and dojox root object so those packages can create
	// unique names in the global space.
	//
	// Built, legacy modules use the scope map to allow those modules to be expressed as if dojo, dijit, and dojox,
	// where global when in fact they are either global under different names or not global at all. In v1.6-, the
	// config variable "scopeMap" was used to map names as used within a module to global names. This has been
	// subsumed by the AMD map configuration variable which can relocate packages to different names. For backcompat,
	// only the "*" mapping is supported. See http://livedocs.dojotoolkit.org/developer/design/loader#legacy-cross-domain-mode for details.
	//
	// The following computations contort the packageMap for this dojo instance into a scopeMap.
	var scopeMap =
			// a map from a name used in a legacy module to the (global variable name, object addressed by that name)
			// always map dojo, dijit, and dojox
			{
				dojo:["dojo", dojo],
				dijit:["dijit", dijit],
				dojox:["dojox", dojox]
			},

		packageMap =
			// the package map for this dojo instance; note, a foreign loader or no pacakgeMap results in the above default config
			(require.map && require.map[module.id.match(/[^\/]+/)[0]]),

		item;


	// process all mapped top-level names for this instance of dojo
	for(p in packageMap){
		if(scopeMap[p]){
			// mapped dojo, dijit, or dojox
			scopeMap[p][0] = packageMap[p];
		}else{
			// some other top-level name
			scopeMap[p] = [packageMap[p], {}];
		}
	}

	// publish those names to _scopeName and, optionally, the global namespace
	for(p in scopeMap){
		item = scopeMap[p];
		item[1]._scopeName = item[0];
		if(!config.noGlobals){
			global[item[0]] = item[1];
		}
	}
	dojo.scopeMap = scopeMap;

	/*===== dojo.__docParserConfigureScopeMap(scopeMap); =====*/

	// FIXME: dojo.baseUrl and dojo.config.baseUrl should be deprecated
	dojo.baseUrl = dojo.config.baseUrl = require.baseUrl;
	dojo.isAsync = !has("dojo-loader") || require.async;
	dojo.locale = config.locale;

	var rev = "$Rev: 2bde291 $".match(/[0-9a-f]{7,}/);
	dojo.version = {
		// summary:
		//		Version number of the Dojo Toolkit
		// description:
		//		Hash about the version, including
		//
		//		- major: Integer: Major version. If total version is "1.2.0beta1", will be 1
		//		- minor: Integer: Minor version. If total version is "1.2.0beta1", will be 2
		//		- patch: Integer: Patch version. If total version is "1.2.0beta1", will be 0
		//		- flag: String: Descriptor flag. If total version is "1.2.0beta1", will be "beta1"
		//		- revision: Number: The Git rev from which dojo was pulled

		major: 1, minor: 10, patch: 1, flag: "",
		revision: rev ? rev[0] : NaN,
		toString: function(){
			var v = dojo.version;
			return v.major + "." + v.minor + "." + v.patch + v.flag + " (" + v.revision + ")";	// String
		}
	};

	// If has("extend-dojo") is truthy, then as a dojo module is defined it should push it's definitions
	// into the dojo object, and conversely. In 2.0, it will likely be unusual to augment another object
	// as a result of defining a module. This has feature gives a way to force 2.0 behavior as the code
	// is migrated. Absent specific advice otherwise, set extend-dojo to truthy.
	has.add("extend-dojo", 1);


	(Function("d", "d.eval = function(){return d.global.eval ? d.global.eval(arguments[0]) : eval(arguments[0]);}"))(dojo);
	/*=====
	dojo.eval = function(scriptText){
		// summary:
		//		A legacy method created for use exclusively by internal Dojo methods. Do not use this method
		//		directly unless you understand its possibly-different implications on the platforms your are targeting.
		// description:
		//		Makes an attempt to evaluate scriptText in the global scope. The function works correctly for browsers
		//		that support indirect eval.
		//
		//		As usual, IE does not. On IE, the only way to implement global eval is to
		//		use execScript. Unfortunately, execScript does not return a value and breaks some current usages of dojo.eval.
		//		This implementation uses the technique of executing eval in the scope of a function that is a single scope
		//		frame below the global scope; thereby coming close to the global scope. Note carefully that
		//
		//		dojo.eval("var pi = 3.14;");
		//
		//		will define global pi in non-IE environments, but define pi only in a temporary local scope for IE. If you want
		//		to define a global variable using dojo.eval, write something like
		//
		//		dojo.eval("window.pi = 3.14;")
		// scriptText:
		//		The text to evaluation.
		// returns:
		//		The result of the evaluation. Often `undefined`
	};
	=====*/


	if(has("host-rhino")){
		dojo.exit = function(exitcode){
			quit(exitcode);
		};
	}else{
		dojo.exit = function(){
		};
	}

	has.add("dojo-guarantee-console",
		// ensure that console.log, console.warn, etc. are defined
		1
	);
	if(has("dojo-guarantee-console")){
		typeof console != "undefined" || (console = {});
		//	Be careful to leave 'log' always at the end
		var cn = [
			"assert", "count", "debug", "dir", "dirxml", "error", "group",
			"groupEnd", "info", "profile", "profileEnd", "time", "timeEnd",
			"trace", "warn", "log"
		];
		var tn;
		i = 0;
		while((tn = cn[i++])){
			if(!console[tn]){
				(function(){
					var tcn = tn + "";
					console[tcn] = ('log' in console) ? function(){
						var a = Array.prototype.slice.call(arguments);
						a.unshift(tcn + ":");
						console["log"](a.join(" "));
					} : function(){};
					console[tcn]._fake = true;
				})();
			}
		}
	}

	has.add("dojo-debug-messages",
		// include dojo.deprecated/dojo.experimental implementations
		!!config.isDebug
	);
	dojo.deprecated = dojo.experimental =  function(){};
	if(has("dojo-debug-messages")){
		dojo.deprecated = function(/*String*/ behaviour, /*String?*/ extra, /*String?*/ removal){
			// summary:
			//		Log a debug message to indicate that a behavior has been
			//		deprecated.
			// behaviour: String
			//		The API or behavior being deprecated. Usually in the form
			//		of "myApp.someFunction()".
			// extra: String?
			//		Text to append to the message. Often provides advice on a
			//		new function or facility to achieve the same goal during
			//		the deprecation period.
			// removal: String?
			//		Text to indicate when in the future the behavior will be
			//		removed. Usually a version number.
			// example:
			//	| dojo.deprecated("myApp.getTemp()", "use myApp.getLocaleTemp() instead", "1.0");

			var message = "DEPRECATED: " + behaviour;
			if(extra){ message += " " + extra; }
			if(removal){ message += " -- will be removed in version: " + removal; }
			console.warn(message);
		};

		dojo.experimental = function(/* String */ moduleName, /* String? */ extra){
			// summary:
			//		Marks code as experimental.
			// description:
			//		This can be used to mark a function, file, or module as
			//		experimental.	 Experimental code is not ready to be used, and the
			//		APIs are subject to change without notice.	Experimental code may be
			//		completed deleted without going through the normal deprecation
			//		process.
			// moduleName: String
			//		The name of a module, or the name of a module file or a specific
			//		function
			// extra: String?
			//		some additional message for the user
			// example:
			//	| dojo.experimental("dojo.data.Result");
			// example:
			//	| dojo.experimental("dojo.weather.toKelvin()", "PENDING approval from NOAA");

			var message = "EXPERIMENTAL: " + moduleName + " -- APIs subject to change without notice.";
			if(extra){ message += " " + extra; }
			console.warn(message);
		};
	}

	has.add("dojo-modulePaths",
		// consume dojo.modulePaths processing
		1
	);
	if(has("dojo-modulePaths")){
		// notice that modulePaths won't be applied to any require's before the dojo/_base/kernel factory is run;
		// this is the v1.6- behavior.
		if(config.modulePaths){
			dojo.deprecated("dojo.modulePaths", "use paths configuration");
			var paths = {};
			for(p in config.modulePaths){
				paths[p.replace(/\./g, "/")] = config.modulePaths[p];
			}
			require({paths:paths});
		}
	}

	has.add("dojo-moduleUrl",
		// include dojo.moduleUrl
		1
	);
	if(has("dojo-moduleUrl")){
		dojo.moduleUrl = function(/*String*/module, /*String?*/url){
			// summary:
			//		Returns a URL relative to a module.
			// example:
			//	|	var pngPath = dojo.moduleUrl("acme","images/small.png");
			//	|	console.dir(pngPath); // list the object properties
			//	|	// create an image and set it's source to pngPath's value:
			//	|	var img = document.createElement("img");
			//	|	img.src = pngPath;
			//	|	// add our image to the document
			//	|	dojo.body().appendChild(img);
			// example:
			//		you may de-reference as far as you like down the package
			//		hierarchy.  This is sometimes handy to avoid lengthy relative
			//		urls or for building portable sub-packages. In this example,
			//		the `acme.widget` and `acme.util` directories may be located
			//		under different roots (see `dojo.registerModulePath`) but the
			//		the modules which reference them can be unaware of their
			//		relative locations on the filesystem:
			//	|	// somewhere in a configuration block
			//	|	dojo.registerModulePath("acme.widget", "../../acme/widget");
			//	|	dojo.registerModulePath("acme.util", "../../util");
			//	|
			//	|	// ...
			//	|
			//	|	// code in a module using acme resources
			//	|	var tmpltPath = dojo.moduleUrl("acme.widget","templates/template.html");
			//	|	var dataPath = dojo.moduleUrl("acme.util","resources/data.json");

			dojo.deprecated("dojo.moduleUrl()", "use require.toUrl", "2.0");

			// require.toUrl requires a filetype; therefore, just append the suffix "/*.*" to guarantee a filetype, then
			// remove the suffix from the result. This way clients can request a url w/out a filetype. This should be
			// rare, but it maintains backcompat for the v1.x line (note: dojo.moduleUrl will be removed in v2.0).
			// Notice * is an illegal filename so it won't conflict with any real path map that may exist the paths config.
			var result = null;
			if(module){
				result = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : "") + "/*.*").replace(/\/\*\.\*/, "") + (url ? "" : "/");
			}
			return result;
		};
	}

	dojo._hasResource = {}; // for backward compatibility with layers built with 1.6 tooling

	return dojo;
});
;define('dojo/_base/config',["../has", "require"], function(has, require){
	// module:
	//		dojo/_base/config

/*=====
return {
	// summary:
	//		This module defines the user configuration during bootstrap.
	// description:
	//		By defining user configuration as a module value, an entire configuration can be specified in a build,
	//		thereby eliminating the need for sniffing and or explicitly setting in the global variable dojoConfig.
	//		Also, when multiple instances of dojo exist in a single application, each will necessarily be located
	//		at an unique absolute module identifier as given by the package configuration. Implementing configuration
	//		as a module allows for specifying unique, per-instance configurations.
	// example:
	//		Create a second instance of dojo with a different, instance-unique configuration (assume the loader and
	//		dojo.js are already loaded).
	//		|	// specify a configuration that creates a new instance of dojo at the absolute module identifier "myDojo"
	//		|	require({
	//		|		packages:[{
	//		|			name:"myDojo",
	//		|			location:".", //assume baseUrl points to dojo.js
	//		|		}]
	//		|	});
	//		|
	//		|	// specify a configuration for the myDojo instance
	//		|	define("myDojo/config", {
	//		|		// normal configuration variables go here, e.g.,
	//		|		locale:"fr-ca"
	//		|	});
	//		|
	//		|	// load and use the new instance of dojo
	//		|	require(["myDojo"], function(dojo){
	//		|		// dojo is the new instance of dojo
	//		|		// use as required
	//		|	});

	// isDebug: Boolean
	//		Defaults to `false`. If set to `true`, ensures that Dojo provides
	//		extended debugging feedback via Firebug. If Firebug is not available
	//		on your platform, setting `isDebug` to `true` will force Dojo to
	//		pull in (and display) the version of Firebug Lite which is
	//		integrated into the Dojo distribution, thereby always providing a
	//		debugging/logging console when `isDebug` is enabled. Note that
	//		Firebug's `console.*` methods are ALWAYS defined by Dojo. If
	//		`isDebug` is false and you are on a platform without Firebug, these
	//		methods will be defined as no-ops.
	isDebug: false,

	// locale: String
	//		The locale to assume for loading localized resources in this page,
	//		specified according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt).
	//		Must be specified entirely in lowercase, e.g. `en-us` and `zh-cn`.
	//		See the documentation for `dojo.i18n` and `dojo.requireLocalization`
	//		for details on loading localized resources. If no locale is specified,
	//		Dojo assumes the locale of the user agent, according to `navigator.userLanguage`
	//		or `navigator.language` properties.
	locale: undefined,

	// extraLocale: Array
	//		No default value. Specifies additional locales whose
	//		resources should also be loaded alongside the default locale when
	//		calls to `dojo.requireLocalization()` are processed.
	extraLocale: undefined,

	// baseUrl: String
	//		The directory in which `dojo.js` is located. Under normal
	//		conditions, Dojo auto-detects the correct location from which it
	//		was loaded. You may need to manually configure `baseUrl` in cases
	//		where you have renamed `dojo.js` or in which `<base>` tags confuse
	//		some browsers (e.g. IE 6). The variable `dojo.baseUrl` is assigned
	//		either the value of `djConfig.baseUrl` if one is provided or the
	//		auto-detected root if not. Other modules are located relative to
	//		this path. The path should end in a slash.
	baseUrl: undefined,

	// modulePaths: [deprecated] Object
	//		A map of module names to paths relative to `dojo.baseUrl`. The
	//		key/value pairs correspond directly to the arguments which
	//		`dojo.registerModulePath` accepts. Specifying
	//		`djConfig.modulePaths = { "foo": "../../bar" }` is the equivalent
	//		of calling `dojo.registerModulePath("foo", "../../bar");`. Multiple
	//		modules may be configured via `djConfig.modulePaths`.
	modulePaths: {},

	// addOnLoad: Function|Array
	//		Adds a callback via dojo/ready. Useful when Dojo is added after
	//		the page loads and djConfig.afterOnLoad is true. Supports the same
	//		arguments as dojo/ready. When using a function reference, use
	//		`djConfig.addOnLoad = function(){};`. For object with function name use
	//		`djConfig.addOnLoad = [myObject, "functionName"];` and for object with
	//		function reference use
	//		`djConfig.addOnLoad = [myObject, function(){}];`
	addOnLoad: null,

	// parseOnLoad: Boolean
	//		Run the parser after the page is loaded
	parseOnLoad: false,

	// require: String[]
	//		An array of module names to be loaded immediately after dojo.js has been included
	//		in a page.
	require: [],

	// defaultDuration: Number
	//		Default duration, in milliseconds, for wipe and fade animations within dijits.
	//		Assigned to dijit.defaultDuration.
	defaultDuration: 200,

	// dojoBlankHtmlUrl: String
	//		Used by some modules to configure an empty iframe. Used by dojo/io/iframe and
	//		dojo/back, and dijit/popup support in IE where an iframe is needed to make sure native
	//		controls do not bleed through the popups. Normally this configuration variable
	//		does not need to be set, except when using cross-domain/CDN Dojo builds.
	//		Save dojo/resources/blank.html to your domain and set `djConfig.dojoBlankHtmlUrl`
	//		to the path on your domain your copy of blank.html.
	dojoBlankHtmlUrl: undefined,

	// ioPublish: Boolean?
	//		Set this to true to enable publishing of topics for the different phases of
	//		IO operations. Publishing is done via dojo/topic.publish(). See dojo/main.__IoPublish for a list
	//		of topics that are published.
	ioPublish: false,

	// useCustomLogger: Anything?
	//		If set to a value that evaluates to true such as a string or array and
	//		isDebug is true and Firebug is not available or running, then it bypasses
	//		the creation of Firebug Lite allowing you to define your own console object.
	useCustomLogger: undefined,

	// transparentColor: Array
	//		Array containing the r, g, b components used as transparent color in dojo.Color;
	//		if undefined, [255,255,255] (white) will be used.
	transparentColor: undefined,
	
	// deps: Function|Array
	//		Defines dependencies to be used before the loader has been loaded.
	//		When provided, they cause the loader to execute require(deps, callback) 
	//		once it has finished loading. Should be used with callback.
	deps: undefined,
	
	// callback: Function|Array
	//		Defines a callback to be used when dependencies are defined before 
	//		the loader has been loaded. When provided, they cause the loader to 
	//		execute require(deps, callback) once it has finished loading. 
	//		Should be used with deps.
	callback: undefined,
	
	// deferredInstrumentation: Boolean
	//		Whether deferred instrumentation should be loaded or included
	//		in builds.
	deferredInstrumentation: true,

	// useDeferredInstrumentation: Boolean|String
	//		Whether the deferred instrumentation should be used.
	//
	//		* `"report-rejections"`: report each rejection as it occurs.
	//		* `true` or `1` or `"report-unhandled-rejections"`: wait 1 second
	//			in an attempt to detect unhandled rejections.
	useDeferredInstrumentation: "report-unhandled-rejections"
};
=====*/

	var result = {};
	if(has("dojo-config-api")){
		// must be the dojo loader; take a shallow copy of require.rawConfig
		var src = require.rawConfig, p;
		for(p in src){
			result[p] = src[p];
		}
	}else{
		var adviseHas = function(featureSet, prefix, booting){
			for(p in featureSet){
				p!="has" && has.add(prefix + p, featureSet[p], 0, booting);
			}
		};
		var global = (function () { return this; })();
		result = has("dojo-loader") ?
			// must be a built version of the dojo loader; all config stuffed in require.rawConfig
			require.rawConfig :
			// a foreign loader
			global.dojoConfig || global.djConfig || {};
		adviseHas(result, "config", 1);
		adviseHas(result.has, "", 1);
	}

	if(!result.locale && typeof navigator != "undefined"){
		// Default locale for browsers.
		var language = (navigator.language || navigator.userLanguage);
		if(language){
			result.locale = language.toLowerCase();
		}
	}

	return result;
});

;define('dojo/has',["require", "module"], function(require, module){
	// module:
	//		dojo/has
	// summary:
	//		Defines the has.js API and several feature tests used by dojo.
	// description:
	//		This module defines the has API as described by the project has.js with the following additional features:
	//
	//		- the has test cache is exposed at has.cache.
	//		- the method has.add includes a forth parameter that controls whether or not existing tests are replaced
	//		- the loader's has cache may be optionally copied into this module's has cahce.
	//
	//		This module adopted from https://github.com/phiggins42/has.js; thanks has.js team!

	// try to pull the has implementation from the loader; both the dojo loader and bdLoad provide one
	// if using a foreign loader, then the has cache may be initialized via the config object for this module
	// WARNING: if a foreign loader defines require.has to be something other than the has.js API, then this implementation fail
	var has = require.has || function(){};
	if(!has("dojo-has-api")){
		var
			isBrowser =
				// the most fundamental decision: are we in the browser?
				typeof window != "undefined" &&
				typeof location != "undefined" &&
				typeof document != "undefined" &&
				window.location == location && window.document == document,

			// has API variables
			global = (function () { return this; })(),
			doc = isBrowser && document,
			element = doc && doc.createElement("DiV"),
			cache = (module.config && module.config()) || {};

		has = function(name){
			// summary:
			//		Return the current value of the named feature.
			//
			// name: String|Integer
			//		The name (if a string) or identifier (if an integer) of the feature to test.
			//
			// description:
			//		Returns the value of the feature named by name. The feature must have been
			//		previously added to the cache by has.add.

			return typeof cache[name] == "function" ? (cache[name] = cache[name](global, doc, element)) : cache[name]; // Boolean
		};

		has.cache = cache;

		has.add = function(name, test, now, force){
			// summary:
			//	 	Register a new feature test for some named feature.
			// name: String|Integer
			//	 	The name (if a string) or identifier (if an integer) of the feature to test.
			// test: Function
			//		 A test function to register. If a function, queued for testing until actually
			//		 needed. The test function should return a boolean indicating
			//	 	the presence of a feature or bug.
			// now: Boolean?
			//		 Optional. Omit if `test` is not a function. Provides a way to immediately
			//		 run the test and cache the result.
			// force: Boolean?
			//	 	Optional. If the test already exists and force is truthy, then the existing
			//	 	test will be replaced; otherwise, add does not replace an existing test (that
			//	 	is, by default, the first test advice wins).
			// example:
			//		A redundant test, testFn with immediate execution:
			//	|	has.add("javascript", function(){ return true; }, true);
			//
			// example:
			//		Again with the redundantness. You can do this in your tests, but we should
			//		not be doing this in any internal has.js tests
			//	|	has.add("javascript", true);
			//
			// example:
			//		Three things are passed to the testFunction. `global`, `document`, and a generic element
			//		from which to work your test should the need arise.
			//	|	has.add("bug-byid", function(g, d, el){
			//	|		// g	== global, typically window, yadda yadda
			//	|		// d	== document object
			//	|		// el == the generic element. a `has` element.
			//	|		return false; // fake test, byid-when-form-has-name-matching-an-id is slightly longer
			//	|	});

			(typeof cache[name]=="undefined" || force) && (cache[name]= test);
			return now && has(name);
		};

		// since we're operating under a loader that doesn't provide a has API, we must explicitly initialize
		// has as it would have otherwise been initialized by the dojo loader; use has.add to the builder
		// can optimize these away iff desired
		has.add("host-browser", isBrowser);
		has.add("host-node", (typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
		has.add("host-rhino", (typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
		has.add("dom", isBrowser);
		has.add("dojo-dom-ready-api", 1);
		has.add("dojo-sniff", 1);
	}

	if(has("host-browser")){
		// Common application level tests
		has.add("dom-addeventlistener", !!document.addEventListener);

		// Do the device and browser have touch capability?
		has.add("touch", "ontouchstart" in document
			|| ("onpointerdown" in document && navigator.maxTouchPoints > 0)
			|| window.navigator.msMaxTouchPoints);

		// Touch events support
		has.add("touch-events", "ontouchstart" in document);

		// Pointer Events support
		has.add("pointer-events", "onpointerdown" in document);
		has.add("MSPointer", "msMaxTouchPoints" in navigator); //IE10 (+IE11 preview)

		// I don't know if any of these tests are really correct, just a rough guess
		has.add("device-width", screen.availWidth || innerWidth);

		// Tests for DOMNode.attributes[] behavior:
		//	 - dom-attributes-explicit - attributes[] only lists explicitly user specified attributes
		//	 - dom-attributes-specified-flag (IE8) - need to check attr.specified flag to skip attributes user didn't specify
		//	 - Otherwise, in IE6-7. attributes[] will list hundreds of values, so need to do outerHTML to get attrs instead.
		var form = document.createElement("form");
		has.add("dom-attributes-explicit", form.attributes.length == 0); // W3C
		has.add("dom-attributes-specified-flag", form.attributes.length > 0 && form.attributes.length < 40);	// IE8
	}

	has.clearElement = function(element){
		// summary:
		//	 Deletes the contents of the element passed to test functions.
		element.innerHTML= "";
		return element;
	};

	has.normalize = function(id, toAbsMid){
		// summary:
		//	 Resolves id into a module id based on possibly-nested tenary expression that branches on has feature test value(s).
		//
		// toAbsMid: Function
		//	 Resolves a relative module id into an absolute module id
		var
			tokens = id.match(/[\?:]|[^:\?]*/g), i = 0,
			get = function(skip){
				var term = tokens[i++];
				if(term == ":"){
					// empty string module name, resolves to 0
					return 0;
				}else{
					// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
					if(tokens[i++] == "?"){
						if(!skip && has(term)){
							// matched the feature, get the first value from the options
							return get();
						}else{
							// did not match, get the second value, passing over the first
							get(true);
							return get(skip);
						}
					}
					// a module
					return term || 0;
				}
			};
		id = get();
		return id && toAbsMid(id);
	};

	has.load = function(id, parentRequire, loaded){
		// summary:
		//		Conditional loading of AMD modules based on a has feature test value.
		// id: String
		//		Gives the resolved module id to load.
		// parentRequire: Function
		//		The loader require function with respect to the module that contained the plugin resource in it's
		//		dependency list.
		// loaded: Function
		//	 Callback to loader that consumes result of plugin demand.

		if(id){
			parentRequire([id], loaded);
		}else{
			loaded();
		}
	};

	return has;
});
;define('requirejs-dplugins/has',["module"], function (module) {
	var cache = (module.config && module.config()) || {};
	var tokensRE = /[\?:]|[^:\?]+/g;

	function resolve(resource, has, isBuild) {
		var tokens = resource.match(tokensRE);
		var i = 0;
		var get = function (skip) {
			var term = tokens[i++];
			if (term === ":") {
				// empty string module name; therefore, no dependency
				return "";
			} else {
				// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
				if (tokens[i++] === "?") {
					var hasResult = has(term);
					if (hasResult === undefined && isBuild) {
						return undefined;
					} else if (!skip && hasResult) {
						// matched the feature, get the first value from the options
						return get();
					} else {
						// did not match, get the second value, passing over the first
						get(true);
						return get(skip);
					}
				}
				// A module or empty string.
				// This allows to tell apart "undefined flag at build time" and "no module required" cases.
				return term || "";
			}
		};
		return get();
	}

	function forEachModule(tokens, callback) {
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i] !== ":" && tokens[i] !== "?" && tokens[i + 1] !== "?") {
				callback(tokens[i], i);
			}
		}
	}

	var has = function (name) {
		var global = (function () {
			return this;
		})();

		return typeof cache[name] === "function" ? (cache[name] = cache[name](global)) : cache[name]; // Boolean
	};

	has.cache = cache;

	has.add = function (name, test, now, force) {
		if (!has("builder")) {
			(typeof cache[name] === "undefined" || force) && (cache[name] = test);
			return now && has(name);
		}
	};

	has.normalize = function (resource, normalize) {
		var tokens = resource.match(tokensRE);

		forEachModule(tokens, function (module, index) {
			tokens[index] = normalize(module);
		});

		return tokens.join("");
	};

	has.load = function (resource, req, onLoad, config) {
		config = config || {};

		if (!resource) {
			onLoad();
			return;
		}

		var mid = resolve(resource, has, config.isBuild);

		if (mid) {
			req([mid], onLoad);
		} else {
			onLoad();
		}
	};

	has.addModules = function (pluginName, resource, addModules) {
		var modulesToInclude = [];

		var mid = resolve(resource, has, true);
		if (mid) {
			modulesToInclude.push(mid);
		} else if (typeof mid === "undefined") {
			// has expression cannot be resolved at build time so include all the modules just in case.
			var tokens = resource.match(tokensRE);
			forEachModule(tokens, function (module) {
				modulesToInclude.push(module);
			});
		}

		addModules(modulesToInclude);
	};

	return has;
});
;/**
 * Plugin based on requirejs i18n
 * see: http://github.com/requirejs/i18n for details
 */
define('requirejs-dplugins/i18n',["./i18n/common", "./i18n/build", "module"], function (common, build, module) {

	var localesList,
		writePluginFile,

		mixin = common.mixin,
		eachProp = common.eachProp,
		parseName = common.parseName,
		getMasterMid = common.getMasterMid,

		normalizeBundlesMap = function (bundlesMap) {
			var result = {};
			eachProp(bundlesMap, function (layer, bundleList) {
				bundleList.forEach(function (bundle) {
					result[bundle] = layer;
				});
			});
			return result;
		},

		// Transform a bundle from a language layer to a root bundle.
		rootify = function (bundle, locale) {
			var result = {};
			if (bundle._pseudoRoot) {
				result[locale] = {};
				mixin(result, bundle._pseudoRoot);
				delete bundle._pseudoRoot;
				mixin(result[locale], bundle);
				bundle = result;
			}
			return bundle;
		},

		// Construct the best language bundle by merging from most specific locale to less specific locale.
		resolveAMD = function (name, req, onLoad) {
			var masterMid = getMasterMid(name);

			//First, fetch the master bundle, it knows what locales are available.
			req([masterMid], function (master) {
				var getBundleAndMixin = function (prefix, suffix, locale, value) {
					var mixBundle = function (bundle) {
						mixin(value, bundle);
						locale = common.getParentLocale(locale);
						if (!bundle._flattened && locale) {
							getBundleAndMixin(prefix, suffix, locale, value);
						} else {
							value._flattened = true;
							onLoad(value);
						}
					};

					if (master[locale] === true || master[locale] === 1) {
						req([prefix + locale + '/' + suffix], mixBundle);
					} else {
						// locale is on the master bundle or locale is unexisting
						mixBundle(master[locale] || {});
					}
				};

				master = rootify(master, name.masterLocale);
				getBundleAndMixin(name.prefix, name.suffix, name.requestedLocale, {});
			});
		},

		getLayer = function (name, layer, moduleConfig, getParentLocale, req, onLoad) {
			var locale = name.requestedLocale,
				localesList = moduleConfig.localesMap[layer];

			while (locale && localesList.indexOf(locale) < 0) {
				locale = getParentLocale(locale);
			}

			if (locale) {
				name.masterLocale = locale;

				req([layer + "_" + locale], function () {
					pickFromLayer(name, moduleConfig, req, onLoad);
				});
			} else {
				console.log("i18n: no relevant layer " + layer + " found for locale " + name.requestedLocale + ".");
				onLoad();
			}
		},


		tryLayer = function (name, layer, moduleConfig, getParentLocale, req, onLoad) {
			var helper = function (locale) {
				if (locale) {
					req(["maybe!" + layer + "_" + locale], function (bundle) {
						if (bundle) {
							name.masterLocale = locale;
							pickFromLayer(name, moduleConfig, req, onLoad);
						} else {
							helper(getParentLocale(locale));
						}
					});
				} else {
					console.log("i18n: no relevant layer " + layer + " found for locale " + name.requestedLocale + ".");
					onLoad();
				}
			};

			helper(name.requestedLocale);
		},

		pickFromLayer = function (name, moduleConfig, req, onLoad) {
			var masterMid = getMasterMid(name);

			if (name.requestedLocale === name.masterLocale || moduleConfig.layerOnly || !moduleConfig.enhanceLayer) {
				req([masterMid], function (bundle) {
					if (bundle.root) {
						bundle = bundle.root;
					}
					onLoad(bundle);
				});
			} else {
				resolveAMD(name, req, onLoad);
			}
		};

	return {
		/* jshint maxcomplexity:15 */
		load: function (name, req, onLoad, config) {
			if (!name) {
				onLoad();
				return;
			}

			config = config || {};

			var moduleConfig = {},
				masterMid,
				layer;

			// Copy the config
			mixin(moduleConfig, typeof module.config === "function" ? module.config() || {} : {});

			if (config.isBuild) {
				localesList = moduleConfig.localesList;
				onLoad();
				return;
			}

			moduleConfig.enhanceLayer = moduleConfig.enhanceLayer === undefined ? true : moduleConfig.enhanceLayer;

			// Parse name and set the locale if a top level bundle is required
			name = parseName(name);
			name.requestedLocale = name.requestedLocale || common.getLocale(moduleConfig.locale || config.locale);
			masterMid = getMasterMid(name);

			// If there is no layer, classic AMD mode
			if (!moduleConfig.bundlesMap) {
				resolveAMD(name, req, onLoad);
				return;
			}

			// From now on there is at least one layer available

			// Check if requested module is in a layer
			moduleConfig.bundlesMap = normalizeBundlesMap(moduleConfig.bundlesMap);
			layer = moduleConfig.bundlesMap[masterMid];

			if (!layer && moduleConfig.layerOnly) {
				console.log("i18n: module " + masterMid + " not found in layer.");
				onLoad();
				return;
			} else if (!layer) {
				resolveAMD(name, req, onLoad);
				return;
			}

			// The module is in a layer

			if (moduleConfig.languagePack) {
				// Drop language pack mode, hence need to try every possible layer
				tryLayer(name, layer, moduleConfig, common.getParentLocale, req, onLoad);
				return;
			} else {
				// There is a locale list for the layer
				getLayer(name, layer, moduleConfig, common.getParentLocale, req, onLoad);
				return;
			}
		},
		/* jshint  maxcomplexity:10 */

		write: function (pluginName, moduleName, write) {
			var name = parseName(moduleName),
				bundle;

			if (name.requestedLocale) {
				bundle = build.resolveSync(name.requestedLocale, name);
				if (name.requestedLocale !== "root") {
					bundle._pseudoRoot = {};
					bundle._flattened = true;
				}
				write.asModule(pluginName + "!" + moduleName, "define(" + JSON.stringify(bundle) + ")");
			} else {
				build.addBundleToNlsLayer(name);
			}
		},

		writeFile: function (pluginName, resource, requirejs, writeFile) {
			writePluginFile = writeFile;
		},

		onLayerEnd: function (write, data) {
			if (data.name && data.path) {
				var layersContent;

				build.setLocalesList(localesList);

				layersContent = build.getLayersContent();

				build.writeLayers(layersContent, data, writePluginFile);
				build.writeConfig(module.id, data, write);
			}
			build.reset();
		}
	};
});
;define('requirejs-dplugins/i18n/build',["./common", "require"], function (common, requirejs) {
	var bundlesList = [],
		localesList,
		layerMid,

		mixin = common.mixin,
		eachProp = common.eachProp,
		getMasterMid = common.getMasterMid,

		getLayerMid = function (data) {
			var match;
			if (!layerMid) {
				match = data.name.match(/^(.*\/)?(.*)$/);
				layerMid = (match[1] || "") + "nls/" + match[2];
			}
			return layerMid;
		},

		getLayerPath = function (data, loc) {
			var match = data.path.match(/^(.*\/)?(.*)\.js$/);
			return (match[1] || "") + "nls/" + match[2] + "_" + loc + ".js";
		},

		getAllAvailableLocales = function () {
			localesList = [];
			bundlesList.forEach(function (name) {
				var root = requirejs(getMasterMid(name));

				eachProp(root, function (loc) {
					if (root[loc] && localesList.indexOf(loc) < 0) {
						localesList.push(loc);
					}
				});
			});
			return localesList;
		},

		normalizeRoot = function (bundle, name) {
			bundle.root = (bundle.root === true || bundle.root === 1) ?
				requirejs(name.prefix + "root/" + name.suffix) : bundle.root;
			return bundle;
		},

		getPseudoRoots = function (root) {
			var pseudoRoots = {};
			eachProp(root, function (loc) {
				var parent = common.getParentLocale(loc);
				while (parent && parent !== "root") {
					pseudoRoots[parent] = pseudoRoots[parent] || {};
					pseudoRoots[parent][loc] = true;
					parent = common.getParentLocale(parent);
				}
			});
			return pseudoRoots;
		},

		resolveSync = function (locale, name, root) {
			var loc = locale,
				result = {},
				localizedBundle;

			if (arguments.length === 2) {
				root = normalizeRoot(requirejs(getMasterMid(name)), name);
			}

			if (loc !== "root") {
				while (loc && loc !== "root") {
					if (root[loc]) {
						localizedBundle = requirejs(name.prefix + loc + "/" + name.suffix);
						mixin(result, localizedBundle);
					}
					loc = common.getParentLocale(loc);
				}
				localizedBundle = root.root;
				mixin(result, localizedBundle);
			} else {
				mixin(result, root);
			}

			return result;
		};

	return {
		addBundleToNlsLayer: function (name) {
			bundlesList.push(name);
		},

		setLocalesList: function (locList) {
			localesList = locList ? locList.slice() : getAllAvailableLocales();
			if (localesList.indexOf("root") < 0) {
				localesList.push("root");
			}
		},

		reset: function () {
			bundlesList = [];
			localesList = undefined;
			layerMid = undefined;
		},

		getLayersContent: function () {
			var layersContent = {};

			bundlesList.forEach(function (name) {
				var root = normalizeRoot(requirejs(getMasterMid(name)), name),
					pseudoRoots = getPseudoRoots(root);

				localesList.forEach(function (loc) {
					var result = resolveSync(loc, name, root);

					layersContent[loc] = layersContent[loc] || "";

					var mid;
					if (loc !== "root") {
						mid = name.prefix + loc + "/" + name.suffix;
						result._flattened = true;
						result._pseudoRoot = pseudoRoots[loc] || {};
					} else {
						mid = name.prefix + name.suffix;
					}

					layersContent[loc] += 'define("' + mid + '",' + JSON.stringify(result) + ");";
				});
			});

			return layersContent;
		},

		writeLayers: function (layersContent, data, writePluginFile) {
			eachProp(layersContent, function (loc, content) {
				content += "define('" + getLayerMid(data) + "_" + loc + "', true);";
				writePluginFile(getLayerPath(data, loc), content);
			});
		},

		writeConfig: function (pluginName, data, write) {
			var bundles = bundlesList.map(getMasterMid),
				layerMid = getLayerMid(data),
				i18nConf = {
					config: {}
				};
			i18nConf.config[pluginName] = {
				bundlesMap: {},
				localesMap: {}
			};
			i18nConf.config[pluginName].bundlesMap[layerMid] = bundles;
			i18nConf.config[pluginName].localesMap[layerMid] = localesList;

			// write i18n config on the layer
			write("require.config(" + JSON.stringify(i18nConf) + ");");
		},

		resolveSync: resolveSync
	};
});
;define('requirejs-dplugins/i18n/common',["./parentLocale"], function (parentLocale) {

	// regexp for reconstructing the master bundle name from parts of the regexp match
	// "foo/bar/baz/nls/en-ca/foo".match(nlsRegExp) gives:
	// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "en-ca", "foo"]
	// nlsRegExp.exec("foo/bar/baz/nls/foo") gives:
	// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "foo", ""]
	// so, if match[3] is blank, it means this is the top bundle definition.
	var nlsRegExp = /(^.*(?:^|\/)nls\/)([^\/]*)\/?([^\/]*)$/;

	return {
		eachProp: function (obj, func) {
			var prop;
			for (prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					func(prop, obj[prop]);
				}
			}
		},

		getLocale: function (locale) {
			if (!locale) {
				locale = typeof navigator === "undefined" ? "root" :
					(navigator.language ||
					// IE <= 10
					navigator.userLanguage ||
					"root");
			}
			// just to be extra-sure
			return locale.toLowerCase();
		},

		getParentLocale: function (loc) {
			if (!loc || loc === "root") {
				return undefined;
			}
			if (parentLocale[loc]) {
				return parentLocale[loc];
			}

			var parts = loc.split("-");
			parts.pop();
			return (parts.length > 0) ? parts.join("-") : "root";
		},


		// Simple function to mix in properties from source into target,
		// but only if target does not already have a property of the same name.
		// This is not robust in IE for transferring methods that match
		// Object.prototype names, but the uses of mixin here seem unlikely to
		// trigger a problem related to that.
		mixin: function mixin(target, source, force) {
			var prop;
			for (prop in source) {
				if (source.hasOwnProperty(prop) && (!target.hasOwnProperty(prop) || force)) {
					target[prop] = source[prop];
				} else if (typeof source[prop] === 'object') {
					if (!target[prop] && source[prop]) {
						target[prop] = {};
					}
					mixin(target[prop], source[prop], force);
				}
			}
		},

		// Parse the resource mid and return a usable object.	
		parseName: function (name) {
			var match = name.match(nlsRegExp);

			// If match[3] is blank, it means this is the top bundle definition,
			// hence suffix is match[2] and locale is null.
			return {
				prefix: match[1],
				masterLocale: "root",
				requestedLocale: match[3] ? match[2] : null,
				suffix: match[3] || match[2]
			};
		},


		getMasterMid: function (name) {
			return name.masterLocale === "root" ? name.prefix + name.suffix :
				name.prefix + name.masterLocale + "/" + name.suffix;
		}
	};
});
;define('requirejs-dplugins/i18n/parentLocale',{
	"en-ag": "en-001",
	"en-ai": "en-001",
	"en-bb": "en-001",
	"en-bm": "en-001",
	"en-bs": "en-001",
	"en-bw": "en-001",
	"en-bz": "en-001",
	"en-cc": "en-001",
	"en-ck": "en-001",
	"en-cm": "en-001",
	"en-cx": "en-001",
	"en-dm": "en-001",
	"en-er": "en-001",
	"en-fj": "en-001",
	"en-fm": "en-001",
	"en-gb": "en-001",
	"en-gd": "en-001",
	"en-gh": "en-001",
	"en-gm": "en-001",
	"en-gy": "en-001",
	"en-jm": "en-001",
	"en-ke": "en-001",
	"en-ki": "en-001",
	"en-kn": "en-001",
	"en-ky": "en-001",
	"en-lc": "en-001",
	"en-lr": "en-001",
	"en-ls": "en-001",
	"en-mg": "en-001",
	"en-ms": "en-001",
	"en-mu": "en-001",
	"en-mw": "en-001",
	"en-na": "en-001",
	"en-nf": "en-001",
	"en-ng": "en-001",
	"en-nr": "en-001",
	"en-nu": "en-001",
	"en-pg": "en-001",
	"en-ph": "en-001",
	"en-pn": "en-001",
	"en-pw": "en-001",
	"en-rw": "en-001",
	"en-sb": "en-001",
	"en-sc": "en-001",
	"en-sd": "en-001",
	"en-sl": "en-001",
	"en-ss": "en-001",
	"en-sx": "en-001",
	"en-sz": "en-001",
	"en-tc": "en-001",
	"en-tk": "en-001",
	"en-to": "en-001",
	"en-tt": "en-001",
	"en-tv": "en-001",
	"en-tz": "en-001",
	"en-ug": "en-001",
	"en-vc": "en-001",
	"en-vu": "en-001",
	"en-ws": "en-001",
	"en-za": "en-001",
	"en-zm": "en-001",
	"en-zw": "en-001",
	"en-150": "en-gb",
	"en-au": "en-gb",
	"en-be": "en-gb",
	"en-dg": "en-gb",
	"en-fk": "en-gb",
	"en-gg": "en-gb",
	"en-gi": "en-gb",
	"en-hk": "en-gb",
	"en-ie": "en-gb",
	"en-im": "en-gb",
	"en-in": "en-gb",
	"en-io": "en-gb",
	"en-je": "en-gb",
	"en-mo": "en-gb",
	"en-mt": "en-gb",
	"en-nz": "en-gb",
	"en-pk": "en-gb",
	"en-sg": "en-gb",
	"en-sh": "en-gb",
	"en-vg": "en-gb",
	"es-ar": "es-419",
	"es-bo": "es-419",
	"es-cl": "es-419",
	"es-co": "es-419",
	"es-cr": "es-419",
	"es-cu": "es-419",
	"es-do": "es-419",
	"es-ec": "es-419",
	"es-gt": "es-419",
	"es-hn": "es-419",
	"es-mx": "es-419",
	"es-ni": "es-419",
	"es-pa": "es-419",
	"es-pe": "es-419",
	"es-pr": "es-419",
	"es-py": "es-419",
	"es-sv": "es-419",
	"es-us": "es-419",
	"es-uy": "es-419",
	"es-ve": "es-419",
	"pt-ao": "pt-pt",
	"pt-cv": "pt-pt",
	"pt-gw": "pt-pt",
	"pt-mo": "pt-pt",
	"pt-mz": "pt-pt",
	"pt-st": "pt-pt",
	"pt-tl": "pt-pt",
	"az-cyrl": "root",
	"bs-cyrl": "root",
	"en-dsrt": "root",
	"ha-arab": "root",
	"mn-mong": "root",
	"ms-arab": "root",
	"pa-arab": "root",
	"shi-latn": "root",
	"sr-latn": "root",
	"uz-arab": "root",
	"uz-cyrl": "root",
	"vai-latn": "root",
	"zh-hant": "root",
	"zh-hant-mo": "zh-hant-hk"
});
;/**
 * @license RequireJS text 2.0.12 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('requirejs-text/text',['module'], function (module) {
    'use strict';

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.12',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.indexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1, name.length);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});
;define('mypackage/bar',[],function () {
	return {
		log: function () {
			console.log("1. bar localpackage");
		}
	};
});
;define('mypackage/foo',["./bar"], function (bar) {
	return {
		log: function () {
			bar.log();
			console.log("3. foo patch");
		}
	};
});
;define('../bar-mapped',[],function () {
	return {
		log: function () {
			console.log("2. bar mapped for foo");
		}
	};
});
;define('myapp/src',[
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
