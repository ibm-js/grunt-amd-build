define([
	'intern!object',
	'intern/chai!assert',
	'intern/dojo/node!../../tasks/lib/modulesStack'
], function (registerSuite, assert, getModulesStack) {
	var modulesStack;
	registerSuite({
		name: 'ModulesStack',

		'basic': function () {
			modulesStack = getModulesStack();
			assert.isTrue(modulesStack.isEmpty(),
				"modulesStack should be empty at the beginning.");

			modulesStack.push({
				mid: "module1"
			});
			assert.isFalse(modulesStack.isEmpty(),
				"modulesStack should be not be empty since we added a module.");
			assert.strictEqual(modulesStack.pop().mid,
				"module1",
				"pop() should return the last module.");
		},

		'doublePush': function () {
			modulesStack = getModulesStack();
			assert.isTrue(modulesStack.isEmpty(),
				"modulesStack should be empty at the beginning.");

			modulesStack.push({
				mid: "module2"
			});
			modulesStack.push({
				mid: "module2"
			});
			assert.isFalse(modulesStack.isEmpty(),
				"modulesStack should be not be empty since we added a module.");
			assert.strictEqual(modulesStack.pop().mid,
				"module2",
				"pop() should return the last module.");
			assert.isTrue(modulesStack.isEmpty(),
				"Now the modulesStack should be empty since we added twice the same module.");
		},

		'first in last out': function () {
			modulesStack = getModulesStack();
			assert.isTrue(modulesStack.isEmpty(),
				"modulesStack should be empty at the beginning.");

			modulesStack.push({
				mid: "moduleA"
			});
			modulesStack.push({
				mid: "moduleB"
			});
			assert.isFalse(modulesStack.isEmpty(),
				"modulesStack should be not be empty since we added two modules.");
			assert.strictEqual(modulesStack.pop().mid,
				"moduleB", "pop() should return the last module.");
			assert.isFalse(modulesStack.isEmpty(),
				"modulesStack should be not be empty since we added two modules.");
			assert.strictEqual(modulesStack.pop().mid,
				"moduleA",
				"pop() should return the last module.");
			assert.isTrue(modulesStack.isEmpty(),
				"Now the modulesStack should be empty since we retrieved two modules.");

		}
	});
});
