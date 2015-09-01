// counter starts at 0
Session.setDefault('currentmsg', null);
Session.setDefault('currentroom', null);
Session.setDefault('username', "Guest-oops");
Session.setDefault('adjusting', false);

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
  Meteor.call("leaveRoom", roomname, true);
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
    },
    
    'click .deleteicon': function(evt, inst) {
        var id = evt.target.id;
        if(id !== null) {
            Meteor.call('removemessage', Session.get('currentroom'), id);
        }
    },
    
    'mousedown #splitbar': function(evt) {
        Session.set('adjusting', true);
    },
    
    'mouseup .chatarea': function(evt) {
        Session.set('adjusting', false);
    },
    
    'mousemove .chatarea': function(evt, inst) {
        if(Session.get('adjusting')) {
            var bar = inst.find("#splitbar");
            bar.style.top = (evt.pageY - 120) + "px";
            var pin = inst.find("#pin");
            var msg = inst.find("#messages");
            pin.style.height = (evt.pageY - 120) + "px";
            messages.style.top = (evt.pageY - 120) + "px";
            evt.preventDefault();
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
  deleteid: function() {
      return {
          id: this.identifier,
          type: "image",
          class: "deleteicon",
          src: "/deletemsg.png"
      };
  },
  time: function() {
    var date = this.createdAt;
    var hours;
    hours = date.getHours();
    if(hours === 0) {
        hours = 12;
    }
    else if (hours >= 13 && hours < 24) {
        hours = hours - 12;
    }
    var ret = (1+date.getMonth()) + "/" + date.getDate() + "@" +
          hours + ":";
    if(date.getMinutes() < 10){
      ret += "0" + date.getMinutes();
    }
    else {
      ret += date.getMinutes();
    }
    if(date.getHours() < 12) {
        ret += "AM";
    }
    else {
        ret += "PM";
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
        var arr = Messages.find({}, {sort: ["createdAt"]}).fetch();
        var doc = arr[arr.length - 1];
        var counter;
        if(doc) {
            var thing = doc.identifier.substring(7);
            counter = parseInt(thing, 10);
        }
        else {
            counter = 1;
        }
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
        var arr = Messages.find({}, {sort: ["createdAt"]}).fetch();
        var doc = arr[arr.length - 1];
        var counter;
        if(doc) {
            var thing = doc.identifier.substring(7);
            counter = parseInt(thing, 10);
        }
        else {
            counter = 0;
        }
        str = "message" + (counter+1);
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

Template.chatroom.events({
   'click .reference': function(evt, inst) {
       var id = evt.target.id;
       var area = inst.find('.chatinput');
       var str = area.value;
       var end = area.selectionEnd;
       var start = area.selectionStart;
       area.value = str.substring(0, start);
       switch(id) {
           case "fraction":
               area.value += "\\frac{x}{y}";
               break;
            case "exponent":
                area.value += "x^{y}";
                break;
            case "sigma":
                area.value += "\\sum_{i=0}^{n}";
                break;
            case "product":
                area.value += "\\prod_{i=0}^{n}";
                break;
            case "le":
                area.value += "\\le";
                break;
            case "ge":
                area.value += "\\ge";
                break;
            case "abc":
                area.value += "\\overline{abc}";
                break;
            case "integral":
                area.value += "\\int_{a}^{b} x \\, dx";
                break;
            case "pm":
                area.value += "\\pm";
                break;
            case "lim":
                area.value += "\\lim_{x\\to\\infty}\\frac{1}{x}";
                break;
            case "ln":
                area.value += "\\ln{e}";
                break;
            case "log":
                area.value += "\\log_{n} n^2";
                break;
            case "binom":
                area.value += "\\dbinom{9}{3}";
                break;
            case "degree":
                area.value += "x^\\circ";
                break;
            case "nthroot":
                area.value += "\\sqrt[n]{x}";
                break;
            case "sqrt":
                area.value += "\\sqrt{2}";
                break;
            case "times":
                area.value += "\\times";
                break;
            case "cdot":
                area.value += "\\vec{x} \\cdot \\vec{y}";
                break;
       }
       var len = area.value.length;
       area.value += str.substring(end);
       area.value.selectionStart = len;
       area.value.selectionEnd = len;

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