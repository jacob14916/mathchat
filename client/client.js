// counter starts at 0
Session.setDefault('currentmsg', null);

Template.chatarea.events({
  'keypress .chatinput': function (evt, inst) {
    if (evt.keyCode != 13) return;
  }
});

Template.chatarea.helpers({
  messages: function () {
    return Messages.find({}, {sort: ["createdAt"]});
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
  user: "user",
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
	createdAt: new Date()
      });
      evt.target.value = "";
      evt.preventDefault();
      break;
    }
  },
  'keyup .chatinput': function (evt, inst) {
    if (evt.target.value) {
      Session.set("currentmsg",{createdAt: new Date(), text: evt.target.value});
    } else {
      Session.set("currentmsg", null);
    }
  }
});
