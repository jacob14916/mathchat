Messages = new Mongo.Collection("messages");

if (Meteor.isClient) {
  // counter starts at 0
  //Session.setDefault('counter', 0);

  Template.chatarea.helpers({
    messages: function() {
      return Messages.find({}, {sort: ["createdAt"]});
    }
  });
  
  Template.chatarea.events({
    'submit .newchat': function (evt, inst) {
      var chatdiv = inst.find(".chatarea");
      chatdiv.scrollTop = chatdiv.scrollHeight;
    }
  });

  Template.chat.helpers({
    user: "user",
    time: function() {
      var date = this.createdAt;
      var ret = date.getMonth() + "/" + date.getDay() + "@" +
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
        if (evt.key != 13) return;
      var text = evt.target.text.value;
      Messages.insert({
          text: text,
          createdAt: new Date()
      });
      evt.target.text.value = "";
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    
  });
}
