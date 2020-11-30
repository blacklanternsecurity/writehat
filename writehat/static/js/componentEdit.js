$(document).ready(function () {

  // prefill the findingGroup form field if it exists
  $('#id_findingGroup').val($("#fgroup-info").attr('fgroup-id'));
  $('#id_findingGroup').selectpicker('refresh');

  $('#componentUpdate').click(function(e) {
    e.preventDefault();
    $.ajax({
      url : $('form').attr('action') || window.location.pathname,
      type: "POST",
      data: $('form').serialize(),
      success: function (data) {
        success('Successfully saved component');
        // refresh preview iframe
        $('#preview-frame')[0].contentDocument.location.reload(true);
        $(document).trigger('saveEvent');
      },
      error: function (result) {
        error('Failed to save component');
      }
    })
  });

  // fancy select buttons
  $("select.review-status").not(".grouped").togglebutton();
  $("select.review-status").addClass("grouped");
  var groups = $("table.writehat-form .btn-group");

  groups.children("button").addClass("btn-secondary");
  groups.each(function() { 
    $(this).addClass("review-status-group");
    var buttons = $(this).children("button");
    var btnCount = buttons.length;
    buttons.each( function() { 
      $(this).addClass("reviewStatus");
    });
  });
});
