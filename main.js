var api = {
	client : function (method, callback, opt) {
		if (!opt) {
			opt = {};
		}
		opt.sid = auth.get();
		var url = api_url + method;
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

var image = {
    value : {
        index : -1,
        order : new Array(),
        store : {}
    },
    next : function() {
        this.value.index++;
        if (this.value.order.length <= (this.value.index + 2)) {
            this.new();
        }
        this.set(this.value.index,'next');
    },
    prev : function() {
        if (this.value.index > 0) {
            this.value.index--;
        }
        this.set(this.value.index,'prev');
    },
    new : function() {
        api.call('image/random', function(data){
          image.value.store[data.uid] = data;
          image.value.order.push(data.uid);
          page.add(data);
        });
        return;
    },
    set : function(index, direction) {
        reverse = false;
        if (direction == 'prev') {
            reverse = true;
        }
        page.load(this.value.store[this.value.order[index]]);
    },
    current : function() {
        return this.value.store[this.value.order[this.value.index]];
    },
    update : function(uid) {
        api.call('image/get', function(data){
            image.value.store[uid] = data;
            page.load(image.value.store[uid]);
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
        $('.main-image').hide();
        $('#' + image.uid).show();
        //reset buttons
        $('#like').removeClass('highlight'); $('#like .ui-btn-text').html('Like');
        $('#dislike').removeClass('highlight'); $('#dislike .ui-btn-text').html('Dislike');
        $('#save').removeClass('highlight'); $('#save .ui-btn-text').html('Save');
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
        $.mobile.silentScroll(0);
    },
    refresh_auth : function() {
      if (auth.get()) {
        api.call('user/current', function(data){
					$('#user-icon img').attr('src', 'http://www.gravatar.com/avatar/' + data.email_hash + '?s=40&d=retro&r=pg');
					$('#user-icon').show();
					$('.ui-btn-right').controlgroup('refresh');
				});
        $('#login_link').parent().parent().hide();
				$('#create_link').parent().parent().hide();
				$('#logout_link').parent().parent().show();
				$('#right_panel_lv').listview('refresh');
      }
      else {
        $('#user-icon').hide();
        $('.ui-btn-right').controlgroup('refresh');
        $('#login_link').parent().parent().show();
        $('#create_link').parent().parent().show();
        $('#logout_link').parent().parent().hide();
        $('#right_panel_lv').listview('refresh');
      }
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
	//navigator.splashscreen.hide();
});

$(document).one('pageinit', function() {
  page.refresh_auth();
  
	$('#error_popup').popup();
	
	add_icon('menu-button', 'menu');
	add_icon('like', 'thumbs-up');
	add_icon('dislike', 'thumbs-down');
	add_icon('save', 'star-1');
 
	image.next();
	image.new(); image.new();
 
	$('#prev').on('vclick', function() {
		image.prev();   
	});
	 
	$('#next').on('vclick', function() {
		image.next();   
	});
	
	$('#like').on('vclick', function() {
		var i = image.current();
		api.call('image/like',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	 
	$('#dislike').on('vclick', function() {
		var i = image.current();
		api.call('image/dislike',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	
	$('#save').on('vclick', function() {
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
	$('#login form button').on('vclick', function(event) {
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
  $('#logout_link').on('vclick', function(event){
    event.preventDefault();
    api.call('user/logout', function(data){
      auth.unset();
      page.refresh_auth();
      $('#menu').panel('close');
    });
  });
  
  //create account
  $('#create form button').on('vclick', function(event){
    event.preventDefault();
    try {
      if ($('#create_password').val() !== $('#create_password2').val()) {
        throw {name: 0, message: "Passwords do not match"};
      }
      else {
        api.call('user/add', function(data){
          $('#login_username').val($('#create_username').val());
          $('#login_password').val($('#create_password').val());
          $('#login form button').trigger('vclick');
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
 
  //report image
	$('#report_button').one('vclick', function() {
		$('#report form div.ui-btn').remove();
		api.call('report/all', function(data) {
			for (i in data) {
				report = document.createElement('button');
				$(report).html(data[i].value).val(data[i].id).addClass('report_button');
				$('#report form').append(report).trigger('create');
			}
			$('.report_button').on('vclick', function(){
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
  
  $('#login form a').on('vclick', function(){
  
  });
 
});