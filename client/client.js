// counter starts at 0
Session.setDefault('currentmsg', null);
Session.setDefault('currentroom', null);
Session.setDefault('roomid', null);

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
    },
    
    
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
      var name;
      if(Meteor.user() === null) {
          name = "Guest";
      }
      else {
          name = Meteor.user().username;
      }
      if(text) {
        var counter = Messages.find({}, {sort: ["createdAt"]}).count();
        var str = "message" + (counter+1);
        Messages.insert({
            identifier: str,
            text: text,
            createdAt: new Date(TimeSync.serverTime(Date.now())),
            room: Session.get("currentroom"),
            owner: Meteor.userId(),
            username: name,
            pinned: false
        });
        evt.target.value = "";
        Session.set('currentmsg', null);
        evt.preventDefault();
        break;
      }
    }
  },
  'click #sendbutton': function(evt, inst) {
      var area = inst.find(".chatinput");
      var text = area.value;
      var name;
      if(Meteor.user() === null) {
          name = "Guest";
      }
      else {
          name = Meteor.user().username;
      }
      if(text !== null) {
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
        evt.preventDefault();
      }
  },
  // This code was the previous mechanism for previewing
  /* 'keyup .chatinput': function (evt, inst) {
    if (evt.target.value) {
      Session.set("currentmsg",{createdAt: new Date(),
				text: evt.target.value});
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
   } 
});

