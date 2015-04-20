'use strict';

console.log();

import Twitter from 'twitter';
import _ from 'lodash';
import Promise from 'bluebird';
import {argv} from 'yargs';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import colors from 'colors';

if (!argv.config) throw 'No config.yaml supplied thougs `--config` parameter';

const configFilePath = path.join(path.dirname(path.dirname(require.main.filename)), argv.config);
const config = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'));
const lists = config.lists;
const me = '4mleth';
const client = new Twitter(
  {
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token_key: config.access_token_key,
    access_token_secret: config.access_token_secret
  }
);

//const getListsMemberships = JSON.parse(fs.readFileSync('./data/get.lists.memberships.json', 'utf8'));
//const getListsMembers = JSON.parse(fs.readFileSync('./data/get.lists.members.json', 'utf8'));
//const getFriendsIds = JSON.parse(fs.readFileSync('./data/get.friends.ids.json', 'utf8'));
//const getUsersLookup = JSON.parse(fs.readFileSync('./data/get.users.lookup.json', 'utf8'));
//const getListsList = JSON.parse(fs.readFileSync('./data/get.lists.list.json', 'utf8'));

const get = (url, params) => new Promise(
  (resolve, reject) => {
    console.log('REQUEST:'.green, url.blue, JSON.stringify(params).cyan);

    //let result = null;
    //switch (url) {
    //  case 'lists/memberships':
    //    result = getListsMemberships;
    //    break;
    //  case 'lists/members':
    //    result = getListsMembers;
    //    break;
    //  case 'friends/ids' :
    //    result = getFriendsIds;
    //    break;
    //  case 'users/lookup':
    //    result = getUsersLookup;
    //    break;
    //  case 'lists/list':
    //    result = getListsList;
    //    break;
    //}
    //resolve(result, {});

    client.get(
      url, params, (error, result, response) => {
        if (error) reject(error);
        else {
          resolve(result, response);
        }
      }
    );
  }
);

let users_ids_in_lists = [];
let all_users_ids = [];

const get_users_lookup = users_ids =>
  Promise.all(
    _.map(
      _.chunk(users_ids, 99),
      some_users_ids => get('users/lookup', {user_id: some_users_ids.join(',')})
    )
  );

const display_users = (users_ids) => {
  get_users_lookup(users_ids)
    .then(r => {
            console.log((r[0].length + ' accounts that are not in a list have been found').yellow);
            _.map(r[0], user => console.log('https://twitter.com/' + user.screen_name))
          })
    .catch(e => console.log(e));
};

const process_lists = (lists) => {
  console.log((lists.length + ' lists have been found.').yellow);
  let lists_users_promises = [];
  _.map(lists, list => lists_users_promises.push(get('lists/members', {
    slug: list.slug,
    owner_screen_name: me,
    count: 5000
  })));
  Promise.all(lists_users_promises)
    .then(r => {
            _.map(r, list => _.map(list.users, user => users_ids_in_lists.push(user.id)));
            display_users(_.difference(all_users_ids, users_ids_in_lists));
          })
    .catch(e => console.log(e));
};

Promise.all([
              get('lists/list', {screen_name: me}),
              get('friends/ids', {screen_name: me})
            ])
  .then(r => {
          process_lists(r[0]);
          all_users_ids = r[1].ids;
        })
  .catch(e => console.log(e));

// users/lookup: Returns fully-hydrated user objects for up to 100 users per request, as specified by comma-separated values passed to the user_id and/or screen_name parameters.
// lists/memberships: Returns the lists the specified user has been added to. If user_id or screen_name are not provided the memberships for the authenticating user are returned.
// friends/ids: Returns a cursored collection of user IDs for every user the specified user is following (otherwise known as their “friends”).

//TODO : dans le .all faire un then sur chaque promesse pour voir ce qui se passe...