$(document).ready(function() {
  $('#engagementSave').click(function() {

    if (!($('#id_name').val())) {
      error('Please specify a name for the engagement');
      return;
    }

  	var redirectURL = '/engagements';
    $.ajax({
    url: $('form').attr('action'),
    type:'post',
    data: $('form').serialize(),
    success: function(result) {
      successRedirect(redirectURL, `Successfully created engagement: "${result}"`);
    },
    error: function(result) {
      error('failed to create engagement');
    }
  })
})
})