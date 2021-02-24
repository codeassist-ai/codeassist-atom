const os = require('os');
const path = require('path');
const {File, Point} = require('atom');

const getWorkingDirectory = function() {
  const projects = atom.project.getPaths();
  const activeFile = __guard__(atom.workspace.getActiveTextEditor(), x => x.getPath());
  if (activeFile != null) {
    return projects.find(project => activeFile.startsWith(project)) || path.dirname(activeFile);
  } else {
    return projects[0] || atom.config.get('core.projectHome');
  }
};

const getEditorTmpFilepath = editor => path.resolve(os.tmpdir(), `AtomYcmBuffer-${editor.getBuffer().getId()}`);

const getEditorData = function(editor) {
  if (editor == null) { editor = atom.workspace.getActiveTextEditor(); }
  let filepath = editor.getPath();
  // const contents = editor.getText();
  const filetypes = getScopeFiletypes(editor.getRootScopeDescriptor());
  const bufferPosition = editor.getCursorBufferPosition();
  const contents = editor.getTextInBufferRange([(0,0), bufferPosition])

  if (filepath != null) {
    return Promise.resolve({filepath, contents, filetypes, bufferPosition});
  } else {
    return new Promise(function(fulfill, reject) {
      filepath = getEditorTmpFilepath(editor);
      const file = new File(filepath);
      return file.write(contents)
        .then(() => fulfill({filepath, contents, filetypes, bufferPosition}))
        .catch(error => reject(error));
    });
  }
};

var getScopeFiletypes = function(scopeDescriptor) {
  if (scopeDescriptor == null) { scopeDescriptor = atom.workspace.getActiveTextEditor().getRootScopeDescriptor(); }
  return scopeDescriptor.getScopesArray().map(scope => scope.split('.').pop());
};

const buildRequestParameters = function(filepath, contents, filetypes, bufferPosition, lastPrefix) {
  if (filetypes == null) { filetypes = []; }
  if (bufferPosition == null) { bufferPosition = [0, 0]; }
  const convertFiletypes = filetypes => filetypes.map(function(filetype) { switch (filetype) {
    case 'js': case 'jsx': return 'javascript';
    default: return filetype;
  }
   }).filter((filetype, index, filetypes) => filetypes.indexOf(filetype) === index);
  bufferPosition = Point.fromObject(bufferPosition);
  const workingDir = getWorkingDirectory();
  const parameters = {
    filepath,
    working_dir: workingDir,
    line_num: bufferPosition.row + 1,
    column_num: bufferPosition.column + 1,
    contents,
    file_data: {},
    lastPrefix: lastPrefix
  };
  parameters.file_data[filepath] = {filetypes: convertFiletypes(filetypes)};
  atom.workspace.getTextEditors()
    .filter(function(editor) {
      if (!editor.isModified()) { return false; }
      const otherFilepath = editor.getPath();
      return (otherFilepath != null) && (otherFilepath !== filepath) && otherFilepath.startsWith(workingDir);}).forEach(editor => parameters.file_data[editor.getPath()] = {
    contents: editor.getText(),
    filetypes: convertFiletypes(getScopeFiletypes(editor.getRootScopeDescriptor()))
  });
  return parameters;
};

const isEnabledForScope = scopeDescriptor => true;

const notifyError = result => (function(error) {
  atom.notifications.addError(`[CodeAssist] ${error.name}`, {detail: `${error.stack}`});
  return result;
});

const debugLog = function(category, ...message) {
  if (atom.inDevMode()) { return console.debug(`[CodeAssist-${category}]`, ...Array.from(message)); }
};

module.exports = {
  getWorkingDirectory,
  getEditorTmpFilepath,
  getEditorData,
  getScopeFiletypes,
  buildRequestParameters,
  isEnabledForScope,
  notifyError,
  debugLog
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
