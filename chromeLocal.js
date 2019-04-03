function closeEditorWarning(){
	stopStreaming(true);
}

window.onbeforeunload = closeEditorWarning;

var FORMAT_LABELS = {
    '5': 'FLV 240p',
    '18': 'MP4 360p',
    '22': 'MP4 720p (HD)',
    '34': 'FLV 360p',
    '35': 'FLV 480p',
    '37': 'MP4 1080p (HD)',
    '38': 'MP4 4K (HD)',
    '43': 'WebM 360p',
    '44': 'WebM 480p',
    '45': 'WebM 720p (HD)'
};
var FORMAT_EXTENSIONS = {
    '5': 'flv',
    '18': 'mp4',
    '22': 'mp4',
    '34': 'flv',
    '35': 'flv',
    '37': 'mp4',
    '38': 'mp4',
    '43': 'webm',
    '44': 'webm',
    '45': 'webm'
};
var FORMAT_LIST = ['18', '22', '37', '38']; //, '43', '44', '45'
var DOWNLOAD_LINK_MESSAGES = {
    'en': 'AirPlay'
};
var DOWNLOAD_TOOLTIP_MESSAGES = {
    'en': 'AirPlay this video'
};
var DOWNLOAD_LINK_MESSAGE = 'AirPlay';
var DOWNLOAD_TOOLTIP_MESSAGE = 'AirPlay this video';
var DOWNLOAD_YOUTUBE_SPAN_ID = 'airplay-youtube-video';
var DOWNLOAD_YOUTUBE_FMT_ID = 'airplay-youtube-video-fmt';
var DOWNLOAD_YOUTUBE_BUTTON_ID = 'airplay-youtube-video-button';
var OLD_UI = 1, NEW_UI = 2;

var videoId, videoTicket, videoFormats, videoTitle = '';
var interfaceVersion = OLD_UI;

var LOAD_TIMEOUT = 1000, SEEK_TIMEOUT = 100, PLAY_TIMEOUT = 15000;

// This should be a setting eventually, a la Transmission Remote.
var machineName = 'Apple-TV.local';

var clickedPlay = false;
var duration = 0, position = 0, seekTo = 0;
var isLoaded = false, isSeeked = false, isPlayed = false;
var playCounter = 0, lastCounter = 0;
var videoSource = '';

function startStreaming(videoURI) {
	var tempPlayer = document.getElementById('movie_player');
	if (tempPlayer) {
		seekTo = tempPlayer.getCurrentTime() - 1;
		tempPlayer.stopVideo();
	} else {
		tempPlayer = document.getElementById('movie_player-html5').getElementsByTagName('video')[0];
		tempPlayer.pause();
		seekTo = tempPlayer.currentTime - 1;
		videoSource = tempPlayer.src;
		document.getElementById('movie_player-html5').getElementsByTagName('video')[0].src = '';
	}
	var req = new XMLHttpRequest();
	clickedPlay = true;
	++playCounter;
	req.open('POST', 'http://' + machineName + ':7000/play', false);
	req.send('Content-Location:' + videoURI + '\nStart-Position: 0.0\n');
	console.log('startStreaming() calling loadLoop() in ' + LOAD_TIMEOUT + ' seconds.');
	setTimeout('loadLoop();', LOAD_TIMEOUT);
}

function stopStreaming(automatically) {
	scrub();
	var tempPosition = position;
	var req = new XMLHttpRequest();
	req.open('POST', 'http://' + machineName + ':7000/stop', false);
	req.send();
	clickedPlay = false;
	duration = 0;
	position = 0;
	seekTo = 0;
	isLoaded = false;
	isSeeked = false;
	isPlayed = false;
	if (!automatically) {
		var tempPlayer = document.getElementById('movie_player');
		console.log('SEEK YOUTUBE: ' + tempPosition);
		if (tempPlayer) {
			tempPlayer.seekTo(tempPosition, true) - 1;
			tempPlayer.playVideo();
		} else {
			tempPlayer = document.getElementById('movie_player-html5').getElementsByTagName('video')[0];
			document.getElementById('movie_player-html5').getElementsByTagName('video')[0].src = videoSource;
			tempPlayer.currentTime = tempPosition - 1;
			tempPlayer.play();
			
		}
	}
}

function loadLoop() {
	scrub();
	if (seekTo <= 1 && duration > 0) {
		console.log('loadLoop() calling playLoop() in ' + PLAY_TIMEOUT + ' seconds.');
		if (!isPlayed) {
			isPlayed = true;
			setTimeout('playLoop();', PLAY_TIMEOUT);
		}
	} else if (seekTo > 1 && duration > 0) {
		console.log('loadLoop() calling seekLoop() in ' + SEEK_TIMEOUT + ' seconds.');
		if (!isSeeked) {
			isSeeked = true;
			setTimeout('seekLoop();', SEEK_TIMEOUT);
		}
	} else {
		console.log('loadLoop() calling loadLoop() in ' + LOAD_TIMEOUT + ' seconds.');
		setTimeout('loadLoop();', LOAD_TIMEOUT);
	}
}

function seekLoop() {
	scrub();
	if (position > 0) {
		console.log('SEEK: ' + seekTo); // TODO: Get rid of this!
		var req = new XMLHttpRequest();
		req.open('POST', 'http://' + machineName + ':7000/scrub?position=' + seekTo, false);
		req.send();
		seekTo = 0;
		console.log('seekLoop() calling playLoop() in ' + PLAY_TIMEOUT + ' seconds.');
		if (!isPlayed) {
			isPlayed = true;
			setTimeout('playLoop();', PLAY_TIMEOUT);
		}
	} else {
		console.log('seekLoop() calling seekLoop() in ' + SEEK_TIMEOUT + ' seconds.');
		setTimeout('seekLoop();', SEEK_TIMEOUT);
	}
}



function playLoop() {
	if (!clickedPlay)
		return;
	scrub();
	if (position > duration - 1.0 || (duration == 0.0 && position == 0.0)) {
		console.log('Video is over... let\'s close it...'); // TODO: Get rid of this!
		stopStreaming(true);
	} else {
		if (duration - position > PLAY_TIMEOUT / 1000) {
			console.log('playLoop() calling playLoop() in PLAY_TIMEOUT: ' + PLAY_TIMEOUT + ' seconds.');
			setTimeout('playLoop();', PLAY_TIMEOUT);
		} else {
			console.log('playLoop() calling playLoop() in duration - position: ' + (duration - position) + ' seconds.');
			setTimeout('playLoop();', (duration - position) * 1000);
		}
	}
}

function scrub() {
	var req = new XMLHttpRequest();
	req.open('GET', 'http://' + machineName + ':7000/scrub', false);
	req.send();
	var response = req.responseText;
	if (response) {
		response = response.split('\n');
		response.splice(response.length - 1); // Get rid of the empty line.
		for (var i = 0; i < response.length; ++i) {
			response[i] = response[i].split(':');
			console.log('SCRUB: ' + response[i][0] + ' ' + parseFloat(response[i][1])); // TODO: Get rid of this!
			if (response[i][0] == 'duration') {
				duration = parseFloat(response[i][1]);
			} else if (response[i][0] == 'position') {
				position = parseFloat(response[i][1]);
			}
		}
	}
}

run();

function run() {
    if (document.getElementById(DOWNLOAD_YOUTUBE_SPAN_ID)) return;

    // obtain video ID, temporary ticket, formats map
    var videoPlayer = document.getElementById('watch-player');
    if (videoPlayer && videoPlayer.className != 'html5-player') { // Flash
        var flashValues = videoPlayer.innerHTML;
        var videoIdMatches = flashValues.match(/\&amp;video_id=([^(\&|$)]*)/);
        videoId = (videoIdMatches) ? videoIdMatches[1] : null;
        var videoTicketMatches = flashValues.match(/\&amp;t=([^(\&|$)]*)/);
        videoTicket = (videoTicketMatches) ? videoTicketMatches[1] : null;
        var videoFormatsMatches = flashValues.match(/\&amp;url_encoded_fmt_stream_map=([^(\&|$)]*)/);
        videoFormats = (videoFormatsMatches) ? videoFormatsMatches[1] : null;
    }

    if (videoId == null || videoTicket == null) { // HTML5 - Firefox, Opera
        var config = null;
        if (typeof (unsafeWindow) == 'undefined') { // Opera
            unsafeWindow = window;
        }
        if (unsafeWindow.yt && unsafeWindow.yt.getConfig) {
            config = unsafeWindow.yt.getConfig('PLAYER_CONFIG');
        }
        if (config && config.args) {
            var args = config.args;
            videoId = args['video_id'];
            videoTicket = args['t'];
            videoFormats = args['url_encoded_fmt_stream_map'];
            if (videoFormats == null) {
                videoFormats = args['fmt_url_map'];
            }
        }
    }

    if (videoId == null || videoTicket == null) { // everything else (HTML5 - Chrome)
        var pageFooter = document.getElementById('postpage');
        if (pageFooter) {
            var pageFooterContent = pageFooter.innerHTML;
            var videoIdMatches = pageFooterContent.match(/\"video_id\":\s*\"([^\"]*)\"/);
            videoId = (videoIdMatches) ? videoIdMatches[1] : null;
            var videoTicketMatches = pageFooterContent.match(/\"t\":\s*\"([^\"]*)\"/);
            videoTicket = (videoTicketMatches) ? videoTicketMatches[1] : null;
            var videoFormatsMatches = pageFooterContent.match(/\"fmt_url_map\":\s*\"([^\"]*)\"/);
            videoFormats = (videoFormatsMatches) ? videoFormatsMatches[1] : null;
        }
    }

    if (videoId == null || videoTicket == null) { // future proof
        var bodyContent = document.body.innerHTML;
        var videoIdMatches = bodyContent.match(/\"video_id\":\s*\"([^\"]*)\"/);
        videoId = (videoIdMatches) ? videoIdMatches[1] : null;
        var videoTicketMatches = bodyContent.match(/\"t\":\s*\"([^\"]*)\"/);
        videoTicket = (videoTicketMatches) ? videoTicketMatches[1] : null;
        var videoFormatsMatches = bodyContent.match(/\"url_encoded_fmt_stream_map\":\s*\"([^\"]*)\"/);
        videoFormats = (videoFormatsMatches) ? videoFormatsMatches[1] : null;
    }

    if (videoId == null || videoTicket == null) return;

    // video title
    var headerTitle = document.getElementById('eow-title');
    if (headerTitle != null) {
        videoTitle = headerTitle.textContent || headerTitle.innerText || '';
    }
    if (videoTitle == '') {
        var titleTag = document.title;
        if (titleTag != null) {
            videoTitle = titleTag.replace(/^YouTube \- /i, '');
        }
    }
    videoTitle = videoTitle.replace(/[#"\?:\*]/g, '').replace(/[&\|\\\/]/g, '_').replace(/'/g, '\'').replace(/^\s+|\s+$/g, '').replace(/\.+$/g, '');
    if (videoTitle == '') {
        videoTitle = 'video';
    }


    // parse fmt_url_map
	var videoURL = new Array();
	var sep = '%2C';
	if (videoFormats.indexOf(',') > -1)
		sep = ',';

	var videoFormatsGroup = videoFormats.split(sep);
	for(var i = 0; i < videoFormatsGroup.length; i++) {
		var pairs = unescape(unescape(videoFormatsGroup[i])).replace(/\\u0026/g, '&').replace(/url=.*\?/g, '').split('&');
		var params = new Array();
		for(var j = 0; j < pairs.length; j++) {
			var param = pairs[j].split('=');
			params[param[0]] = param[1];
		}
		videoURL[params['itag']] = 'http://youtube.com/videoplayback?ratebypass=' + params['ratebypass'] + '&sver=' + params['sver'] + '&expire=' + params['expire'] + '&key=' + params['key'] + '&id=' + params['id'] + '&mv=' + params['mv'] + '&sparams=' + params['sparams'] + '&ipbits=' + params['ipbits'] + '&ip=' + params['ip'] + '&itag=' + params['itag'] + '&mt=' + params['mt'] + '&fexp=' + params['fexp'] + '&ms=' + params['ms'] + '&source=' + params['source'] + '&upn=' + params['upn'] + '&cp=' + params['cp'] + '&newshard=' + params['newshard'] + '&signature=' + params['sig'] + '';
	}

	var downloadCodeList = [];
	for(var i = 0; i < FORMAT_LIST.length; i++) {
		var format = FORMAT_LIST[i];
		// don't add lower quality FLV versions to prevent clutter
		if (format == '5' && (videoURL['34'] != undefined || videoURL['35'] != undefined))
			continue;
		if (format == '34' && videoURL['35'] != undefined)
			continue;
		if (videoURL[format] != undefined && FORMAT_LABELS[format] != undefined) {
			downloadCodeList.push({
				url : videoURL[format] + '&title=' + videoTitle,
				format : format,
				label : FORMAT_LABELS[format]
			});
		}
	}

    var uiLanguage = document.documentElement.getAttribute('lang');
    if (/^lt|bg|uk$/.test(uiLanguage)) {
        var likeButton = document.getElementById('watch-like');
        if (likeButton) {
            var spanElements = likeButton.getElementsByTagName('span');
            if (spanElements) {
                spanElements[0].style.display = 'none';
            }
        }
    }

    if (DOWNLOAD_LINK_MESSAGES[uiLanguage] != null) {
        DOWNLOAD_LINK_MESSAGE = DOWNLOAD_LINK_MESSAGES[uiLanguage];
    }
    if (DOWNLOAD_TOOLTIP_MESSAGES[uiLanguage] != null) {
        DOWNLOAD_TOOLTIP_MESSAGE = DOWNLOAD_TOOLTIP_MESSAGES[uiLanguage];
    }

    // find parent container
    var parentElement = document.getElementById('watch7-secondary-actions');
    if (parentElement == null) return;

    // generate download code
    var downloadCode = '<span class="yt-uix-button-content">' + DOWNLOAD_LINK_MESSAGE + '</span>';
    downloadCode += '<img class="yt-uix-button-arrow" src="//s.ytimg.com/yt/img/pixel-vfl3z5WfW.gif" alt="" style="vertical-align: baseline;" /> <ol style="display:none;" class="yt-uix-button-menu">';
    
    downloadCode += '<li><a style="text-decoration:none;" href="#"><span class="yt-uix-button-menu-item" id="stop-airplay">Stop AirPlay</span></a></li>';
    
    for (var i = 0; i < downloadCodeList.length; i++) {
        downloadCode += '<li><a style="text-decoration:none;" href="' + encodeURI(downloadCodeList[i].url) + '"><span class="yt-uix-button-menu-item" loop="' + i + '" id="' + (DOWNLOAD_YOUTUBE_FMT_ID + downloadCodeList[i].format) + '">' + downloadCodeList[i].label + '</span></a></li>';
    }
    downloadCode += '</ol>';
    downloadCode = '<button id="' + DOWNLOAD_YOUTUBE_BUTTON_ID + '" data-button-listener="" data-tooltip-timer="271" class="yt-uix-button yt-uix-button-default yt-uix-tooltip' + ((interfaceVersion == OLD_UI) ? ' yt-uix-tooltip-reverse' : '') + '" title="' + DOWNLOAD_TOOLTIP_MESSAGE + '" onclick="return false;" type="button">' + downloadCode + '</button>';

    // add the button
    var containerSpan = document.createElement('span');
    containerSpan.id = DOWNLOAD_YOUTUBE_SPAN_ID;

    var leftmostButton = document.getElementById('watch-transcript') || document.getElementById('watch-flag') || null;
    if (leftmostButton && leftmostButton.parentNode == parentElement) {
        containerSpan.innerHTML = downloadCode + ' ';
        parentElement.insertBefore(containerSpan, leftmostButton);
    } else {
        containerSpan.innerHTML = ' ' + downloadCode;
        parentElement.appendChild(containerSpan);
    }
    
    // stop button
    var stop_button = document.getElementById('stop-airplay');
    if (stop_button.addEventListener) {
        stop_button.addEventListener('click', stopButton, false);
    } else if (stop_button.attachEvent) { // IE
        stop_button.attachEvent('onclick', stopButton);
    }

    for (var i = 0; i < downloadCodeList.length; i++) {
        var downloadFMT = document.getElementById(DOWNLOAD_YOUTUBE_FMT_ID + downloadCodeList[i].format);
        if (downloadFMT.addEventListener) {
            downloadFMT.addEventListener('click', downloadVideo, false);
        } else if (downloadFMT.attachEvent) { // IE
            downloadFMT.attachEvent('onclick', downloadVideo);
        }
    }
    
    //videoPlayer.innerHTML = '<video src="' + downloadCodeList[downloadCodeList.length - 1] + '"></video>';

    function downloadVideo(e) {
        var e = e || window.event; // IE
        var elem = e.target || e.srcElement;
        e.returnValue = false;
        if (e.preventDefault) {
            e.preventDefault();
        }
        var loop = elem.getAttribute('loop');
        var temp = downloadCodeList[loop].url;
        startStreaming(temp.substr(0, temp.lastIndexOf('&')));
    }
    
    function stopButton(e) {
        var e = e || window.event; // IE
        var elem = e.target || e.srcElement;
        e.returnValue = false;
        if (e.preventDefault) {
            e.preventDefault();
        }
        stopStreaming(false);
    }

}