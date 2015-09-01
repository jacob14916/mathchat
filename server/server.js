var numGuests = 0;

Meteor.startup(function(){
    
});

Meteor.methods({
  registerClient: function () {
    var conn_id = this.connection.id, user = Meteor.user();
    if (!user) {
      var guest = Guests.findOne({connection: conn_id}), guestname="";
      if(!guest) {
	guestname =  "Guest-" + (numGuests++);
	Guests.insert({
	  name: guestname,
	  connection: conn_id
	});
      } else {
	guestname = guest.name;
      }
      return guestname;
    } else {
      Guests.remove({connection: conn_id});
      return user.username;
    }
  },
  joinRoom: function (room) {
    var user = Meteor.user(), conn_id = this.connection.id, username = "";
    if (user) {
      username = user.username;
    } else {
      username = Guests.findOne({connection: conn_id}).name||"oops";
    }
    Rooms.update(room, {$addToSet: {"currentusers": {
      name: username,
      connection: conn_id
    }}});
  },
  leaveRoom: function (room, all) {
    Rooms.update(all?{}:room, {$pull: {currentusers: {connection: this.connection.id}}}, {multi:true});
  },
  
  removemessage: function(roomname, id) {
      if(Meteor.userId() && Meteor.userId() == Messages.findOne({room: roomname, identifier: id}).owner) {
        Messages.remove({room: roomname, identifier: id});
      }
  }
});

Meteor.onConnection(function (conn) {
  conn.onClose(function () {
    Rooms.update({}, {$pull: {currentusers: {connection: conn.id}}}, {multi: true});
    Guests.remove({connection: conn.id});
  }); 
});
