$(document).ready(function() {
 
 add_icon('menu-button', 'menu');
 add_icon('like', 'thumbs-up');
 add_icon('dislike', 'thumbs-down');
 add_icon('save', 'star-1');
 
});

function add_icon(id, icon){
 $('#' + id + ' span.ui-btn-inner').addClass('icon-' + icon);
}