// counter starts at 0
Session.setDefault('currentmsg', null);
Session.setDefault('currentroom', null);
Session.setDefault('username', "Guest-oops");
Session.setDefault('adjusting', false);

Session.setDefault('messages', 0);
Session.setDefault('chatalert', false);
Session.setDefault('newmsg', false);
Session.setDefault('visible', true);

var titleRoot = "mathchat 0.1";
var titleBlinkStop = {handle:""};

var blink = function (func, values, current, timeout, stop) {
  var ret = func(values[current]);
  if (ret === false) return {handle: null};
  stop.handle = Meteor.setTimeout(
    blink.bind(null, func, values, (current + 1)%values.length, timeout, stop),
    timeout
  );
  return stop;
};

Router.configure({
  layoutTemplate: "layout"
});

Router.route('/', function () {
  Meteor.call("leaveRoom", null, true);
  Session.set('currentroom', null);
  this.render("homepage");
  document.title = titleRoot;
});

Router.route('/room/:roomname', function () {
  var roomname = this.params.roomname.toLowerCase(); // toLowerCase would toss out case sensitivity
  var that = this;
  Tracker.nonreactive(function () {
    if (!Rooms.find(roomname).count()) {
        Rooms.insert({_id: roomname, currentusers: [], reserver: null, allowed: [], requests: []});
    }
    if(Rooms.findOne(roomname).reserver) {
        if(!_.find(Rooms.findOne(roomname).allowed, 
        function(user){
            if(!Meteor.user()) return false;
            else return Meteor.user().username == user;
        })) {that.render('accessdenied');
            Meteor.call("leaveRoom", Session.get('currentroom'), true);
            Session.set('currentroom', roomname);
        }
        else {
            that.render("chatroom");
            Meteor.call("leaveRoom", Session.get('currentroom'), true);
            Session.set('currentroom', roomname);
            Meteor.call("joinRoom", roomname);
            Meteor.call("updateSubscriptionsEnter", roomname);
        }
    }
    else {
        that.render("chatroom");
        Meteor.call("leaveRoom", Session.get('currentroom'), true);
        Session.set('currentroom', roomname);
        Meteor.call("joinRoom", roomname);
        Meteor.call("updateSubscriptionsEnter", roomname);
    }
  });
  Session.set('currentroom', roomname);
  Meteor.call("joinRoom", roomname);
  document.title = roomname + " | " + titleRoot;
}, {name: 'room'});

Router.onBeforeAction(function () {
  Session.set("chatalert", false);
  Meteor.call("leaveRoom", Session.get('currentroom'), true);
  this.next();
});

Router.route('/guide', function () {
    this.render("guide");
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
        Meteor.call('updateSubscriptions', Session.get('currentroom'));
        
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
        Meteor.call('updateSubscriptions', Session.get('currentroom'));
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
  },
  'focus .chatinput': function(evt, inst) {
    Session.set("chatalert", false);
        $("#roomname").css("background-color", "gray");
        //Session.set('isFocused', true);
  }
});

Template.header.events({
  'submit .roomnav':function(evt) {
    evt.preventDefault();
    Router.go('/room/' + evt.target.room.value);
  },
  
  'click #subscribebutton': function(evt) {
      Meteor.call('clicksubscribe', Session.get('currentroom'));
      
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
	display += name + ((count>1)?" (x" + count + ")":"") + ((room.reserver == name) ? " (admin)" : "")+"<br>" ;
      }
    }
    return display;
  },
  resbutton: function() {
      var room = Rooms.findOne(Session.get('currentroom'));
      if(room.reserver && Session.get('username') == room.reserver) {
          return "Unreserve";
      }
      else if (room.reserver) {
          return "Room reserved";
      }
      else {
          return "Reserve room";
      }
  },
  reserved: function() {
      var reserver = Rooms.findOne(Session.get('currentroom')).reserver;
      if(Meteor.user() && reserver && Meteor.user().username == reserver) {
          $("#currentusers").css("height", "154px");
          return reserver;
      }
      else {
          $("#currentusers").css("height", "184px");
          return false;
      }
  },
  allowedusers: function() {
      var room = Rooms.findOne(Session.get('currentroom'));
        if(room.reserver) {
        //var room = Rooms.findOne(Session.get('currentroom'));
        var currentusernames = _.map(room.currentusers, function(val) {return val.name});
        var arr = _.difference(room.allowed, currentusernames);
        var display = "";
        for(var i = 0; i < arr.length; i++) {
          display += "<div class=\"invitedusers\"><span class=\"invited\" " +">" + arr[i] + " (invited) </span> <input class=\"removeinvited\" id=\"" + arr[i] + "\"" +"type=\"image\" src=\"/deletemsg.png\"/> </div>";
        }
        return display;
      }
  },
  requesters: function() {
      var room = Rooms.findOne(Session.get('currentroom'));
      return room.requests[0];
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
       evt.preventDefault();

   },
   'click #roomnamebutton': function(evt, inst) {
       Meteor.call('reserveroom', Session.get('currentroom'), Session.get('username'));
       evt.preventDefault();
   },
   'click #addbutton': function(evt, inst) {
       var input = inst.find("#addname");
       Meteor.call('adduser', input.value, Session.get('currentroom'));
       evt.preventDefault();
       input.value = "";
   },
   'keypress #addname': function(evt, inst) {
       if(evt.keyCode == 13) {
           var text = evt.target.value;
            if(text.length > 0) {
           while(text.substring(0, 1) == " " || text.substring(0, 1) == "\n")
             text = text.substring(1);
            }
            if(text && text !== "")
           Meteor.call('adduser', text, Session.get('currentroom'));
           evt.target.value = "";
       }
       
   },
   'click .removeinvited': function(evt) {
       var id = evt.target.id;
       Meteor.call('removeinvited', Session.get('currentroom'), id);
   },
   'click #acceptbutton': function() {
       Meteor.call('acceptrequest', Session.get('currentroom'));
   },
   'click #declinebutton': function() {
       Meteor.call('declinerequest', Session.get('currentroom'));
   }
});

Template.accessdenied.helpers({
    reserver: function() {
        return Rooms.findOne(Session.get('currentroom')).reserver;
    }
});
Template.accessdenied.helpers({
    allowed: function() {
        var allowarr = Rooms.findOne(Session.get('currentroom')).allowed;
        if(Meteor.user())
          return _.contains(allowarr, Meteor.user().username);
        else return false;
    },
    sendrequestvalue: function() {
        var requesters = Rooms.findOne(Session.get('currentroom')).requests;
        var allowarr = Rooms.findOne(Session.get('currentroom')).allowed;
        if(Meteor.user()) {
            if(_.contains(requesters, Meteor.user().username)) return "Request Sent";
            else if(_.contains(allowarr, Meteor.user().username)) return "Accepted";
            else return "Send request";
        }
        else {
            return "Send request";
        }
    },
    loggedin: function() {
        if(Meteor.user()) {
            return "To enter the room, you can send a request to the room admin";
        }
        else {
            return "In order to send a request to the room admin, you must sign in";
        }
    }
});
Template.accessdenied.events({
    'click #requestinvite': function(evt) {
        Meteor.call("requestentry", Session.get('currentroom'));
    }
});

Template.header.helpers({
   canSubscribe: function() {
       if(Meteor.user()) {
           var where = Router.current().route.getName();
           return where && where.substring(0, 4) == "room";
       }
       else return false;
   },
   isSubscribed: function() {
       if(Meteor.user()) {
           if(Meteor.user().subscriptions) {
             var arr = new Array();
             for (var i = 0; i < Meteor.user().subscriptions.length; i++) {
                 arr[i] = Meteor.user().subscriptions[i].room;
             }
             if( _.contains(arr, Session.get('currentroom'))) return "Unsubscribe";
             else return "Subscribe to " + Session.get('currentroom');
           }
           else return "Subscribe to " + Session.get('currentroom');
       }
       else {
           return "Subscribe to...logging in!";
       }
   }
});

Template.homepage.helpers({
    currentUsername: function() {
        return Meteor.user().username;
    },
    unreadMessages: function() {
        var arr = Meteor.user().subscriptions;
        console.log(Meteor.user());
        var str = "";
        if(arr) {
        for(var i = 0; i < arr.length; i++) {
            if(arr[i].unread) {
                str += "<li class=\"subscribedTo\" style=\"font-weight: bold\"> <a href=\"/room/" + arr[i].room + "\">" +arr[i].room + "</a></li>";
            }
            else {
                str += "<li class=\"subscribedTo\"><a href=\"/room/" + arr[i].room + "\">" + arr[i].room + "</a><input type=\"image\" class = \"deletesubscription\"id=\"" + arr[i].room + "\" src=\"/deletemsg.png\" /></li>";
            }
        }
        }
        if(str == "") return "Looks like don't have any subscriptions!";
        else return str;
    }
});

Template.homepage.events({
    'click .deletesubscription': function(evt) {
        Meteor.call('clicksubscribe', evt.target.id);
        
    }
});

Meteor.startup(function() {
  console.log(Date());
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

  Tracker.autorun(function () {
    var fkk=":{bar}";
  });

  Tracker.autorun(function () {
    var chatalert = Session.get("chatalert");
    console.log("Chatalert", chatalert);
    if (chatalert) {
      titleBlinkStop = blink(function (t) {
	document.title = t;
      }, ["New message(es) in " + document.title, document.title], 0, 1000, {});
    } else {
      Meteor.clearTimeout(titleBlinkStop.handle);
      document.title = Session.get("currentroom") ? (Session.get("currentroom") + " | " + titleRoot) : titleRoot;
    }
  });

  Tracker.autorun(function () {
    var visible = Session.get("visible");
    var oldcount;
    Tracker.nonreactive(function () {
      console.log("getting oldcount");
      oldcount = Session.get("messages");
    });
    
    var msgcount = Messages.find({
      room: Session.get("currentroom"),
      username:{$ne: Session.get("username")}
    }).count();

    console.log("visible", visible, "msgcount", msgcount, oldcount);
    if (msgcount > oldcount && !visible) {
      Session.set("chatalert", true);
      console.log("chatalert set to true");
      Session.set("messages", msgcount);
    } else {
      Session.set("chatalert", false);
    }
  });

  document.addEventListener("visibilitychange", function () {
    var state = document.visibilityState;
    if (state === "hidden") {
      Session.set("visible", false);
    } else {
      Session.set("visible", true);
    }
    console.log(state);
  });
});

Meteor.subscribe("userData");
