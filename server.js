var API_KEY = '15079881';
var API_SECRET = '88bef80ee8c70ebce1a26f146443a575e7e14bbc';

var app = require('express').createServer();
var io = require('socket.io').listen(app);
var opentok = require('opentok');
var ot = new opentok.OpenTokSDK(API_KEY, API_SECRET);

app.listen(3000);

var rooms = {};
var total_users = 0;
var current_room; //for add users and redirect

/*                   */
/* ROUTING FUNCTIONS */
/*                   */
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/home.html');
});

app.get('/room/:id', function (req, res) { 
	current_room=req.params.id;
	//check if room exists and if room is full *prob add a new page for too many users
  	if(rooms[current_room] != undefined && rooms[current_room].num_users < 4){
    	res.sendfile(__dirname + '/room.html');
	//prob a condition for room full
  	}else{
    	res.redirect('/');
  	}
});

app.get('/include/:file',function(req,res){
	res.sendfile(__dirname +"/public/"+req.params.file);
});

io.sockets.on('connection', function (socket){
  	/*                          */
  	/*   Home page functions    */
  	/*                          */
	socket.on('create_room',function(new_room){
    	//Check if the new room exists or not
    		if(rooms[new_room] == undefined){
				rooms[new_room]={usernames: {},
								 num_users: 0,
								 tok_sessionId: null,
								 tok_token: null
								 };

				//start tokbox session
				ot.createSession('localhost',{}, function(session) {
					rooms[new_room].tok_sessionId = session.sessionId;
				});

       			socket.emit('go_to_room', new_room);
    		}else{
     			socket.emit('room_already_exists', new_room);
    		}
  	});	

	/*                          */
  	/*      Room functions      */
  	/*                          */
	socket.on('adduser', function(username){
		//check if username already exists and correct format
		if(rooms[current_room].usernames[username] == undefined && checkUser(username)){
			socket.username = username;
			socket.room = current_room;

			//update variables
			rooms[socket.room].usernames[socket.username] = socket.id;
			rooms[socket.room].num_users += 1;
			total_users += 1;

			//start tokbox token for each user
			rooms[socket.room].tok_token = ot.generateToken({
				'sessionId': rooms[socket.room].tok_sessionId,
				'role': "publisher"
				});	
			
			console.log("mister" + rooms[socket.room].tok_sessionId);

			socket.join(socket.room);
			socket.emit('updatechat', 'SERVER', 'you have connected to ' + socket.room);
			socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', username + ' has connected to this room'); 
			io.sockets.in(socket.room).emit('updaterooms', rooms, socket.room);			
			io.sockets.in(socket.room).emit('updateusers', rooms[socket.room]);
		}
		//tell user to reenter name if there is an error
		else if(username == null || username.length == 0){
			socket.emit('reenteruser', 'Please input a name');		
		}else if(!checkUser(username)){
			socket.emit('reenteruser', 'Please input a name without symbols and spaces');		
		}else{
			socket.emit('reenteruser', 'That user exists, please enter another name');
		}
		
	});

	socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
		socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username +' has left this room')

		socket.room = newroom;
		socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has joined this room');
		socket.emit('updaterooms', rooms, socket.room);
	});
	
	socket.on('disconnect', function(){
		if(total_users > 0 && socket.room != undefined && rooms[socket.room].num_users > 0){
			delete rooms[socket.room].usernames[socket.username];		
			total_users -= 1;
			rooms[socket.room].num_users -= 1;			

			if(rooms[socket.room].num_users > 0){
				io.sockets.emit('updaterooms', rooms, socket.room); //dunno if necessary
				io.sockets.in(socket.room).emit('updateusers', rooms[socket.room]);
				//socket for checking if room is empty and to delete room

				socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has disconnected');
			}else{
				//delete room probably add some timer later on
				delete rooms[socket.room];				
			}
			socket.leave(socket.room);
		}
	});

	socket.on('sendchat', function (data){
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});
	
	/*                          */
  	/*     TokBox functions     */
  	/*                          */
	socket.on('startTok', function(){
		socket.emit('startTok', API_KEY, rooms[socket.room].tok_sessionId, rooms[socket.room].tok_token); 		
	});

	/*                          */
  	/*      Video functions     */
  	/*                          */
	socket.on('video_change_state', function(state){
		io.sockets.in(socket.room).emit('video_change_state', state);
	});
	
	socket.on('video_change', function(link) {
		io.sockets.in(socket.room).emit('video_change', link);
	});
});

//checks for valid syntax in username
function checkUser(name){
	var patt = /^[a-zA-Z0-9_-]+$/;
	if(name == null || name.match(patt) == null || name.length == 0){
		return false;	
	}			
	return true;
}
