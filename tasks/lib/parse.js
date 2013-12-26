/**
 * @license Copyright (c) 2010-2013, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 *
 */
/* jshint -W074 */
module.exports = (function () {
    'use strict';

    var esprima = require('esprima');

    //This string is saved off because JSLint complains
    //about obj.arguments use, as 'reserved word'
    var argPropName = 'arguments';

    //From an esprima example for traversing its ast.

    function traverse(object, visitor) {
        var key, child;

        if (!object) {
            return;
        }

        if (visitor.call(null, object) === false) {
            return false;
        }
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                child = object[key];
                if (typeof child === 'object' && child !== null) {
                    if (traverse(child, visitor) === false) {
                        return false;
                    }
                }
            }
        }
    }
	
    //Like traverse, but visitor returning false just
    //stops that subtree analysis, not the rest of tree
    //visiting.
    function traverseBroad(object, visitor) {
        var key, child;

        if (!object) {
            return;
        }

        if (visitor.call(null, object) === false) {
            return false;
        }
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                child = object[key];
                if (typeof child === 'object' && child !== null) {
                    traverse(child, visitor);
                }
            }
        }
    }
	
	function isDefineNodeWithArgs (node) {
        return node && node.type === 'CallExpression' &&
               node.callee && node.callee.type === 'Identifier' &&
               node.callee.name === 'define' && node[argPropName];
    }

    /**
     * Pulls out dependencies from an array literal with just string members.
     * If string literals, will just return those string values in an array,
     * skipping other items in the array.
     *
     * @param {Node} node an AST node.
     *
     * @returns {Array} an array of strings.
     * If null is returned, then it means the input node was not a valid
     * dependency.
     */

    function getValidDeps(node) {
        if (!node || node.type !== 'ArrayExpression' || !node.elements) {
            return;
        }

        var deps = [];

        node.elements.some(function (elem) {
            if (elem.type === 'Literal') {
                deps.push(elem.value);
            }
        });

        return deps.length ? deps : undefined;
    }

    var parse = {};


    /**
     * Handles parsing a file recursively for require calls.
     * @param {Array} parentNode the AST node to start with.
     * @param {Function} onMatch function to call on a parse match.
     * @param {Object} [options] This is normally the build config options if
     * it is passed.
     */
    parse.recurse = function (object, onMatch, options) {
        //Like traverse, but skips if branches that would not be processed
        //after has application that results in tests of true or false boolean
        //literal values.
        var key, child,
            hasHas = options && options.has;

        if (!object) {
            return;
        }

        //If has replacement has resulted in if(true){} or if(false){}, take
        //the appropriate branch and skip the other one.
        if (hasHas && object.type === 'IfStatement' && object.test.type &&
            object.test.type === 'Literal') {
            if (object.test.value) {
                //Take the if branch
                this.recurse(object.consequent, onMatch, options);
            } else {
                //Take the else branch
                this.recurse(object.alternate, onMatch, options);
            }
        } else {
            if (this.parseNode(object, onMatch) === false) {
                return;
            }
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    child = object[key];
                    if (typeof child === 'object' && child !== null) {
                        this.recurse(child, onMatch, options);
                    }
                }
            }
        }
    };

    /**
     * Finds require("") calls inside a CommonJS anonymous module wrapped
     * in a define function, given an AST node for the definition function.
     * @param {Node} node the AST node for the definition function.
     * @returns {Array} and array of dependency names. Can be of zero length.
     */
    parse.getAnonDepsFromNode = function (node) {
        var deps = [],
            funcArgLength;

        if (node) {
            this.findRequireDepNames(node, deps);

            //If no deps, still add the standard CommonJS require, exports,
            //module, in that order, to the deps, but only if specified as
            //function args. In particular, if exports is used, it is favored
            //over the return value of the function, so only add it if asked.
            funcArgLength = node.params && node.params.length;
            if (funcArgLength) {
                deps = (funcArgLength > 1 ? ["require", "exports", "module"] : ["require"]).concat(deps);
            }
        }
        return deps;
    };


    /**
     * Finds all dependencies specified in dependency arrays and inside
     * simplified commonjs wrappers.
     * @param {String} fileName
     * @param {String} fileContents
     *
     * @returns {Array} an array of dependency strings. The dependencies
     * have not been normalized, they may be relative IDs.
     */
    parse.findDependencies = function (fileName, fileContents, options) {
        var dependencies = [],
            astRoot = esprima.parse(fileContents);

        parse.recurse(astRoot, function (callName, config, name, deps) {
            if (deps) {
                dependencies = dependencies.concat(deps);
            }
        }, options);

        return dependencies;
    };

    //define.amd reference, as in: if (define.amd)
    parse.refsDefineAmd = function (node) {
        return node && node.type === 'MemberExpression' &&
            node.object && node.object.name === 'define' &&
            node.object.type === 'Identifier' &&
            node.property && node.property.name === 'amd' &&
            node.property.type === 'Identifier';
    };

    //require(), requirejs(), require.config() and requirejs.config()
    parse.hasRequire = function (node) {
        var callName,
            c = node && node.callee;

        if (node && node.type === 'CallExpression' && c) {
            if (c.type === 'Identifier' &&
                (c.name === 'require' ||
                    c.name === 'requirejs')) {
                //A require/requirejs({}, ...) call
                callName = c.name;
            } else if (c.type === 'MemberExpression' &&
                c.object &&
                c.object.type === 'Identifier' &&
                (c.object.name === 'require' ||
                    c.object.name === 'requirejs') &&
                c.property && c.property.name === 'config') {
                // require/requirejs.config({}) call
                callName = c.object.name + 'Config';
            }
        }

        return callName;
    };

    //define()
    parse.hasDefine = function (node) {
        return node && node.type === 'CallExpression' && node.callee &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'define';
    };

    parse.findRequireDepNames = function (node, deps) {
        traverse(node, function (node) {
            var arg;

            if (node && node.type === 'CallExpression' && node.callee &&
                node.callee.type === 'Identifier' &&
                node.callee.name === 'require' &&
                node[argPropName] && node[argPropName].length === 1) {

                arg = node[argPropName][0];
                if (arg.type === 'Literal') {
                    deps.push(arg.value);
                }
            }
        });
    };

    /**
     * Determines if a specific node is a valid require or define/require.def
     * call.
     * @param {Array} node
     * @param {Function} onMatch a function to call when a match is found.
     * It is passed the match name, and the config, name, deps possible args.
     * The config, name and deps args are not normalized.
     *
     * @returns {String} a JS source string with the valid require/define call.
     * Otherwise null.
     */
    parse.parseNode = function (node, onMatch) {
        var name, deps, cjsDeps, arg, factory, exp, refsDefine, bodyNode,
            args = node && node[argPropName],
            callName = parse.hasRequire(node);

        if (callName === 'require' || callName === 'requirejs') {
            //A plain require/requirejs call
            arg = node[argPropName] && node[argPropName][0];
            if (arg.type !== 'ArrayExpression') {
                if (arg.type === 'ObjectExpression') {
                    //A config call, try the second arg.
                    arg = node[argPropName][1];
                }
            }

            deps = getValidDeps(arg);
            if (!deps) {
                return;
            }

            return onMatch("require", null, null, deps, node);
        } else if (parse.hasDefine(node) && args && args.length) {
            name = args[0];
            deps = args[1];
            factory = args[2];

            if (name.type === 'ArrayExpression') {
                //No name, adjust args
                factory = deps;
                deps = name;
                name = null;
            } else if (name.type === 'FunctionExpression') {
                //Just the factory, no name or deps
                factory = name;
                name = deps = null;
            } else if (name.type !== 'Literal') {
                //An object literal, just null out
                name = deps = factory = null;
            }

            if (name && name.type === 'Literal' && deps) {
                if (deps.type === 'FunctionExpression') {
                    //deps is the factory
                    factory = deps;
                    deps = null;
                } else if (deps.type === 'ObjectExpression') {
                    //deps is object literal, null out
                    deps = factory = null;
                } else if (deps.type === 'Identifier' && args.length === 2) {
                    // define('id', factory)
                    deps = factory = null;
                }
            }

            if (deps && deps.type === 'ArrayExpression') {
                deps = getValidDeps(deps);
            } else if (factory && factory.type === 'FunctionExpression') {
                //If no deps and a factory function, could be a commonjs sugar
                //wrapper, scan the function for dependencies.
                cjsDeps = parse.getAnonDepsFromNode(factory);
                if (cjsDeps.length) {
                    deps = cjsDeps;
                }
            } else if (deps || factory) {
                //Does not match the shape of an AMD call.
                return;
            }

            //Just save off the name as a string instead of an AST object.
            if (name && name.type === 'Literal') {
                name = name.value;
            }

            return onMatch("define", null, name, deps, node);
        } else if (node.type === 'CallExpression' && node.callee &&
            node.callee.type === 'FunctionExpression' &&
            node.callee.body && node.callee.body.body &&
            node.callee.body.body.length === 1 &&
            node.callee.body.body[0].type === 'IfStatement') {
            bodyNode = node.callee.body.body[0];
            //Look for a define(Identifier) case, but only if inside an
            //if that has a define.amd test
            if (bodyNode.consequent && bodyNode.consequent.body) {
                exp = bodyNode.consequent.body[0];
                if (exp.type === 'ExpressionStatement' && exp.expression &&
                    parse.hasDefine(exp.expression) &&
                    exp.expression.arguments &&
                    exp.expression.arguments.length === 1 &&
                    exp.expression.arguments[0].type === 'Identifier') {

                    //Calls define(Identifier) as first statement in body.
                    //Confirm the if test references define.amd
                    traverse(bodyNode.test, function (node) {
                        if (parse.refsDefineAmd(node)) {
                            refsDefine = true;
                            return false;
                        }
                    });

                    if (refsDefine) {
                        return onMatch("define", null, null, null, exp.expression);
                    }
                }
            }
        }
    };
	
	parse.toTransport = function (moduleName, contents) {
		var astRoot, contentLines, modLine,
			foundAnon,
			scanCount = 0,
			scanReset = false,
			defineInfos = [];

		try {
			astRoot = esprima.parse(contents, {
				loc: true
			});
		} catch (e) {
			console.log('toTransport skipping ' + moduleName + ': ' +
						 e.toString());
			return contents;
		}

		//Find the define calls and their position in the files.
		traverseBroad(astRoot, function (node) {
			var args, firstArg, firstArgLoc, factoryNode,
				needsId, depAction, range;

			if (isDefineNodeWithArgs(node)) {
				//The arguments are where its at.
				args = node.arguments;
				if (!args || !args.length) {
					return;
				}

				firstArg = args[0];
				firstArgLoc = firstArg.loc;

				if (args.length === 1) {
					if (firstArg.type === 'Identifier') {
						//The define(factory) case, but
						//only allow it if one Identifier arg,
						//to limit impact of false positives.
						needsId = true;
						depAction = 'empty';
					} else if (firstArg.type === 'FunctionExpression') {
						//define(function(){})
						factoryNode = firstArg;
						needsId = true;
						depAction = 'scan';
					} else if (firstArg.type === 'ObjectExpression') {
						//define({});
						needsId = true;
						depAction = 'skip';
					} else if (firstArg.type === 'Literal' &&
							   typeof firstArg.value === 'number') {
						//define('12345');
						needsId = true;
						depAction = 'skip';
					} else if (firstArg.type === 'UnaryExpression' &&
							   firstArg.operator === '-' &&
							   firstArg.argument &&
							   firstArg.argument.type === 'Literal' &&
							   typeof firstArg.argument.value === 'number') {
						//define('-12345');
						needsId = true;
						depAction = 'skip';
					} else if (firstArg.type === 'MemberExpression' &&
							   firstArg.object &&
							   firstArg.property &&
							   firstArg.property.type === 'Identifier') {
						//define(this.key);
						needsId = true;
						depAction = 'empty';
					}
				} else if (firstArg.type === 'ArrayExpression') {
					//define([], ...);
					needsId = true;
					depAction = 'skip';
				} else if (firstArg.type === 'Literal' &&
						   typeof firstArg.value === 'string') {
					//define('string', ....)
					//Already has an ID.
					needsId = false;
					if (args.length === 2 &&
						args[1].type === 'FunctionExpression') {
						//Needs dependency scanning.
						factoryNode = args[1];
						depAction = 'scan';
					} else {
						depAction = 'skip';
					}
				} else {
					//Unknown define entity, keep looking, even
					//in the subtree for this node.
					return;
				}

				range = {
					needsId: needsId,
					depAction: depAction,
					node: node,
					defineLoc: node.loc,
					firstArgLoc: firstArgLoc,
					factoryNode: factoryNode
				};

				//Only transform ones that do not have IDs. If it has an
				//ID but no dependency array, assume it is something like
				//a phonegap implementation, that has its own internal
				//define that cannot handle dependency array constructs,
				//and if it is a named module, then it means it has been
				//set for transport form.
				if (range.needsId) {
					if (foundAnon) {
						console.log(moduleName + ' has more than one anonymous ' +
							'define. May be a built file from another ' +
							'build system like, Ender. Skipping normalization.');
						defineInfos = [];
						return false;
					} else {
						foundAnon = range;
						defineInfos.push(range);
					}
				} else if (depAction === 'scan') {
					scanCount += 1;
					if (scanCount > 1) {
						//Just go back to an array that just has the
						//anon one, since this is an already optimized
						//file like the phonegap one.
						if (!scanReset) {
							defineInfos =  foundAnon ? [foundAnon] : [];
							scanReset = true;
						}
					} else {
						defineInfos.push(range);
					}
				}
			}
		});

		if (!defineInfos.length) {
			return contents;
		}

		//Reverse the matches, need to start from the bottom of
		//the file to modify it, so that the ranges are still true
		//further up.
		defineInfos.reverse();

		contentLines = contents.split('\n');

		modLine = function (loc, contentInsertion) {
			var startIndex = loc.start.column,
			//start.line is 1-based, not 0 based.
			lineIndex = loc.start.line - 1,
			line = contentLines[lineIndex];
			contentLines[lineIndex] = line.substring(0, startIndex) +
									   contentInsertion +
									   line.substring(startIndex,
														  line.length);
		};

		defineInfos.forEach(function (info) {
			var deps,
				contentInsertion = '',
				depString = '';

			//Do the modifications "backwards", in other words, start with the
			//one that is farthest down and work up, so that the ranges in the
			//defineInfos still apply. So that means deps then id.
			if (info.needsId && moduleName) {
				contentInsertion += "'" + moduleName + "',";
			}

			if (info.depAction === 'scan') {
				deps = parse.getAnonDepsFromNode(info.factoryNode);

				if (deps.length) {
					depString = '[' + deps.map(function (dep) {
						return "'" + dep + "'";
					}) + ']';
				} else {
					depString = '[]';
				}
				depString +=  ',';

				if (info.factoryNode) {
					//Already have a named module, need to insert the
					//dependencies after the name.
					modLine(info.factoryNode.loc, depString);
				} else {
					contentInsertion += depString;
				}
			}

			if (contentInsertion) {
				modLine(info.firstArgLoc, contentInsertion);
			}
		});

		contents = contentLines.join('\n');

		return contents;
	};

    return parse;
})();
