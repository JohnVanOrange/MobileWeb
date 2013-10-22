var api = {
	client : function (method, callback, opt) {
		if (!opt) {
			opt = {};
		}
		opt.sid = auth.get();
		var url = config.api_url + method;
		$.ajax({
			type: 'post',
			async: false,
			url: url,
			data: opt,
			dataType: 'json',
			success: function(response) {
				try {
					if (response.hasOwnProperty('error')) {
						throw {name: response.error, message: response.message};
					}
					callback(response);
					if (response.message) {
						console.log(response.message);
						if (cordova.exec) {
							window.plugins.toast.shortToast(response.message);
						}
					}
				} catch(e) {
					exception_handler(e);
				}
			}
		});
	},
	call : function (method, callback, opt) {
		return this.client(method, callback, opt);
	}
};

if (!sessionStorage['index']) {
	sessionStorage['index'] = -1;
}
if (!sessionStorage['order']) {
	sessionStorage['order'] = '[]';
}

var image = {
    value : {
      order : {
				add : function(uid) {
					var order = this.load();
					order.push(uid)
					sessionStorage['order'] = JSON.stringify(order);
				},
				load : function () {
					return JSON.parse(sessionStorage['order']);
				}
			},
      store : function (uid, data) {
				sessionStorage[uid] = JSON.stringify(data);
			},
			load : function (uid) {
				console.log(uid);
				return JSON.parse(sessionStorage[uid]);
			}
    },
    next : function() {
      sessionStorage['index']++;
			
      if (this.value.order.load().length <= (sessionStorage['index'] + 2)) {
        this.new();
      }
      this.set(sessionStorage['index']);
    },
    prev : function() {
      if (sessionStorage['index'] > 0) {
        sessionStorage['index']--;
      }
      this.set(sessionStorage['index']);
    },
    new : function() {
      api.call('image/random', function(data){
				console.log('image/new called');
				image.value.store(data.uid, data);
        image.value.order.add(data.uid);
        page.add(data);
      });
      return;
    },
    set : function(index) {
			page.load(this.value.load(this.value.order.load()[index]));
    },
    current : function() {
			return this.value.load(this.value.order.load()[sessionStorage['index']]);
    },
    update : function(uid) {
      api.call('image/get', function(data){
				image.value.store(uid, data);
				page.load(image.value.load(uid));
      }, {image: uid});    
    },
		load : function(uid) {
      api.call('image/get', function(data){
				image.value.store(data.uid, data);
				sessionStorage['index']++;
				image.value.order.load().splice(sessionStorage['index'], 0, data.uid);
				page.add(data);
				page.load(image.value.load(uid));
      }, {image: uid});    
		}
}

var auth = {
    get : function() {
      return localStorage.getItem("sid");
    },
    set : function(token) {
      localStorage.setItem("sid", token);
    },
    unset : function() {
      localStorage.removeItem("sid");
    }
}


var page = {
    add : function(image) {
        var $image = $('<img id="' + image.uid + '" class="main-image" src="' + image.image_url + '">').hide();
        $('div#header').after($image);
    },
    load : function(image) {
				if ($('#' + image.uid).length == 0) {
					this.add(image);
				}
        $('.main-image').hide();
        $('#' + image.uid).show();
        //reset buttons
        $('#like').removeClass('highlight'); $('#like .ui-btn-text').html('Like');
        $('#dislike').removeClass('highlight'); $('#dislike .ui-btn-text').html('Dislike');
        $('#save').removeClass('highlight'); $('#save .ui-btn-text').html('Save');
				$('#tag_shortcut').hide();
        //set buttons
        if (image.data) {
            if (image.data.like) {
                $('#like').addClass('highlight'); $('#like .ui-btn-text').html('Liked');
            }
            if (image.data.dislike) {
                $('#dislike').addClass('highlight'); $('#dislike .ui-btn-text').html('Disliked');
            }
            if (image.data.save) {
                $('#save').addClass('highlight'); $('#save .ui-btn-text').html('Saved');
            }
        }
				//set tag icon
				if (image.tags[0]) {
					$('#tag_shortcut').show();
				}
        $.mobile.silentScroll(0);
				//set download link
				$('#download_link').attr('href', image.image_url).attr('download', image.filename);
    },
    refresh_auth : function() {
      if (auth.get()) {
        api.call('user/current', function(data){
					$('#user_icon img').attr('src', 'http://www.gravatar.com/avatar/' + data.email_hash + '?s=40&d=retro&r=pg');
					$('#user_icon').show();
					$('.ui-btn-right').controlgroup('refresh');
				});
        $('#login_link').parent().parent().hide();
				$('#create_link').parent().parent().hide();
        $('#account_div').hide();
				$('#right_panel_lv').listview('refresh');
      }
      else {
        $('#user_icon').hide();
        $('.ui-btn-right').controlgroup('refresh');
        $('#login_link').parent().parent().show();
        $('#create_link').parent().parent().show();
        $('#account_div').show();
        $('#right_panel_lv').listview('refresh');
      }
    },
		tag_load : function(tagbase, tagfull) {
			api.call('tag/all', function(data){
				$('#thumb_view .ui-grid-a div').remove();
				for (i in data) {
					(i%2 == 0) ? col = 'a' : col = 'b';
					$('#thumb_view .ui-grid-a').append('<div data-uid="' + data[i].uid + '" class="thumb ui-block-' + col + '"><img src="' + data[i].thumb_url + '"></div>');
				}
				$('#thumb_view h1').text(tagfull);
				$.mobile.changePage($('#thumb_view'));
			},
			{
				'tag' : tagbase
			});
		},
		saved_load : function() {
			api.call('user/current', function(user){
				api.call('user/saved', function(data){
					$('#thumb_view .ui-grid-a div').remove();
					for (i in data) {
						(i%2 == 0) ? col = 'a' : col = 'b';
						$('#thumb_view .ui-grid-a').append('<div data-uid="' + data[i].uid + '" class="thumb ui-block-' + col + '"><img src="' + data[i].thumb_url + '"></div>');
					}
					$('#thumb_view h1').text('Saved');
					$.mobile.changePage($('#thumb_view'));
				},
				{
					'username' : user.username
				});
			});		
		},
		uploads_load : function() {
			api.call('user/current', function(user){
				api.call('user/uploaded', function(data){
					$('#thumb_view .ui-grid-a div').remove();
					for (i in data) {
						(i%2 == 0) ? col = 'a' : col = 'b';
						$('#thumb_view .ui-grid-a').append('<div data-uid="' + data[i].uid + '" class="thumb ui-block-' + col + '"><img src="' + data[i].thumb_url + '"></div>');
					}
					$('#thumb_view h1').text('Uploads');
					$.mobile.changePage($('#thumb_view'));
				},
				{
					'username' : user.username
				});
			});		
		}
}

var exception_handler = function(e) {
	switch (e.name) {
		case 1020: //Must be logged in to save image
		case 1021: //Must be logged in to unsave image
		case 1022://Must be logged in to like images
		case 1023://Must be logged in to dislike images
		$('#like').removeClass('highlight');
		$('#dislike').removeClass('highlight');
		$('#save').removeClass('highlight');
		$.mobile.changePage($('#login'), {role: 'dialog'});
		break;
	}
	$('#error_popup p').html(e.message);
	$('#error_popup').popup('open');
	console.log(e.message);
}

var add_icon = function(id, icon){
	$('#' + id + ' span.ui-btn-inner').addClass('icon-' + icon);
}



$(document).on('deviceready', function(){
	$(document).on('menubutton', function(){
		$('#menu_button').click();
	});
});

$(document).one('pageinit', function() {
	
	image.next();
	image.new(); image.new();
	
	$(":jqmData(role='page')").attr("data-title", config.name);
	$('#one h1').text(config.name);
	$('#one .ui-header h1.ui-title').css({
		'font-family' : config.title_font + ', sans-serif',
		'background' : "url('res/logo/" + config.logo + "')",
		'background-size' : '28px',
		'background-position' : 'left',
		'background-repeat' : 'no-repeat'
	});	
	
  page.refresh_auth();
	
	add_icon('share_button', 'share');
	add_icon('menu_button', 'menu');
	add_icon('like', 'thumbs-up');
	add_icon('dislike', 'thumbs-down');
	add_icon('save', 'star-1');
 
  $('#error_popup').popup();
 
	$('#prev').on('click', function() {
		image.prev();   
	});
	 
	$('#next').on('click', function() {
		image.next();   
	});
	
	$('#like').on('click', function() {
		var i = image.current();
		api.call('image/like',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	 
	$('#dislike').on('click', function() {
		var i = image.current();
		api.call('image/dislike',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	
	$('#save').on('click', function() {
		var i = image.current();
		if (!$('#save').hasClass('highlight')) {
			api.call('image/save',function(){
				image.update(i.uid);
			},{image: i.uid});
		} else {
			api.call('image/unsave',function(){
				image.update(i.uid);
			},{image: i.uid});
		} 
	});
  
  //login
	$('#login form button').on('click', function(event) {
		event.preventDefault();
		api.call('user/login', function(data){
			if (!data.error) {
				auth.set(data.sid);
        page.refresh_auth();
        if ($.mobile.activePage.find("#login_username").is(":visible")) {
          $('#login').dialog('close');
        }
			}
		}, {
			username: $('#login_username').val(),
			password: $('#login_password').val()
		});
	 });
  
  //logout
  $('#logout_link').on('click', function(event){
    event.preventDefault();
    api.call('user/logout', function(data){
      auth.unset();
      page.refresh_auth();
      $('#usermenu').panel('close');
    });
  });
  
  //create account
  $('#create form button').on('click', function(event){
    event.preventDefault();
    try {
      if ($('#create_password').val() !== $('#create_password2').val()) {
        throw {name: 0, message: "Passwords do not match"};
      }
      else {
        api.call('user/add', function(data){
          $('#login_username').val($('#create_username').val());
          $('#login_password').val($('#create_password').val());
          $('#login form button').trigger('click');
          $('#create').dialog('close');
        }, {
          username: $('#create_username').val(),
          password: $('#create_password').val(),
          email: $('#create_email').val()
        });
      }
    } catch(e) {
      exception_handler(e);
    }
  });
 
	//tags
	$('#tags').on('pagebeforeshow', function() {
		img = image.current();
		$('#tags form ul li').remove();
		if (img.tags[0]) {
			for (i in img.tags) {
				$('#tags form ul').append('<li value="' + img.tags[i].basename + '">' + img.tags[i].name + '</li>');
			}
		}
		else {
			$('#tags form ul').append('<li value="" class="notag">No tags</li>');
		}
		$('#tags form ul').listview('refresh');
	});
	
	//view tags images
	$('ul.tag_container').on('click', 'li', function(){
		if ($(this).attr('value')) {
			page.tag_load($(this).attr('value'), $(this).text());
		}
	});
	
	//add tags
	$('#add_tag').on('pagebeforeshow', function() {
		$('#add_tag_name').val('');
		$('#tag_suggest li').remove();
		$('#tag_suggest').listview('refresh');
	});
	$('#add_tag').on('pageshow', function() {
		$('#add_tag_name').focus();
	});
	$('#add_tag_name').on('keyup', function(){
		$('#tag_suggest li').remove();
		$('#tag_suggest').append('<li><a href="#">' + $('#add_tag_name').val() + '</a></li>');
		if ($('#add_tag_name').val().length > 2) {
			api.call('tag/suggest', function(data) {
				if (!data.hasOwnProperty('response')) {
					for (i in data) {
						$('#tag_suggest').append('<li><a href="#">' + data[i] + '</a></li>');
					}
				}
			}, {term: $('#add_tag_name').val()})
		}
		$('#tag_suggest').listview('refresh');
	});
	$('#tag_suggest').on('click', 'a', function() {
		i = image.current();
		api.call('tag/add',function(){
			image.update(i.uid);
			$('#add_tag').dialog('close');
			
		}, {
			name: $(this).text(),
			image: i.uid
		});
	});
	
	//top tags
	$('#taglist').one('pagebeforeshow', function() {
		$('#taglist form ul li').remove();
		api.call('tag/top', function(data) {
			for (i in data) {
				$('#taglist form ul').append('<li value="' + data[i].basename + '">' + data[i].name + '</li>');
			}
		});
		$('#taglist form ul').listview('refresh');
	});
 
	//report image
	$('#report_button').one('click', function() {
		$('#report form div.ui-btn').remove();
		api.call('report/all', function(data) {
			for (i in data) {
				report = document.createElement('button');
				$(report).html(data[i].value).val(data[i].id).addClass('report_button');
				$('#report form').append(report).trigger('create');
			}
			$('.report_button').on('click', function(){
				event.preventDefault();
				i = image.current();
				api.call('image/report', function(){}, {
					image: i.uid,
					type: $(this).val()
				});
				$('#report').dialog('close');
			});
		});
	});
	
	//saved images
  $('#saved_link').on('click', function(event){
    event.preventDefault();
		page.saved_load();
  });
	
	//uploaded images
  $('#uploads_link').on('click', function(event){
    event.preventDefault();
		page.uploads_load();
  });
  
	//share
	$('#share_button').on('click', function() {
		if (cordova.exec) {
			var share = cordova.require("cordova/plugin/share");
			var i = image.current();
			share.show(
				{
					subject: 'Sharing this from ' + config.name,
					text: 'Check this out: ' + i.page_url
				},
				function() {},
				function() {}
			);
		}
		else {
			$.mobile.changePage($('#share'), {role: 'dialog'});
		}
	});
	$('.share-button').on('click', function(event) {
		event.preventDefault();
		var i = image.current();
		window.open($(this).val() + i.page_url);
		$('#share').dialog('close');
	});
	
	//load image from thumbview
	$('#thumb_view').on('click', '.thumb', function(){
		image.load($(this).attr('data-uid'));
		$.mobile.changePage($('#one'));
	});
	
	//file download
	$('#download_link').on('click', function(){
		$('#menu').panel('close');
		if (cordova.exec) {
			event.preventDefault();
			i = image.current();
			var fileTransfer = new FileTransfer();
			var uri = encodeURI	(i.image_url);
			var filePath = 'file://sdcard/Pictures/' + config.name + '/' + i.filename;

			fileTransfer.download(
    			uri,
    			filePath,
    			function(entry) {
        			console.log("download complete: " + entry.fullPath);
        			window.plugins.toast.shortToast('Image Saved');
    			},
    			function(error) {
        			console.log("download error source " + error.source);
        			console.log("download error target " + error.target);
        			console.log("upload error code" + error.code);
        			window.plugins.toast.shortToast('Error Saving Image');
    			}
			);
		}
 	});
	
});