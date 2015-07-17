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
  Meteor.call("leaveRoom", Session.get('currentroom'), true);
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
  },
  pinnedmessages: function() {
      if(Messages.find({room: Session.get('currentroom'), pinned: true}).count() === 0) 
        return null;
      else
        return Messages.find({room: Session.get('currentroom'), pinned: true});
  },
  pinattributes: function() {
      return {
        id: this.identifier,
        class: "removepin",
        type: "image",
        src: "/removemsg.png"
      };
  }
});

Template.chatarea.events({
    'click .pinicon, click .removepin': function(evt, inst) {
        var id = evt.target.id;
        if(id !== null) {
            var doc = Messages.findOne({room: Session.get('currentroom'), identifier: id});
            var time = doc.createdAt;
            if(doc !== null) {
                Messages.update(doc._id, {$set: {pinned: !(this.pinned), createdAt: time}});
            }
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
  pinid: function() {
      return {
          id: this.identifier,
          type: "image",
          class: "pinicon",
          src: "/pinmessageicon.png"
      };
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
      if(text.length > 0) {
          while(text.substring(0, 1) == " " || text.substring(0, 1) == "\n")
            text = text.substring(1);
      }
      if (text && text !== "") {
        var counter = Messages.find({}, {sort: ["createdAt"]}).count();
        var str = "message" + (counter+1);
        Messages.insert({
            identifier: str,
            text: text,
            createdAt: new Date(TimeSync.serverTime(Date.now())),
            room: Session.get("currentroom"),
            owner: Meteor.userId(),
            username: Session.get("username"),
            pinned: false
        });
        
        Session.set('currentmsg', null);
        
        
      }
      evt.target.value = "";
      evt.preventDefault();
      break;
    }
  },
  'click #sendbutton': function(evt, inst) {
      var area = inst.find(".chatinput");
      var text = area.value;
      if(text.length > 0) {
        while(text.substring(0, 1) == " " || text.substring(0,1) == "\n") {
          text = text.substring(1);
        }
      }
      var name;
      if(Meteor.user() === null) {
          name = "Guest";
      }
      else {
          name = Meteor.user().username;
      }
      if(text !== null && text !== "") {
        var counter = Messages.find({}, {sort: ["createdAt"]}).count();
        var str = "message" + (counter+1);
        Messages.insert({
          identifier: str,
          pinned: false,
          text: text,
          createdAt: new Date(TimeSync.serverTime(Date.now())),
          room: Session.get("currentroom"),
          owner: Meteor.userId(),
          username: name
        });
        area.value = "";
        Session.set('currentmsg', null);
        
      }
      evt.preventDefault();
  },
  // This code was the previous mechanism for previewing
  /* 'keyup .chatinput': function (evt, inst) {
    if (evt.target.value) {
      Session.set("currentmsg",{text: evt.target.value});
    } else {
      Session.set("currentmsg", null);
    }
  }, */
  'click #previewbutton': function (evt, inst) {
      var area = inst.find(".chatinput");
      var str = area.value;
      if(str !== null) {
          Session.set('currentmsg', {createdAt: new Date(), text: str});
      }
      else {
          Session.set('currentmsg', null);
      }
      evt.preventDefault();
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
