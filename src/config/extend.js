const view = require('think-view');
const mongo = require('think-mongo');
const cache = require('think-cache');
const session = require('think-session');
const fetch = require('think-fetch');

module.exports = [
  view, // make application support view
  mongo(think.app),
  cache,
  fetch,
  session
];
