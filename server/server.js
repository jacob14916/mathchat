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
         Rooms.update(roomname, {$set: {reserver: Meteor.user().username, allowed: arrayofusernames}});
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
            text: Meteor.user().username + " has reserved the room",
            createdAt: new Date(),
            room: roomname,
            owner: Meteor.userId(),
            username: "System",
            pinned: false
        });
     }
     else {
         if(Meteor.user().username !== Rooms.findOne(roomname).reserver) {
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
            text: Meteor.user().username + " may not unreserve the room",
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
                text: Meteor.user().username + " has unreserved the room",
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
  },
  requestentry: function(roomname) {
      if(Meteor.user()) {
        var allowed = Rooms.findOne(roomname).allowed;
        //console.log(Rooms.findOne(roomname));
        if(!Rooms.findOne(roomname).requests) {
            Rooms.update(roomname, {$set: {requests: []}});
        }
        var requesters = Rooms.findOne(roomname).requests;
        if(!_.contains(allowed, Meteor.user().username) && !_.contains(requesters, Meteor.user().username))
            Rooms.update(roomname, {$push: {requests: Meteor.user().username}});
      }
  },
  acceptrequest: function(roomname) {
      var requester = Rooms.findOne(roomname).requests[0];
      Rooms.update(roomname, {$pull: {requests: requester}});
      Rooms.update(roomname, {$push: {allowed: requester}});
      Meteor.call('insertMessage', roomname, requester + " has been invited to this room", "System");
  },
  declinerequest: function(roomname) {
      var requester = Rooms.findOne(roomname).requests[0];
      Rooms.update(roomname, {$pull: {requests: requester}});
  },
  updateSubscriptions: function(roomname) {
      var currentusers = Rooms.findOne(roomname).currentusers;
      var current = _.map(currentusers, function(item){return item.name});
      var arr = Meteor.users.find({}).fetch();
      var subscribed = _.filter(arr, function(item){
          if(item.subscriptions) // if it is null then gg
          return _.contains(_.map(item.subscriptions, function(subscription){return subscription.room}), roomname);
          else return false;
      });
      subscribed = _.map(arr, function(item){return item.username});
      var notThere = _.difference(subscribed, current);
      Meteor.users.update({username: {$in: notThere}}, {$pull: {subscriptions: {room: roomname}}});
      Meteor.users.update({username: {$in: notThere}}, {$push: {subscriptions: {room: roomname, unread: true}}});
  },
  updateSubscriptionsEnter: function(roomname) {
      if(Meteor.user() && Meteor.user().subscriptions) {
          Meteor.users.update(Meteor.userId(), {$pull: {subscriptions: {room: roomname}}});
          Meteor.users.update(Meteor.userId(), {$push: {subscriptions: {room: roomname, unread: false}}});
      }
  },
  clicksubscribe: function(roomname) {
      if(!Meteor.user().subscriptions) {
          
          Meteor.users.update(Meteor.userId(), {$set: {subscriptions: [{room: roomname, unread: false}]}});
      }
      else if (!_.contains(_.map(Meteor.user().subscriptions, function(item){return item.room}), roomname)){
          Meteor.users.update(Meteor.userId(), {$push: {subscriptions: {room: roomname, unread: false}}});
      }
      else {
          Meteor.users.update(Meteor.userId(), {$pull: {subscriptions: {room: roomname}}});
      }
      //console.log(Meteor.users.findOne(Meteor.userId()));
  }
});

Meteor.onConnection(function (conn) {
  conn.onClose(function () {
    Rooms.update({}, {$pull: {currentusers: {connection: conn.id}}}, {multi: true});
    Guests.remove({connection: conn.id});
  }); 
});

Meteor.publish("userData", function () {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId},
                             {fields: {'subscriptions': 1}});
  } else {
    this.ready();
  }
});
