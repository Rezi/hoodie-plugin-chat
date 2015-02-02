/**
 * Hoodie plugin chat
 * Lightweight and easy chat
 */

/* global Hoodie */

Hoodie.extend(function (hoodie) {
  'use strict';


  hoodie.store.on('profile:add', function (profile) {
    if (profile.id !== hoodie.id())
      hoodie.chat.talks['fake-' + profile.id] = {
        profile: profile
      };
    hoodie.trigger('ontalk');
  });

  hoodie.store.on('talk:add', function (talk) {
    talk.exclusive.map(function (userId) {
      if (userId !== hoodie.id()) {
        talk.profile = talk.profiles[userId];
        hoodie.chat.talks[talk.id] = talk;
        delete hoodie.chat.talks['fake-' + userId];
        hoodie.trigger('ontalk');
      }
    });
  });

  hoodie.store.on('message:add', function (message) {
    hoodie.chat.talks[message.talkId].messages = hoodie.chat.talks[message.talkId].messages || [];
    hoodie.chat.talks[message.talkId].messages.push(message);
    hoodie.trigger('ontalk');
  });

  hoodie.chat = {
    talks: {},
    currentTalk: null,
    pubsubtypes: ['talk', 'message'],

    getProfile: function (userId) {
      var defer = window.jQuery.Deferred();
      defer.notify('getProfile', arguments, false);
      hoodie.profile.get(userId)
        .then(defer.resolve)
        .fail(defer.reject);
      return defer.promise();
    },

    talk: function (userId) {
      var defer = window.jQuery.Deferred();
      defer.notify('talk', arguments, false);

      hoodie.remote.sync();
      var participants = [ userId, hoodie.id() ];
      hoodie.profile.getAsObjects(participants)
        .then(function (profiles) {
          var chat = {
            userId: hoodie.id(),
            exclusive: participants,
            profiles: profiles
          };

          hoodie.pubsub.bidirectional(userId, hoodie.chat.pubsubtypes)
            .then(function () {
              hoodie.store.add('talk', chat)
                .then(defer.resolve)
                .fail(defer.reject);
            })
            .fail(function (err) {
              if (err.err !== 'You already subscribed.')
                defer.reject(err);
              else
                hoodie.chat.getTalkByUserId(userId)
                  .then(defer.resolve)
                  .fail(defer.reject);
            });
        })
        .fail(defer.reject);

      return defer.promise();
    },
    deleteTalk: function (id) {
      var defer = window.jQuery.Deferred();
      defer.notify('deleteTalk', arguments, false);
      if (!id) {
        hoodie.store.removeAll('talk')
          .then(defer.resolve)
          .fail(defer.reject);
      } else {
        hoodie.store.remove('talk', id)
          .then(defer.resolve)
          .fail(defer.reject);
      }
      return defer.promise();
    },
    feed: function () {
      var defer = window.jQuery.Deferred();
      defer.notify('feed', arguments, false);
      hoodie.store.findAll('talk')
        .then(defer.resolve)
        .fail(defer.reject);

      return defer.promise();
    },
    message: function (talkObject, messageObject) {
      var defer = window.jQuery.Deferred();
      defer.notify('message', arguments, false);

      messageObject.talkId = talkObject.id;
      messageObject.exclusive = talkObject.exclusive;
      messageObject.userId = hoodie.id();

      hoodie.store.add('message', messageObject)
        .then(defer.resolve)
        .fail(defer.reject);
      return defer.promise();
    },
    getTalk: function (talkObject) {
      var defer = window.jQuery.Deferred();
      defer.notify('getTalk', arguments, false);
      hoodie.store.find('talk', talkObject.id)
        .then(defer.resolve)
        .fail(defer.reject);
      return defer.promise();
    },
    getTalkByUserId: function (userId) {
      var defer = window.jQuery.Deferred();
      defer.notify('getTalkByUserId', arguments, false);
      var find = false;
      hoodie.store.findAll('talk')
        .then(function (talks) {
          talks.forEach(function (talk) {
            find = talk.exclusive
              .map(function (v) {
                return (v === userId);
              })
              .reduce(function (b, c) {
                return b || c;
              }, false);
            if (find) {
              hoodie.chat.currentTalk = talk;
              defer.resolve(talk);
            }
          });
          if (!find) {
            defer.reject('chat not found');
          }
        })
        .fail(defer.reject);
      return defer.promise();
    }
  };

  // var debugPromisseGstart = function (text) {
  //   var defer = window.jQuery.Deferred();
  //   (window.debug === 'chat') && console.groupCollapsed(text);
  //   defer.resolve({});
  //   return defer.promise();
  // };

  // var debugPromisseGend = function () {
  //   var defer = window.jQuery.Deferred();
  //   (window.debug === 'chat') && console.groupEnd();
  //   defer.resolve({});
  //   return defer.promise();
  // };

  function out(name, obj, task) {
    if (window.debug === 'chat') {
      var group = (task) ? 'task: ' + task + '(' + name + ')': 'method: ' + name;

      console.groupCollapsed(group);
      if (!!obj)
        console.table(obj);
      console.groupEnd();
    }
  }

  if (window.debug === 'chat') {
    hoodie.task.on('start', function () {
      out('start', arguments[0], arguments[0].type);
    });

    // task aborted
    hoodie.task.on('abort', function () {
      out('abort', arguments[0], arguments[0].type);
    });

    // task could not be completed
    hoodie.task.on('error', function () {
      out('error', arguments, arguments[1].type);
    });

    // task completed successfully
    hoodie.task.on('success', function () {
      out('success', arguments[0], arguments[0].type);
    });
  }
});
