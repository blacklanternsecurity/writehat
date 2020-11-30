$(document).ready(function() {

  var hint = $('#pageFooter #timestamp-check').attr('hint');
  var id = $('#pageFooter #timestamp-check').attr('object-id');
  var button = $('#pageFooter #timestamp-check').attr('button');
  var buttonElement = $(`#${button}`);
  var changed = false;
  var refresh = 0;

  function getTimestamp(success_callback=function(){}) {
    
    var data = {};
    if (hint) {
      data['hint'] = hint;
    }

    console.log('checking timestamp');

    $.post({
      url: `/revisions/timestamp/${id}`,
      data: data,
      success: function(response) {
        if (!changed || refresh) {
          var date = Date.parse(response);
          if (refresh > 0) {
            var force = true;
          } else {
            var force = false;
          }
          storeTimestamp(date, force=force);
          if (refresh == 0) {
            checkTimestamp(date);
          }
          success_callback(date);
        }
        refresh = Math.max(0, refresh-1);
      },
      complete: function(response) {
        setTimeout(getTimestamp, 2000);
      }
    })
  }

  function checkTimestamp(timestamp) {
    var oldTimestamp = getStoredTimestamp();
    var newTimestamp = parseInt(timestamp);
    if (!(newTimestamp == oldTimestamp)) {
      warning(`WARNING: Someone else just updated this ${hint}!`);
      hideButton();
      changed = true;
    }
  }

  function storeTimestamp(timestamp, force=false) {
    //$('#pageFooter #storedTimestamp').remove();
    if (force == true) {
      $('#pageFooter #storedTimestamp',).remove();
    }
    if (!$('#pageFooter #storedTimestamp')[0]) {
      $('#pageFooter').append(`<span id="storedTimestamp" timestamp="${timestamp}"></span>`);
    }
  }

  function getStoredTimestamp() {
    return parseInt($('#pageFooter #storedTimestamp').attr('timestamp'));
  }

  function hideButton() {
    $('#overwriteButton').remove();
    buttonElement.hide();
    overwriteButton = buttonElement.clone();
    overwriteButton.prop('id', 'overwriteButton');
    overwriteButton.removeClass('btn-success');
    overwriteButton.addClass('btn-warning');
    overwriteButton.insertAfter(buttonElement);
    overwriteButton.find('span strong').text('Overwrite');
    overwriteButton.show();
    overwriteButton.off().click(showButton);
  }

  function showButton() {
    buttonElement.show();
    $('#overwriteButton').hide();
  }

  if (hint && id && button) {
    getTimestamp();
  }

  $(document).on('saveEvent', function() {
    changed = false;
    refresh = 2;
  })

})