var tag = document.createElement('script');
tag.src = "http://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubePlayerAPIReady() {
      player = new YT.Player('youtube_player', {
         	height: '320',
          	width: '800', 
          	videoId: 'g8evyE9TuYk', 
			playerVars: {
		         'start': 10,
		       	 controls: '0'
		    },		
          	events: {
				'onReady': function(event) {
					event.target.playVideo();
					event.target.pauseVideo();
				},
            	'onStateChange': onPlayerStateChange
          	}
        });
}

function onPlayerStateChange(event) {
	socket.emit('video_change_state', event.target.getPlayerState());
}

socket.on('video_change_state', function(state) {
	switch(state)
	{
		//playing
		case 1:
			player.playVideo();
			break;
		//paused
		case 2:
			player.pauseVideo();
			break;
		//buffering
		case 3:
			player.pauseVideo();
			break;
		default:
	}
});

socket.on('video_change', function(link) {
	link =(gup('v',link));
	if(link.length > 0) {
		player.loadVideoById(link);
		player.pauseVideo();
	}
});

function stop() {
    player.stopVideo();
}

function play() {
	socket.emit('video_change_state', 1);
}

function pause() {
	socket.emit('video_change_state', 2);
}

function mute() {
	player.mute();
}

function unmute() {
	player.unmute();
}

function volume(level) {
	player.setVolume(level);
}

function changeTime(time) {
	player.seekTo(time, true);
}

//this is glitched
function totalTime() {
	return player.getDuration();
}

$(document).ready(function() {
	$('#start').click(function() {
		play();	
	});
	$('#stop').click(function() {
		stop();	
	});
	$('#pause').click(function() {
		pause();	
	});
	$('#mute').click(function() {
		mute();	
	});
	$('#unmute').click(function() {
		unmute();	
	});
	$('#video_slider').slider({
		slide: function(event, ui) {
			changeTime(ui.value);
		}
	});
	$('#volume').slider( {
		orientation: "horizontal",
		range: "min",
		min: 0,
		max: 100,
		value: 60,
		slide: function(event, ui) {
			volume(ui.value);
		}
	});
	
	$('#suggest_video').keypress(function(e) {
		if(e.which == 13) {
			var link = $('#suggest_video').val();
			$('#suggest_video').val('');
			socket.emit('video_change', link);
		}
	});
});

  /*Prase and get link parameter*/
function gup( name ,url )
{
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec(url);
  if( results == null )
    return "";
  else
    return results[1];
}