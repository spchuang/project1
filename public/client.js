//chatbox variables
var base_url='http://localhost:3000';
var socket= io.connect(base_url);
var colors = {'red':'#FF0000', 'green':'#00FF00', 'blue':'#0000FF', 'yellow':'#FFFF00', 'teal': '#00FFFF'};

//tokbox variables
var session, publisher;
var dimensions ={ width: 160,
		height: 120};
				
socket.on('connect', function(){
	socket.emit('adduser', prompt("What's your name?"));
	TB.setLogLevel(TB.DEBUG); // Set this for helpful debugging messages in console	
	socket.emit('startTok');
});

//connect tokbox
socket.on('startTok', function(apiKey, tok_sessionId, tok_token){
	session = TB.initSession(tok_sessionId);
	session.addEventListener('sessionConnected', sessionConnectedHandler);
	session.addEventListener('streamCreated', streamCreatedHandler);	
	session.connect(apiKey, tok_token);
});

socket.on('reenteruser', function(data){
	socket.emit('adduser', prompt(data));
});	

socket.on('colorchange', function(color){
	$('#chat').css('color', colors[color]);
});

socket.on('updatechat', function (username, data){
	if(data.length > 0) {
		$('#chat').append('<b>' + username + ':</b> ' + data + '<br>');
		var myDiv = $('#chat'); 
		myDiv.animate({ scrollTop: myDiv.prop("scrollHeight")}, 10);
	}	
});

socket.on('updaterooms', function(rooms, current_room){
	$('#rooms').empty();
	$("#rooms").html("room: " + current_room);
});

socket.on('updateusers', function(room){
    $('#users').empty();
	//total_users for testing purposes
	$('#users').append('<div> users: ' + room.num_users + '</div>');
    $.each(room.usernames, function(key, value) {
		$('#users').append('<div>' + key + '</div>');
    })
});

function switchRoom(room){
	socket.emit('switchRoom', room);
}

//functions for tokbox event handler and subscribing
function sessionConnectedHandler(event) {
	publisher = session.publish('user', dimensions);
	subscribeToStreams(event.streams);
}
	
function streamCreatedHandler(event) {
	subscribeToStreams(event.streams);
}
	
function subscribeToStreams(streams) {
	for (var i = 0; i < streams.length; i++) {
		// Make sure we don't subscribe to ourself
		if (streams[i].connection.connectionId == session.connection.connectionId) {
			return;
		}

		// Create the div to put the subscriber element in to
		var div = document.createElement('div');
		div.setAttribute('id', 'stream' + streams[i].streamId);
		$('#user_wrap').append(div);
		// Subscribe to the stream
		session.subscribe(streams[i], div.id, dimensions);
	}
}

//sending chat
$(document).ready(function(){
	$('#data').keypress(function(e) {
		if(e.which == 13) {
			var message = $('#data').val();
			$('#data').val('');
			socket.emit('sendchat', message);		
		}
	});
});