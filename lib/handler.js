const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const querystring = require('querystring');
let process = require('process');
const url = require('url');
const semver = require('semver');
const {BufferedProcess} = require('atom');
const axios = require('axios')
const { InputView } = require('atom-modal-views');
const util = require('util')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)
const utility = require('./utility');
const { parse, stringify } = require('envfile')
const pathToenvFile = path.resolve(__dirname, '../../.env');

let codeassist = null;
let port = null;
let secret = null;
var TOKEN = null;
var USER_ID = null;

atom.config.set("bracket-matcher.highlightMatchingLineNumber", true);
atom.config.set("bracket-matcher.autocompleteBrackets", false);
atom.config.set("bracket-matcher.wrapSelectionsInBrackets", false);
atom.config.set("autocomplete-plus.backspaceTriggersAutocomplete", true);
atom.config.set("autocomplete-plus.enableAutoConfirmSingleSuggestion", false);
atom.config.set("autocomplete-plus.includeCompletionsFromAllBuffers", false);
atom.config.set("line-ending-selector.defaultLineEnding", "LF");
disabled_pack = atom.config.get("core.disabledPackages");
if (!disabled_pack.includes("autocomplete-snippets")){
  disabled_pack.push("autocomplete-snippets");
  atom.config.set("core.disabledPackages", disabled_pack)
}

let one =
  "https://v1.codeassist.ai:7001";
let two =
  "https://v1.codeassist.ai:7003";
let three =
  "https://v2.codeassist.ai:7002";
let four =
  "https://v2.codeassist.ai:7004";


function setJson(key, value) {
      var result = {}
      result[key] = value;
      writeFile(pathToenvFile, stringify(result)).then(() => getAuth());
}

function inputEmail(){
  let editor = atom.workspace.getActiveTextEditor()
  const inputView = new InputView({
    title: "Authenticate Email",
    description: "Input your registered email here",
    placeholder: "xyz@example.com"
  });
  inputView.getInput().then((value) => {
    if (value.length > 1){
      setJson('email', value);
  }
  });
}

var reset = () => codeassist = Promise.resolve(codeassist)
  .catch(error => null)
  .then(process => process != null ? process.kill() : undefined);


const getAuth = () => {
  readFile(pathToenvFile, 'utf8').then((data) => {
      var result = parse(data);
      axios.post('https://login.codeassist.ai:7000/user/login', result)
       .then(response => {
           if ('access_token' in response.data){
             atom.notifications.addSuccess('CodeAssist is Ready!')
             TOKEN = response.data.access_token;
             USER_ID = response.data.id;
           }
           else{
             atom.notifications.addWarning('Email not found!')
             TOKEN = '';
             USER_ID = '';
           }
        })
        .catch((error) => {
            console.log('error ' + error);
         });
  });
}

const requestAll = (method, endpoint, parameters = null) => {
  // escapeUnicode
  parameters['id'] = USER_ID
  const post_data = JSON.stringify(parameters)
  const header_data = { headers: { Authorization: `Bearer ${TOKEN}` } }
  const requestOne = axios.post(one, post_data, header_data);
  const requestTwo = axios.post(two, post_data, header_data);
  const requestThree = axios.post(three, post_data, header_data);
  const requestFour = axios.post(four, post_data, header_data);
  return axios.all([requestOne, requestTwo, requestThree, requestFour])
}

var adHocGuessPlatform = function() {
  switch (false) {
    case !fs.existsSync('/Applications'): return 'darwin';
    case !fs.existsSync('/home'): return 'linux';
    default: return 'win32';
  }
};

var sortBySemver = function(versions) {
  const cmp = function(a, b) {
    const a_valid = semver.valid(a);
    const b_valid = semver.valid(b);
    switch (false) {
      case !a_valid || !b_valid: return semver.rcompare(a, b);
      case !a_valid: return -1;
      case !b_valid: return 1;
      case !(a < b): return -1;
      case !(a > b): return 1;
      default: return 0;
    }
  };
  versions.sort(cmp);
  return versions;
};

module.exports = {
  reset,
  requestAll,
  getAuth,
  inputEmail
};
