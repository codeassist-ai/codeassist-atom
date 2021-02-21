const {CompositeDisposable} = require('atom');

const handler = require('./handler');
const utility = require('./utility');
const provider = require('./provider');

let disposables = null;
let positionHistoryRow = null;

const emitEvent = (editor, name, args) => utility.getEditorData(editor).then(function({filepath, contents, filetypes}) {
  const parameters = utility.buildRequestParameters(filepath, contents, filetypes);
  parameters.event_name = name;
  for (let key in args) { const value = args[key]; parameters[key] = value; }
  return handler.request('POST', 'event_notification', parameters).catch(utility.notifyError());
});

const observeEditors = () => atom.workspace.observeTextEditors(function(editor) {
  let path = editor.getPath() || utility.getEditorTmpFilepath(editor);
  let enabled = false;
  const isEnabled = () => utility.isEnabledForScope(editor.getRootScopeDescriptor());
  const onBufferVisit = () => emitEvent(editor, 'BufferVisit');
  const onBufferUnload = () => emitEvent(editor, 'BufferUnload', {unloaded_buffer: path});
  const onInsertLeave = () => emitEvent(editor, 'InsertLeave');
  const onCurrentIdentifierFinished = () => emitEvent(editor, 'CurrentIdentifierFinished');
  const onFileReadyToParse = () => emitEvent(editor, 'FileReadyToParse');

  const observers = new CompositeDisposable();
  observers.add(editor.observeGrammar(function() {
    if (isEnabled()) {
      onBufferVisit();
      onFileReadyToParse();
      return enabled = true;
    } else {
      if (enabled) { onBufferUnload(); }
      return enabled = false;
    }
  })
  );
  observers.add(editor.onDidChangePath(function() {
    if (enabled) {
      onBufferUnload();
      onBufferVisit();
      onFileReadyToParse();
    }
    return path = editor.getPath();
  })
  );
  observers.add(editor.onDidStopChanging(function() {
    if (enabled) {
      onInsertLeave();
      onCurrentIdentifierFinished();
      return onFileReadyToParse();
    }
  })
  );
  return observers.add(editor.onDidDestroy(function() {
    if (enabled) {
      onBufferUnload();
    }
    return observers.dispose();
  })
  );
});

const observeConfig = () => atom.config.observe('CodeAssist', value => handler.reset());

const register = function() {
  disposables = new CompositeDisposable();
  disposables.add(atom.workspace.observeTextEditors(activeEditor => {
     return activeEditor.onDidChange(event => {
        const bufferPosition = activeEditor.getCursorBufferPosition();
        if ((positionHistoryRow + 1) === bufferPosition.row){
            const prefix = activeEditor.getTextInBufferRange([[bufferPosition.row, 0], bufferPosition]);
            if (!/\S/.test(prefix)) {
                provider.getSuggestionsNewLine({"editor": activeEditor})
            }
        }
        positionHistoryRow = bufferPosition.row
     });
   })
  );
  // disposables.add(observeEditors());
  disposables.add(atom.commands.add('atom-workspace', {
    'codeassist-atom:email': () => handler.inputEmail()
  }));

  return disposables.add(observeConfig());
};
const deregister = () => disposables.dispose();

module.exports = {
  register,
  deregister
};
