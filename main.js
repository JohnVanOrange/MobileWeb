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
    token : null,
    get : function() {
        return this.token;
    },
    set : function(token) {
        this.token = token;
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
        $(document).scrollTop(0);
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
	//navigator.notification.alert(e.message);
	console.log(e.message);
}

var add_icon = function(id, icon){
	$('#' + id + ' span.ui-btn-inner').addClass('icon-' + icon);
}

$(document).ready(function(){
	$('#logout_link').parent().parent().hide();
	$('#right_panel_lv').listview('refresh');
	$('#user-icon').hide();
	$('.ui-btn-right').controlgroup('refresh');
	
	add_icon('menu-button', 'menu');
	add_icon('like', 'thumbs-up');
	add_icon('dislike', 'thumbs-down');
	add_icon('save', 'star-1');
 
	image.next();
	image.new(); image.new();
 
	$('#prev').click(function() {
		image.prev();   
	});
	 
	$('#next').click(function() {
		image.next();   
	});
	
	$('#like').click(function() {
		var i = image.current();
		api.call('image/like',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	 
	$('#dislike').click(function() {
		var i = image.current();
		api.call('image/dislike',function(){
			image.update(i.uid);
		},{image: i.uid});
	});
	
	$('#save').click(function() {
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
 
	$('#login form button').click(function(event) {
		event.preventDefault();
		api.call('user/login', function(data){
			if (!data.error) {
				auth.set(data.sid);
				$('#login').dialog('close');
				$('#login_link').parent().parent().hide();
				$('#create_link').parent().parent().hide();
				$('#logout_link').parent().parent().show();
				$('#right_panel_lv').listview('refresh');
				$('#user-icon').show();
				$('.ui-btn-right').controlgroup('refresh');
				$('#user-icon span').css('padding', '0.2em 0.6em');
			}
		}, {
			username:$('#login_username').val(),
			password:$('#login_password').val()
		});
	 });
  

  

});


$(document).on('pageinit', function() {
 
	$('#report_button').one('click', function() {
		$('#report form div.ui-btn').remove();
		api.call('report/all', function(data) {
			for (i in data) {
				report = document.createElement('button');
				$(report).html(data[i].value).val(data[i].id).addClass('report_button');
				$('#report form').append(report).trigger('create');
			}
			$('.report_button').click(function(){
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
 
});