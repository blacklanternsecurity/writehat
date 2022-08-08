$(document).ready(function() {
    $('#passwordChange').click(function() {
  
    if (!($('#id_old_password').val())) {
        error('Please specify an old password');
    return;
    }
    
    if (!($('#id_new_password1').val())) {
        error('Please specify a new password');
    return;
    }

    if (!($('#id_new_password2').val())) {
        error('Please confirm new password');
    return;
    }
  
        var redirectURL = '/password';
      $.ajax({
      url: $('form').attr('action'),
      type:'post',
      data: $('form').serialize(),
      success: function(result) {
        successRedirect(redirectURL, `Successfully changed password`);
      },
      error: function(result) {
        error('Failed to change password');
      }
    })
  })
  })