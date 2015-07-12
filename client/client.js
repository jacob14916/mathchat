// counter starts at 0
Session.setDefault('currentmsg', null);
Session.setDefault('currentroom', "lobby");

Router.configure({
  layoutTemplate: "layout"
});

Router.route('/', function () {
  this.render("homepage");
});

Router.route('/room/:roomname', function () {
  this.render("chatroom");
  Session.set('currentroom', this.params.roomname.toLowerCase()); // toLowerCase would toss out case sensitivity
});

Template.chatarea.helpers({
  messages: function () {
    return Messages.find({room: Session.get("currentroom")}, {sort: ["createdAt"]});
  },
  currentmsg: function () {
    return Session.get("currentmsg");
  }
});

Template.chatarea.onRendered(function () {
  var that = this;
  this.autorun(function () {
    // this keeps the chat scrolled all the way to the bottom
    var justToTriggerReactivity = Messages.find({}).fetch();
    var chatdiv = that.find(".chatarea");
    chatdiv.scrollTop = chatdiv.scrollHeight;
  });
});

Template.chat.helpers({
  user: function() {
      return this.username;
  },
  time: function() {
    var date = this.createdAt;
    var ret = (1+date.getMonth()) + "/" + date.getDate() + "@" +
          date.getHours() + ":";
    if(date.getMinutes() < 10){
      ret += "0" + date.getMinutes();
    }
    else {
      ret += date.getMinutes();
    }
    return ret;
  }
});

Template.textentry.events({
  'keypress .chatinput': function (evt) {
    switch (evt.keyCode) {
    case 13: // enter
      var text = evt.target.value;
      var name;
      if(Meteor.user() === null) {
          name = "Guest";
      }
      else {
          name = Meteor.user().username;
      }
      Messages.insert({
        text: text,
        createdAt: new Date(TimeSync.serverTime(Date.now())),
        room: Session.get("currentroom"),
        owner: Meteor.userId(),
        username: name
      });
      evt.target.value = "";
      evt.preventDefault();
      break;
    }
  },
  'keyup .chatinput': function (evt, inst) {
    if (evt.target.value) {
      Session.set("currentmsg",{createdAt: new Date(),
				text: evt.target.value});
    } else {
      Session.set("currentmsg", null);
    }
  }
});

Template.header.events({
  'submit .roomnav':function(evt) {
    evt.preventDefault();
    Router.go('/room/' + evt.target.room.value);
  }
});

Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
