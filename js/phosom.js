
var g_allAPIsLoaded;
var g_activeUser;
var g_activeGame;
var g_pageAfterLogin;
var g_uploadUrl;

$( document ).ready(function(){
	
    var isLocalStorage;
    try {
        isLocalStorage = ('localStorage' in window && window.localStorage !== null);
    } catch (e) {
        isLocalStorage = false;
    }
    var userStorageKey = 'phosomUser';
    function getUserFromLocalStorage() {
    	var userData = undefined;
    	if( isLocalStorage ) {
    		var userString = localStorage[userStorageKey];
    		if( userString) {
    			userData = JSON.parse( userString );
    		}
    	}
    	return userData;
    }
    function saveUserToLocalStorage( userData ) {
    	if( isLocalStorage ) {
    		localStorage[userStorageKey] = JSON.stringify( userData );
    	}
    }
    
    g_activeUser = getUserFromLocalStorage();
    
    // TODO: move game behaviour into it's own object / enclosure!
    
	
    function navigateToPageOrLoginIfNeeded( pageId ) {
		if( g_activeUser ) {
			$.mobile.changePage( '#'+pageId );
		} else {
			g_pageAfterLogin = pageId;
			$.mobile.changePage('#phosom-get-user');
		}    	
    }
    
    function getFileNameFromURL( url ) {
    	return url.substring(url.lastIndexOf('/')+1, url.length)
    }
    

    
    function handleResultFromResponse( result ) {
        if( result.error ) {
            $.mobile.loading( 'show', { 
                html: 'Sending that picture failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
                    +result.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
                textVisible:true, textonly: true} );
            setTimeout( $.mobile.loading( 'hide' ), 5000 );
        } else {
        
            console.log(result);
            
            $.mobile.changePage( '#phosom-challenge-result' );
        }        
    }
    
	function respondWithUrlToImage( url, sourceUrl, sourceTitle ) {
		$.mobile.loading( 'show', { text: 'Sending...', textVisible:true});
		
		gapi.client.autoChallengeGameService.respondToChallengeWithUrl({
			'gameId':g_activeGame.key.id,
			'playerId':g_activeUser.key.id,
			'url': url,
			'sourceurl': sourceUrl,
			'sourcetitle': sourceTitle
		}).execute(function(respUrlSent){
			
			console.log(respUrlSent);
            handleResultFromResponse( respUrlSent );
		});
	}
	
    
    ///// button events
	
	$('#btn-create-game').click(function(){
		
		$( '#phosom-game-creation' ).data( 'game-type', 'autoChallenge' );
		
		navigateToPageOrLoginIfNeeded( 'phosom-game-creation' );
	});
	
	$('#btn-game-overview').click(function(){
		
		navigateToPageOrLoginIfNeeded( 'phosom-challenges-overview' );
	});
	
	$('#btn-game-join').click(function(){
		
		navigateToPageOrLoginIfNeeded( 'phosom-game-join' );
	});
	
	
	$('#login').submit(function(){
		$.mobile.loading( 'show', { text: 'Going...', textVisible:true});
		
		gapi.client.playerfactory.createPlayerWithName(
				{'name':$('#name').val()}).execute(function(resp){
					
			if( resp.error ) {
				$.mobile.loading( 'show', { 
					html: 'Player creation failed for some fun reason.<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+resp.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {
				
				g_activeUser = resp;
				saveUserToLocalStorage(g_activeUser);
				console.log(resp);
				
				$.mobile.changePage( '#'+g_pageAfterLogin );	
			}
		});
		
		return false;
	});
	
	$('#respond-with-url').submit(function(){
		
		respondWithUrlToImage( $('#challenge-response-with-url').val(), "", "" );
		
		return false;
	});
    
    
    $('#respond-with-upload').submit(function(){
        $.mobile.loading( 'show', { text: 'Uploading...', textVisible:true});
        
	   var formData = new FormData($(this));
        $.ajax({
            url: g_uploadUrl,
            type: 'POST',
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if( myXhr.upload ) {
                    myXhr.upload.addEventListener('progress', function(e){
                        if( e.lenthComputable ) {
                            $('#uploadProgress').text( Math.round(e.loaded / e.total)*100 + '%' );
                        }
                    }, false);
                }
                return myXhr;
            },
            success: function(data) {
                
                handleResultFromResponse( {'success': true} );
            },
            error: function() {
                
                handleResultFromResponse( {'error': {'message': 'File upload failed.'}} );
            },
            data: formData,
            contentType: false,
            processData: false
        });
		return false;
	});
    
	function win(r) {
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);
		
		handleResultFromResponse( {'success': true} );
	}
	function fail(error) {

		handleResultFromResponse( {'error': {
				'message': 'File upload failed.  Code = ' + error.code}} );
	}
	if( navigator.camera ) {
		var devicePictureOptions = {
			quality : 75, 
			destinationType : navigator.camera.DestinationType.FILE_URI, 
			sourceType : navigator.camera.PictureSourceType.CAMERA, 
			allowEdit : true,
			encodingType: navigator.camera.EncodingType.JPEG,
			targetWidth: 600,
			targetHeight: 600,
			// popoverOptions: CameraPopoverOptions, // http://docs.phonegap.com/en/1.8.0/cordova_camera_camera.md.html#CameraPopoverOptions
			saveToPhotoAlbum: true 
		};
	}
	function uploadPhotoFromCamera( imageURI  ) {
		$.mobile.loading( 'show', { text: 'Uploading...', textVisible:true});

		var options = new FileUploadOptions();
		options.fileKey="photo";
		options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var params = new Object();
		params.gameid = g_activeGame.key.id;
		params.playerid = g_activeUser.key.id;

		options.params = params;

		var ft = new FileTransfer();
		ft.upload(imageURI, g_uploadUrl, win, fail, options);
	}
	function errorInUploadFromCamera( message ) {
		$.mobile.loading( 'show', { 
			html: 'Capturing that picture failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
				+message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
			textVisible:true, textonly: true} );
		setTimeout( $.mobile.loading( 'hide' ), 5000 );
	}
    $( "#button-camera" ).on( "click", function(event) {
        event.preventDefault();
        navigator.camera.getPicture(
            uploadPhotoFromCamera,
            errorInUploadFromCamera,
			$.extend({sourceType : navigator.camera.PictureSourceType.CAMERA}, devicePictureOptions)
        );
    });
	$( "#button-photogallery" ).on( "click", function(event) {
        event.preventDefault();
        navigator.camera.getPicture(
            uploadPhotoFromCamera,
            errorInUploadFromCamera,
			$.extend({sourceType : navigator.camera.PictureSourceType.PHOTOLIBRARY}, devicePictureOptions)
        );
    });
	
//    $( "#button-photogallery" ).on( "click", function(event){
//        // ath phonegap option:  Camera.MediaType.PICTURE , sbr http://docs.phonegap.com/en/2.5.0/cordova_camera_camera.md.html
//    });
    
    
	$('#form-game-join').submit(function(){
		$.mobile.loading( 'show', { text: 'Joining game...', textVisible:true});
		
		var gameId = $(this).find('#text-game-id').val();
		
		gapi.client.autochallengegameendpoint.getAutoChallengeGame({
			'id': gameId
		}).execute(function(game){
			
			if( game.error ) {
				$.mobile.loading( 'show', { 
					html: 'An error came up while joining the game.<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+game.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {
				
				if( game ) {
					
					g_activeGame = game;
					
					addCurrentPlayerToCurrentGameAndShowChallenge();
				} else {
					alert("No game found with that ID");
				}				
			}
		});		
		
		return false;
	});
	
	function setCurrentGameIdFromChallengeLink(event, ui) {
		event.preventDefault();
		var gameId = $(this).data('gameid');
		gapi.client.autochallengegameendpoint.getAutoChallengeGame({
			'id': gameId
		}).execute(function(game){
			
			if( game.error ) {
				$.mobile.loading( 'show', { 
					html: 'An error came up while looking up that game.<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+game.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {

				g_activeGame = game;
				
				$.mobile.changePage( '#phosom-challenge-result' );
			}
		});
	}
	
	function respondWithUrlFromLink( event, ui ) {
		event.preventDefault();
		var $this = $(this);
		var url = $this.attr('href');
		var sourceUrl = $this.data('sourceurl');
		var sourceTitle = $this.data('sourcetitle');
		respondWithUrlToImage(url, sourceUrl, sourceTitle);
	}
	
	$('#image-search').submit(function(){
		$.mobile.loading( 'show', { text: 'Finding some images...', textVisible:true});
		
		var $this = $(this);
		var query = $this.find('#input-image-search').val();
		
		gapi.client.autoChallengeGameService.searchForImagesAtBing({
			'query': encodeURIComponent(query)
		}).execute(function(searchResults){
			
			if( searchResults.error ) {
				$.mobile.loading( 'show', { 
					html: 'That search for photos failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+searchResults.error.message+'</strong>', 
					textVisible:true, textonly: true} );
				setTimeout( $.mobile.loading( 'hide' ), 3000 );
			} else {

				console.log(searchResults);
				var $gallery = $this.siblings('.gallery').first().empty();
				$.each(searchResults.items, function(index, oneImageResult) {
					var $a = $('<a/>', {
						'href':oneImageResult.fullSizeImageUrl, 
						'data-sourceurl': oneImageResult.sourceUrl,
						'data-sourcetitle': oneImageResult.sourceTitle,
						'rel':'external', 'style':'padding:5px;'}
					).on('click', respondWithUrlFromLink);
					var $img = $('<img/>', {'src':oneImageResult.thumbnailUrl, 'alt':oneImageResult.altText});
					$a.append( $img );
					$gallery.append( $a );
				});
				$.mobile.loading( 'hide' );
			}
		});
        return false;
	});
	
	
	
	///// page events
	
	function addCurrentPlayerToCurrentGameAndShowChallenge() {
		gapi.client.autoChallengeGameService.addPlayerToGame({
			'gameId':g_activeGame.key.id,
			'playerId':g_activeUser.key.id
		}).execute(function(playerAddedResp){
			
			if( playerAddedResp.error ) {
				$.mobile.loading( 'show', { 
					html: 'Joining with the game failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+playerAddedResp.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {
			
				$.mobile.loading( 'hide' );
				$.mobile.changePage('#phosom-one-challenge');
			}
		});	
	}
	

	$( "div#phosom-index" ).on( "pageshow", function( event, ui ) {
		// let's have the buttons disabled until all APIs have loaded
		if( ! g_allAPIsLoaded ) {
			$(this).find('[type="submit"], [type="button"]').each(function(){
				$(this).button('disable');
				$(this).button('refresh');
			});
		}
	});
	
	$(document).on(
			'pagehide', 
			'#phosom-game-creation, #phosom-one-challenge, #phosom-challenge-result, #phosom-challenges-overview', 
			function(){ 
				$(this).find('[data-role="content"]').empty();
			});
	
	$( "div#phosom-game-creation" ).on( "pageshow", function( event, ui ) {
		$.mobile.loading( 'show', { text: 'Creating a game...', textVisible:true});
		
//		switch( $( '#phosom-game-creation' ).data('game-type') ) {
//			case "autoChallenge":
				// create a game with automatic challenge photo
				gapi.client.autoChallengeGameService.createGame().execute(function(resp){
					
					console.log(resp);
					
					if( resp.error ) {
						$.mobile.loading( 'show', { 
							html: 'Oh noes, we have errorses<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
								+resp.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
							textVisible:true, textonly: true} );
						//setTimeout( $.mobile.loading( 'hide' ), 5000 );
					} else {
						
						g_activeGame = resp;
						
						addCurrentPlayerToCurrentGameAndShowChallenge();	
					}
				});
//				break;
//				
//			default:
//				break;
//		}
	});
	

	$( "div#phosom-one-challenge" ).on( "pageshow", function( event, ui ) {
		
		var $content = $( 'div#phosom-one-challenge div[data-role="content"]' );
		
		$.mobile.loading( 'show', { text: 'Fetching the challenge...', textVisible:true});
		gapi.client.gameService.getChallengePhotoUrl({
			'bucket':'auto-challenge-photos', 
			'filename': getFileNameFromURL( g_activeGame.challengeInfo.challengePhotoUrl ),
			'size':$content.parent().width() - 28
		}).execute(function(urlResp){
			
			if( urlResp.error ) {
				$.mobile.loading( 'show', { 
					html: 'Fetching the challenge failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+urlResp.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {

				console.log(urlResp);
				
				//$content.prepend( $('<h2/>').html('Game # ' + g_activeGame.key.id + '<br>' +g_activeUser.playerScreenName+ ", here's your challenge!") );
				$content.prepend( $('<h2/>').html('Game # ' + g_activeGame.key.id + '<br>' +g_activeUser.playerScreenName+ ", Phosie tænker på:") );
				

				$content.append( $('<img/>',{'src':urlResp.challengePhotoUrl}) );
//                if( undefined === navigator.camera ) {
//                    $content.append( $('<a/>', {
//					   'text': 'Photo by: '+g_activeGame.challengeInfo.challengeOwnerName, 
//                        'href':g_activeGame.challengeInfo.challengeProfileUrl, 
//                        'target':'_blank', 'style':'display:block;text-align:right;'} ) );                    
//                }
				$content.append( $('<a/>', {
					'href':'#phosom-challenge-response', 
					'data-role':'button',
					// 'text':'Respond to it!'
					'text':'Hjælp Phosie!'
				}) );
				$content.waitForImages(function(){
					
					$.mobile.loading( 'hide' );
				});
				
				$content.trigger('create');
			}
		});
	});
	
	$( "div#phosom-challenge-response" ).on( "pagebeforeshow", function( event, ui ) {
		var $content = $(this).find( 'div[data-role="content"]' );
        if( navigator.camera ) {
            $("#camera-buttons").show();
			$("#url-upload").hide();
			$("#file-upload").hide();
        } else {
            $("#camera-buttons").hide();
			$("#url-upload").show();
			$("#file-upload").show();
        }
		$content.find('#challenge-response-with-url').val('');
	});
	
	function compareResultListsByScore( a, b ) {
		if( a.score < b.score ) {
			return 1;
		}
		if( a.score > b.score ) {
			return -1;
		}
		return 0;
	}
	function getGradeFromJSHammingDistance( distance ) {
		// let's assume 0.400 is the maximum distance
		var maxDistance = 0.400;
		if( distance > maxDistance ) {
			distance = maxDistance;
		}
		var percentageOfMaximumDistance = distance / maxDistance;
		var grade = Math.round(1000 * (1 - percentageOfMaximumDistance));
		return grade;
	}
	$( "div#phosom-challenge-result" ).on( "pageshow", function( event, ui ) {
		var $content = $(this).find( 'div[data-role="content"]' );
		// $.mobile.loading( 'show', { text: 'Getting grades...', textVisible:true});
		$.mobile.loading( 'show', { text: 'Phosie bestemmer sig...', textVisible:true});
		
		gapi.client.autoChallengeGameService.getChallengeAndResponseInfo({
			'gameId':g_activeGame.key.id,
			'playerId':g_activeUser.key.id,
			'size':Math.round($content.parent().width() / 2.8)
		}).execute(function(challengesInfo){
			
			if( challengesInfo.error ) {
				$.mobile.loading( 'show', { 
					html: 'Fetching the results failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+challengesInfo.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {

				console.log(challengesInfo);
				
				// $content.append( $('<h2/>').text('Game # ' + g_activeGame.key.id + ' - results!') );
				$content.append( $('<h2/>').text('Game # ' + g_activeGame.key.id + ' - resultat!') );
				
				var $listview = $('<ul>', {'data-role':'listview', 'data-inset':'true'});
				var listToSort = [];
				$.each( challengesInfo.items, function(index, oneChallenge){
					var $oneLI = $('<li/>');
					var $oneDIV = $('<div/>');
					
					if( oneChallenge.playerId == g_activeUser.key.id ) {
						//$oneDIV.append( $('<h3/>', {'text': "Your response"}) );
						$oneDIV.append( $('<h3/>', {'text': "Dit billede"}) );
					} else {
						//$oneDIV.append( $('<h3/>', {'text': oneChallenge.playerName + "'s response"}) );
						$oneDIV.append( $('<h3/>', {'text': oneChallenge.playerName + "'s billede"}) );
					}
					
					var $challengeDiv = $('<div/>', {'style':'float:right;width:46%;'});
					var $responseDiv = $('<div/>', {'style':'float:left;width:46%;'});
					var $scoreDiv = $('<div/>', {'style':'display:block;clear:both;padding-top:10px;'});
					$challengeDiv.append( $('<img/>',{
						'src':oneChallenge.challengePhotoUrl, 'style':'padding:5px;' }) );
//					$challengeDiv.append( $('<a/>', {
//						'text':'Photo by: '+oneChallenge.challengePhotoSourceTitle, 
//						'href':oneChallenge.challengePhotoSourceUrl, 'target':'_blank', 
//						'style':'display:block;white-space:pre-wrap;'}) );
					
					$responseDiv.append( $('<img/>',{
						'src':oneChallenge.responsePhotoUrl, 'style':'padding:5px;'}) );
//					if( oneChallenge.responsePhotoSourceTitle ) {
//						$responseDiv.append( $('<a/>', {
//							'text':'Source: '+oneChallenge.responsePhotoSourceTitle, 
//							'href':oneChallenge.responsePhotoSourceUrl, 'target':'_blank', 
//							'style':'display:block;white-space:pre-wrap;'}) );						
//					}
					
					$oneDIV.append( $responseDiv, $challengeDiv );
					
					var similarityPercentage = Math.round((oneChallenge.score/1000)*100);
					// var gradingText = 'Phosie is ' + Math.round((oneChallenge.score/1000)*100) + '% happy with the photo you have chosen';
					var gradingText = 'Phosie er ' + Math.round((oneChallenge.score/1000)*100) + '% tilfreds med dit billede';
					if( similarityPercentage <= 30 ) {
						gradingText += ' :\'(';
					} else if( similarityPercentage <= 50 ) {
						gradingText += ' :-(';
					} else if( similarityPercentage >= 80 ) {
						gradingText += ' :-D';
					} else {
						gradingText += ' :-)';
					}
					$scoreDiv.append( $('<h3/>',{
                        'text': gradingText, 'style':'white-space:pre-wrap;'}) );
					
//					if( oneChallenge.playerId == g_activeUser.key.id ) {
//						var $collapsibleSetDIV = $('<div/>', {'data-role': 'collapsible-set'});
//						var $collapsibleDIV = $('<div/>', {'data-role':'collapsible', 'data-collapsed':'true'});
//						$collapsibleDIV.append( $('<h3/>', {'text': 'Alternative scores'}) );
//						$collapsibleDIV.append( oneChallenge.extraScoreInfo );
//						$collapsibleSetDIV.append( $collapsibleDIV );
//						$scoreDiv.append( $collapsibleSetDIV );
//					}
					$oneDIV.append( $scoreDiv );
					
					$oneLI.append( $oneDIV );
					listToSort.push( {'score':oneChallenge.score, 'liMarkup':$oneLI} );
				});
				
				listToSort.sort(compareResultListsByScore);
				
				$.each(listToSort, function(index, oneEntry){
					$listview.append( oneEntry.liMarkup );
				});
				
				$content.append( $listview );

				$content.append( $('<a/>', {
					'href':'#phosom-game-creation', 'data-role':'button', 'data-theme':'b', 
					//'text':'New game!'}) );
					'text':'Nyt spil!'}) );
				$content.append( $('<a/>', {
					'href':'#phosom-index', 'data-role':'button', 
					// 'text':'Go home...'
					'text':'Til start...'
				}) );
				
				$listview.waitForImages(function(){
					
//					$(this).children('li').each(function(){
//						var img1 = $(this).find('img')[0];
//						var img2 = $(this).find('img')[1];
//						img1.crossOrigin="anonymous";
//						img2.crossOrigin="anonymous";
//						var hammingDistance = simi.compare(img1, img2);
//						var jsGrade = getGradeFromJSHammingDistance(hammingDistance);
//						$(this).find('h3:eq(1)').after($('<h3/>',{'text':'JS Grade: ' + jsGrade + ' (calculated distance: ' + hammingDistance + ')'}));
//					});
					
					$.mobile.loading( 'hide' );
				});
				
				$content.trigger('create');
			}

		});
	});
	
	$( "div#phosom-challenges-overview" ).on( "pageshow", function( event, ui ) {
		$.mobile.loading( 'show', { text: 'Fetching challenges...', textVisible:true});
		
		var $content = $(this).find( 'div[data-role="content"]' );
		
		var $listview = $('<ul>', {'data-role':'listview', 'data-inset':'true'});
		
		gapi.client.autoChallengeGameService.listChallengesPlayedByPlayer({
			'playerId':g_activeUser.key.id
		}).execute(function(challengesInfo){
			
			if( challengesInfo.error ) {
				$.mobile.loading( 'show', { 
					html: 'Fetching the list of played challenges failed :\'(<br />If you\'d like you can email this message<br/>to the phosies at nemur@nemur.net:<br/><br/><strong>'
						+challengesInfo.error.message+'</strong><br/><br/><a href="#phosom-index">Try again...</a>', 
					textVisible:true, textonly: true} );
			} else {

				console.log(challengesInfo);
				
				$.each( challengesInfo.items, function(index, challenge){
					var $oneLI = $('<li/>');
					var $oneAnchor = $('<a/>', {
						'href': '#phosom-challenge-result', 'data-gameid': challenge.parentGameId
						}).on('click', setCurrentGameIdFromChallengeLink);
					$oneAnchor.append( $('<img/>', {'src': challenge.challengePhotoUrl}) );
					$oneAnchor.append( $('<h2/>', {'text': challenge.gameInfo}) );
					$oneLI.append( $oneAnchor );
					$listview.append( $oneLI );
				});
				
				$content.append( $listview );
				
				$content.append( $('<a/>', {
					'href':'#phosom-index', 'data-role':'button', 'text':'Go home...'}) );
				
				$content.trigger('create');

				$.mobile.loading( 'hide' );
			}

		});
	});
	
    // hidden page to clear (user) info stored in localStorage
    $( document ).delegate("#reset", "pageinit", function() {
        if( isLocalStorage ) {
            localStorage.removeItem(userStorageKey);
        }
    });

});



function onDeviceReady() {

}
document.addEventListener("deviceready", onDeviceReady, false);



// cloud endpoint things

function afterEndpointInit() {
	
    gapi.client.autoChallengeGameService.getUploadUrl().execute(function(urlInfo){
        g_uploadUrl = urlInfo.uploadUrl;
    });
    
    
    
    $.mobile.loading( 'hide' );
}

function endpointinit() {
	$.mobile.loading( 'show', { text: 'Phone home...', textVisible:true});
	var apisToLoad;
	var callback = function() {
		if( --apisToLoad === 0 ) {
			// let's enable buttons now that all APIs have loaded
			$('#'+$.mobile.activePage.attr('id')).find('[type="submit"], [type="button"]').each(function(){
				$(this).button('enable');
				$(this).button('refresh');
				g_allAPIsLoaded = true;
			});
            
            afterEndpointInit();
			
			// TODO: signing things... see https://developers.google.com/appengine/docs/java/endpoints/consume_js
		}
	}
	
	apisToLoad = 4;
	
	//var ENDPOINT_ROOT = '//' + window.location.host + '/_ah/api';
	var ENDPOINT_ROOT = 'https://phosom-server.appspot.com/_ah/api';
    //var ENDPOINT_ROOT = 'http://192.168.1.102:8888' + '/_ah/api';
	gapi.client.load('playerfactory', 'v1', callback, ENDPOINT_ROOT);
	gapi.client.load('autochallengegameendpoint', 'v1', callback, ENDPOINT_ROOT);
	gapi.client.load('autoChallengeGameService', 'v1', callback, ENDPOINT_ROOT);
	gapi.client.load('gameService', 'v1', callback, ENDPOINT_ROOT);
}
