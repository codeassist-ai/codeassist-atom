const handler = require('./handler');
const utility = require('./utility');

let forceSemantic = false;
let lastPrefix = '';
let prevPrefix = '';

const processContext = ({editor, bufferPosition, prefix, activatedManually}) => utility.getEditorData(editor).then(({filepath, contents, filetypes}) => ({
  editor,
  filepath,
  contents,
  filetypes,
  bufferPosition,
  prefix,
  activatedManually
}));

const replaceSuffix = function(item_arr, string2) {
  var completions = []
  item_arr.forEach(item => {
    if (string2 && item) {
      const regex = /(.+?)\1+$/gm;
      var j = 1;
      last_char_suffix = string2.charAt(string2.length-j)
      last_char_item = item.charAt(item.length-j)

      while(last_char_suffix.length > 0 && last_char_item.length > 0 && last_char_item === last_char_suffix){
        j+=1;
        last_char_suffix = string2.charAt(string2.length-j)
        last_char_item = item.charAt(item.length-j)
      }

      item = item.substring(0,item.length-j+1)
      // repeat_check = regex.exec(item)
      // if (repeat_check){
      //     item = repeat_check[1]
      // }
      string3 = string2.substring(0,string2.length-j+1)

      var i = 0;
      while (!string3.startsWith(item.substring(i, ))){
        i += 1;
      }
      sFinal = item.substring(0,i)
      completions.push(sFinal)
    }
    else{
      completions.push(item)
    }
    }
  );
  return completions
};


const fetchCompletions = function({editor, filepath, contents, filetypes, bufferPosition, prefix, activatedManually}) {
  if (!prefix.startsWith(lastPrefix) && !lastPrefix.startsWith(prefix)) { forceSemantic = false; }
  if (activatedManually) { forceSemantic = true; }
  lastPrefix = prefix;
  prevPrefix = editor.getTextInBufferRange([[bufferPosition.row, 0], bufferPosition]);
  const parameters = utility.buildRequestParameters(filepath, contents, filetypes, bufferPosition, prevPrefix);
  parameters.force_semantic = forceSemantic;
  return handler.requestAll('POST', 'completions', parameters).then(function(response) {
    var unf_completions = [response[0].data.insertion_text,
                              response[1].data.insertion_text,
                              response[2].data.insertion_text,
                              response[3].data.insertion_text]

    unf_completions = [...new Set(unf_completions)];
    unf_completions = unf_completions.filter(item => item);
    const startColumn = ((response != null ? response.completion_start_column : undefined) || (bufferPosition.column + 1)) - 1;
    prefix = editor.getTextInBufferRange([[bufferPosition.row, startColumn], bufferPosition]);
    endPosition = [bufferPosition.row, bufferPosition.column + 100]
    suffix = editor.getTextInBufferRange([bufferPosition, endPosition])
    var completions = replaceSuffix(unf_completions, suffix)
    if (completions.length > 1){
      completions = completions.sort()
      first_string = completions[0]
      last_string = completions[completions.length -1]
      min_len = Math.min(first_string.length, last_string.length)
      for (i = 0; i < min_len; i++) {
        if (first_string[i] === last_string[i]){
          continue;
        }
        else{
          break;
        }
      }
      var common_prefix = first_string.slice(0, i)
      if(completions.indexOf(common_prefix) === -1){
        completions.unshift(common_prefix);
      }
    }
    return {completions, prefix, filetypes, lastPrefix};}).catch(function (error) {
      atom.notifications.addWarning('Sorry something went wrong. Please try again!')
      return [], '', '', '';
    });
};

const convertCompletions = function({completions, prefix, filetypes, lastPrefix}) {
  const converter = function(filetype) {
    const general = completion => ({
      text: completion,
      replacementPrefix: prefix,
      displayText: lastPrefix + completion,

      type: (() => { switch (completion.extra_menu_info) {
        case '[File]': case '[Dir]': case '[File&Dir]': return 'import';
        default: return 'identifier';
      } })(),

      leftLabel: (() => { switch (completion.extra_menu_info) {
        case '[File]': case '[Dir]': case '[File&Dir]': return '';
        case '[ID]': return '';
        default: return completion.extra_menu_info;
      } })(),

      rightLabel: completion.kind,
      description: completion.detailed_info
    });

    const clang = function(completion) {
      const result = general(completion);
      result.type = (() => { switch (completion.kind) {
        case 'TYPE': case 'STRUCT': case 'ENUM': return 'type';
        case 'CLASS': return 'class';
        case 'MEMBER': return 'property';
        case 'FUNCTION': return 'function';
        case 'VARIABLE': case 'PARAMETER': return 'variable';
        case 'MACRO': return 'constant';
        case 'NAMESPACE': return 'keyword';
        default: return result.type;
      } })();
      return result;
    };

    switch (filetype) {
      case 'c': case 'cpp': case 'objc': case 'objcpp': return clang;
      default: return general;
    }
  };

  if (completions === undefined){
    return null
  }
  return completions.map(converter(filetypes[0]));
};

const getCompletions = context => Promise.resolve(context)
  .then(processContext)
  .then(fetchCompletions)
  .then(convertCompletions);

module.exports = getCompletions;
