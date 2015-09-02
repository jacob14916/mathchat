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
  },
  reserveroom: function(roomname, username) {
      if(!Meteor.user()) {
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
            text: username + " is not logged in. Please log in before reserving a room",
            createdAt: new Date(),
            room: roomname,
            owner: Meteor.userId(),
            username: "System",
            pinned: false
        });
      }
     else if (!Rooms.findOne(roomname).reserver) {
         var arrayofusers = Rooms.findOne(roomname).currentusers;

         var arrayofuserswithdupl = new Array();
         for(var i = 0; i < arrayofusers.length; i++) {
             arrayofuserswithdupl[i] = arrayofusers[i].name;
         }
         //console.log(arrayofusernames);
         var arrayofusernames = _.uniq(arrayofuserswithdupl);
         Rooms.update(roomname, {$set: {reserver: username, allowed: arrayofusernames}});
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
            text: username + " has reserved the room",
            createdAt: new Date(),
            room: roomname,
            owner: Meteor.userId(),
            username: "System",
            pinned: false
        });
     }
     else {
         if(username !== Rooms.findOne(roomname).reserver) {
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
            text: username + " may not unreserve the room",
            createdAt: new Date(),
            room: roomname,
            owner: Meteor.userId(),
            username: "System",
            pinned: false
        });
         }
         else {
             Rooms.update(roomname, {$set: {reserver: null}});
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
                text: username + " has unreserved the room",
                createdAt: new Date(),
                room: roomname,
                owner: Meteor.userId(),
                username: "System",
                pinned: false
            });
         }
     }
  },
  adduser: function(name, room) {
      var roomdoc = Rooms.findOne(room);
      //console.log("HI!");
      if(Meteor.users.findOne({username: name})) {
          var allowedarr = roomdoc.allowed;
          var x = false;
          for(var i = 0; i < allowedarr.length; i++) {
              if(allowedarr[i] == name) {
                  x = true;
              }
          }
          //console.log(x);
          if(!x) {
              Rooms.update(room, {$push: {allowed: name}});
              //console.log("ended up here!");
              //console.log(Rooms.findOne(room).allowed);
              Meteor.call('insertMessage', room, name + " has been added to the allowed list", "System");
              //console.log("got past the call!");
          }
          else {
              Meteor.call('insertMessage', room, name + " has already been added", "System");
          }
      }
      else {
          Meteor.call('insertMessage', room, name + " does not exist...yet", "System");
      }
  },
  insertMessage: function(roomname, message, username) {
      //console.log("ping");
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
    //console.log(message);
    Messages.insert({
        identifier: str,
        text: message,
        createdAt: new Date(),
        room: roomname,
        owner: Meteor.userId(),
        username: username,
        pinned: false
    });
  },
  removeinvited: function(room, id) {
      var roomdoc = Rooms.findOne(room);
      //console.log("hello");
      if(Meteor.user().username == roomdoc.reserver) {
          Rooms.update(room, {$pull: {allowed: id}});
          Meteor.call('insertMessage', room, id + " has been removed from the invited list", "System");
      }
      else {
          Meteor.call('insertMessage', room, Meteor.user().username + " cannot remove invited members (not admin)", "System");
      }
  }
});

Meteor.onConnection(function (conn) {
  conn.onClose(function () {
    Rooms.update({}, {$pull: {currentusers: {connection: conn.id}}}, {multi: true});
    Guests.remove({connection: conn.id});
  }); 
});
