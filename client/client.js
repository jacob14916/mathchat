// counter starts at 0
Session.setDefault('currentmsg', null);
Session.setDefault('currentroom', null);
Session.setDefault('username', "Guest-oops");

Router.configure({
  layoutTemplate: "layout"
});

Router.route('/', function () {
  Meteor.call("leaveRoom", null, true);
  Session.set('currentroom', null);
  this.render("homepage");
});

Router.route('/room/:roomname', function () {
  this.render("chatroom");
  var roomname = this.params.roomname.toLowerCase(); // toLowerCase would toss out case sensitivity
  Tracker.nonreactive(function () {
    if (!Rooms.find(roomname).count()) Rooms.insert({_id: roomname, currentusers: []});
  });
  Meteor.call("leaveRoom", null, true);
  Session.set('currentroom', roomname);
  Meteor.call("joinRoom", roomname);
});

Template.chatarea.helpers({
  messages: function () {
    return Messages.find({room: Session.get("currentroom")}, {sort: ["createdAt"]});
  },
  currentmsg: function () {
    if(Session.get('currentmsg')) {
        return Session.get('currentmsg').text;
    }
  }
});

Template.chatarea.onRendered(function () {
  var that = this;
  this.autorun(function () {
    // this keeps the chat scrolled all the way to the bottom
    var justToTriggerReactivity = Messages.find({}).fetch();
    var chatdiv = that.find("#messages");
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
      Messages.insert({
        text: text,
        createdAt: new Date(TimeSync.serverTime(Date.now())),
        room: Session.get("currentroom"),
        owner: Meteor.userId(),
        username: Session.get('username')
      });
      evt.target.value = "";
      evt.preventDefault();
      break;
    }
  },
  'keyup .chatinput': function (evt, inst) {
    if (evt.target.value) {
      Session.set("currentmsg",{text: evt.target.value});
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

Template.chatroom.helpers({
   roomname: function() {
       return Session.get('currentroom');
   },
  currentusers: function() {
    var display = "";
    var room = Rooms.findOne({_id: Session.get("currentroom")});
    if (room) {
      var users =  _.countBy(room.currentusers, 'name');
      for (var name in users) {
	var count = users[name];
	display += name + ((count>1)?" (x" + count + ")":"")+"<br>";
      }
    }
    return display;
  }
});

Meteor.startup(function() {
  Tracker.autorun(function () {
    var user = Meteor.user();
    Meteor.call("leaveRoom", null, true);
    Meteor.call("registerClient", function (err, name) {
      Session.set("username", name);
    });
    Tracker.nonreactive(function () {
      var room = Session.get("currentroom");
      if (room) {
	Meteor.call("joinRoom", room);
      }
    });
  });
});

