const utility = require('./utility');
const getCompletions = require('./get-completions');

module.exports = {
  selector: '*',
  disableForSelector: '.comment',
  suggestionPriority: 2,
  class: {
    selector: '.class.name, .inherited-class, .instance.type',
    typePriority: 4
  },
  function: {
    selector: '.function.name',
    typePriority: 3
  },
  variable: {
    selector: '.variable',
    typePriority: 2
  },
  getSuggestions(context) {
    if (!utility.isEnabledForScope(context.editor.getRootScopeDescriptor())) { return []; }
    return getCompletions(context).catch(utility.notifyError([]));
  },
  getSuggestionsNewLine(context){
    setTimeout(this.triggerAutocomplete.bind(this, context.editor), 0)
  },
  triggerAutocomplete(editor) {
    atom.commands.dispatch(
      editor.getElement(),
      'autocomplete-plus:activate',
      {activatedManually: false}
    )
  }
};
