Messages = new Mongo.Collection("messages");

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

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
      return date.getMonth() + "/" + date.getDay() + "@" +
	date.getHours() + ":" + date.getMinutes();
    }
  });

  Template.textentry.events({
    'submit .newchat': function (evt) {
      var text = evt.target.text.value;
      Messages.insert({
	text: text,
	createdAt: new Date()
      });
      evt.target.text.value = "";
      evt.preventDefault();
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    
  });
}
