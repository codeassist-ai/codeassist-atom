const {install} = require('atom-package-deps');

const provider = require('./provider');
const handler = require('./handler');
const event = require('./event');

const activate = function() {
  // install('CodeAssist', true);
  event.register();
  handler.getAuth();
};

const deactivate = function() {
  event.deregister();
  handler.reset();
};

module.exports = {
  activate,
  deactivate,
  provide() { return provider; }
};
