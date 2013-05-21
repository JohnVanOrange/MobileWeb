var api = {
 client : function (method, callback, opt) {
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
     //process(response);
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
        //$.mobile.changePage(img_loc + this.value.store[index],{'transition': 'slide', 'reverse': reverse} );
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
    }
}

var exception_handler = function(e) {
    navigator.notification.alert(e.message);
}

var add_icon = function(id, icon){
 $('#' + id + ' span.ui-btn-inner').addClass('icon-' + icon);
}

$(document).ready(function(){
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
	
});


$(document).on('pageinit', function() {
 
 $('#report_button').one('click', function() {
  $('#report form div.ui-btn').remove();
  api.call('report/all', function(data) {
   for (i in data) {
    report = document.createElement('button');
    $(report).html(data[i].value);
    $('#report form').append(report).trigger('create');
   }
  });
 });
 
});