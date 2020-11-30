/* ### GLOBAL JAVASCRIPT FUNCTIONS ### */

/* CTRL+S SAVES */

$(window).bind('keydown', function(event) {
  if (event.ctrlKey || event.metaKey) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
    case 's':
      var saveIcons = $('.writehat-header i.fa-save');
      if (saveIcons.length) {
        event.preventDefault();
      }
      for (var i = 0; i < saveIcons.length; i++) {
        var saveIcon = $(saveIcons[i]);
        // only check for visible buttons
        var button = $(saveIcon).closest('button:visible');
        if (button.length) {
          button.click();
          break;
        }
      }
    }
  }
});


/* JSON RESPONSE CACHING */

// Retrieve JSON data from server or return from cache if it exists there
function cachedGet(endpoint) {

  // Assuming we're not in global scope…
  var localStorage;
  var cachedValue;
  try {
    localStorage = window.localStorage;
    localStorage.getItem(endpoint);
  } catch(e) {
    console.log('Error: localstorage disabled.')
  }

  if (cachedValue != null) {
    return cachedValue;
  } else {
    return $.get({
      url: endpoint,
      async: false
    }).responseJSON;
  }

}


/* DEBOUNCE */

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// <wait> milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait=250, immediate=true) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};


// home-grown organic cage-free sleep function
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* URL LOCATION CHECKING */

function inEngagements() {
  return (window.location.pathname.includes('/engagements') || ($("[engagement-id!=''][engagement-id]").length));
}

function inTemplates() {
  return window.location.pathname.includes('/templates');
}

// returns true if the specified string is in the URL (pathname only)
function inURL(s) {
  return window.location.pathname.includes(s);
}


/* PANE / MODAL LOADERS */

function getItemIDs() {
  return {
    'engagementID': $('#engagement-info').attr('engagement-id'),
    'reportID': $('#report-info').attr('report-id'),
    'componentID': $('#component-info').attr('component-id'),
    'findingID': $('#finding-info').attr('finding-id'),
    'fgroupID': $('#fgroup-info').attr('fgroup-id'),
    'pageID': $('#page-info').attr('page-id'),
  }
}

function getItemIDsJSON() {
  return JSON.stringify(getItemIDs());
}

function loadPane(pane, div, success_callback=function(){}, button='') {

  // create a dummy button if it doesn't exist
  if ( button.length === 0 ) {
    button = $('#dummyButton');
    if ( button.length === 0) {
      $('body').append( '<span id="dummyButton"></span>' );
      button = $('#dummyButton');
    }
  }

  itemIDs = getItemIDsJSON();

  var div = $('#' + div);

  if (button.hasClass('paneSwitched')) {
    button.removeClass('paneSwitched');
  } else {
    button.addClass('paneSwitched');
  };

  $.ajax({
    url : '/panes/' + pane,
    type: 'POST',
    data: itemIDs,
    contentType: 'application/json; charset=utf-8',
    dataType: 'html',
    success: function(data){
      $(div).html(data);
      // show the div if it's in the main view
      if (['fullPane', 'leftPane', 'rightPane'].includes(div.attr('id'))) {
        $(div).show();
      }
      success_callback(div);
      eventName = `paneLoaded-${pane}`;
      $('.selectpicker').selectpicker();
      $( document ).trigger(eventName , [$(div)] );
      $( document ).trigger( 'paneLoaded' , [$(div)] );
    }
  });
  
};


// Loads the requested modal.  Display with $(modalID).modal('show')
function loadModal(modal, success_callback=function(){}, params={}) {

  var modal = modal.replace('.', '').replace('/', '');
  var modalID = '#' + modal + '-modal';
  $(modalID).modal('hide');
  $(modalID).remove();
  var modalsDiv = $('#modalPane');
  var itemIDs = JSON.stringify(Object.assign(getItemIDs(), params));
  
 $.ajax({
    url : '/modals/' + modal,
    type: 'POST',
    data: itemIDs,
    contentType: 'application/json; charset=utf-8',
    dataType: 'html',
    success: function(data){
      modalsDiv.append(data);
      $( document ).trigger( `modalLoaded-${modal}`, [$(modalID)] );
      $( document ).trigger( 'modalLoaded', [$(modalID)] );
      // fix bug where scrollbar is hidden
      $('body').removeClass('modal-open');
      success_callback($(modalID));
      $(modalID).modal('hide');
    }
  });
}


/* MODAL PROMPT

  How to use:

    promptModal(
      confirm_callback=function() {
        componentElement.remove();
      },
      title='Delete Component?',
      body='Are you sure you want to delete this component?',
      leftButtonName='Cancel',
      rightButtonName='Delete Component',
      danger=true
    )

*/
function promptModal(confirm_callback=function(){}, title='Confirm?', body='', leftButtonName='Cancel', rightButtonName='Confirm', danger=false) {

  var promptModal = $('#prompt-modal');

  var title = escapeHtml(title);
  var body = escapeHtml(body);

  // bold words surrounded by asterisks
  var bold_regex = /\*\*(.*)\*\*/g;
  var match;
  while((match = bold_regex.exec(body)) !== null) {
    body = body.replace(match[0], `<span class="modal-bold">${match[1]}</span>`);
  }

  promptModal.find('.modal-title').text(title);
  promptModal.find('.modal-body').html(body);

  var leftButton = promptModal.find('.promptModalLeftButton');
  var rightButton = promptModal.find('.promptModalRightButton');
  leftButton.find('.textButton-text').text(leftButtonName);
  rightButton.find('.textButton-text').text(rightButtonName);

  if (!danger) {
    leftButton.removeClass('border-success');
    leftButton.addClass('border-dark');
    rightButton.removeClass('border-danger');
    rightButton.addClass('border-success');
  }

  promptModal.find('.promptModalLeftButton').off().click(function() {
    promptModal.modal('hide');
    console.log('cancelled');
  });
  promptModal.find('.promptModalRightButton').off().click(confirm_callback);
  promptModal.find('.promptModalRightButton').click(function() {
    console.log('confirmed');
    promptModal.modal('hide');
  });

  promptModal.modal('show');

}


/* FINDINGS CATEGORY HELPERS */

// populate list of categories for form
function loadCategories(input_div='#id_categoryID') {

  // create a category datalist if it doesn't exist
  if ( ! $('#findingsCategoryOptions').length ) {
    $('body').append( '<datalist id="findingsCategoryOptions"></datalist>' )
  }

  // pull findings categories
  $.ajax({url: '/findings', 
    type: 'POST',
    dataType: 'json',
    success: function(data) {

      var findingsCategories = [];

      // skip the root node
      data = Object.values(data)[0]['categoryChildren']

      // populate our list
      for (let value of getFindingsCategories('', data)) {
        findingsCategories.push(value);
      };

      // clear, then build the options datalist
      $('#findingsCategoryOptions').empty();
      $.each(findingsCategories, function (index, value) {
        findingName = value[0];
        findingUUID = value[1];
        $('#findingsCategoryOptions').append(`<option value="${findingUUID}">${findingName}</option>`);
      });

      // point the "Category" input to the datalist
      $(input_div).attr('list', 'findingsCategoryOptions');
    }
  });
};


// thanks paul.  (╯°□°)╯︵ ┻━┻
function* getFindingsCategories(categoryParent, jsonData) {

  for (var [key, value] of Object.entries(jsonData)) {
    newCategoryParent = categoryParent + '/' + value['name'];
    yield [newCategoryParent, key];
    yield *getFindingsCategories(newCategoryParent, value['categoryChildren']);

  };

};


// function for loading tooltips (e.g. for CVSS dropdowns)
function loadToolTips() {
  $('.tooltipSelect').click(function(e){
    var buttonID = $(e.currentTarget).attr('id').split('-');
    var fieldName = buttonID[buttonID.length-1];
    loadModal('tooltipSelect', function(tooltipSelectModal) {
      tooltipSelectModal.modal('show');
      selectedTooltipText = $('#tooltipText-'+fieldName).html();
      tooltipSelectModal.find('.modal-body').html(selectedTooltipText);
    });
  });
};


var entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};


function escapeHtml (string) {
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}


/* NOTIFICATIONS */

function notifyURL (url, notifyMessage, typeSelect=1) {
  let encodedMessage = btoa(typeSelect.toString() + '|' + notifyMessage);
  let returnURL = url + '?notify=' + encodedMessage;
  return returnURL;
}

function redirect(url, newTab=false) {
  if (newTab) {
    window.open(url, '_blank');
  } else {
    window.location.href = url;
  }
}

function successRedirect(url, notifyMessage, newTab=false) {
  redirect(successURL(url, notifyMessage), newTab=newTab);
}

function errorRedirect(url, notifyMessage, newTab=false) {
  redirect(errorURL(url, notifyMessage), newTab=newTab);
}

function warningRedirect(url, notifyMessage, newTab=false) {
  redirect(warning(url, notifyMessage), newTab=newTab);
}

function successURL(url, notifyMessage) {
  return notifyURL(url, notifyMessage, 1);
}

function errorURL(url, notifyMessage) {
  return notifyURL(url, notifyMessage, 2);
}

function warningURL(url, notifyMessage) {
  return notifyURL(url, notifyMessage, 3);
}

// happy success message
function success(notifyMessage) {
  notify(notifyMessage, 1);
}

// big bad failure message
function error(notifyMessage) {
  notify(notifyMessage, 2);
}

function warning(notifyMessage) {
  notify(notifyMessage, 3);
}

function notify (notifyMessage, typeSelect=1) {
  switch(true) {
    case typeSelect == 1:
      var icon = 'fa fa-check-circle';
      var type = 'success';
      break;
    case typeSelect == 2:
      var icon = 'fa fa-exclamation-circle';
      var type = 'danger';
      break;
    case typeSelect == 3:
      var icon = 'fa fa-exclamation-triangle';
      var type = 'warning';
      break;
    default:
      console.log('Bad type value for notify parameter');
      return;
  }
  $.notify({
      // option
      message: notifyMessage,
      icon: icon
    },{
      // settings
      type: type,
      // z-index: slightly higher than bootstrap modal
      z_index: 1060,
      delay: 5000,
      offset: {x:20,y:50},
  });
}


function processNotifications() {
  var url = new URL(window.location.href);
  var encodedMessage = url.searchParams.get('notify');
  if (encodedMessage && encodedMessage.length)
  {
    var decoded = escapeHtml(atob(encodedMessage));
    var decodedSplit = decoded.split("|");
    var notifyMessage = decodedSplit[1];
    if (decodedSplit.length == 2)
    {
      var typeSelect = parseInt(decodedSplit[0]);
      notify(notifyMessage, typeSelect);
      // Delete the notify parameter.
      url.searchParams.delete('notify');
      window.history.replaceState({}, document.title, url.toString());
    }
    else
    {
      console.log("error processing notify value");
    }
  }
};



function refreshPaneTabs() {

  // hide tabs if main pane is visible
  if ($('#fullPane:visible') && $('#fullPane').html().trim()) {
    $('#paneTabGroup').hide();
  } else {
    $('#fullPane').hide();
    $('#paneTabGroup').show();
  }

  var leftPaneTitle = $('#leftPane .card-header').text();
  var rightPaneTitle = $('#rightPane .card-header').text();
  if (leftPaneTitle) {
    $('#paneLeftTab').text(leftPaneTitle);
    $('#leftPane .card-header').empty();
  }
  if (rightPaneTitle) {
    $('#paneRightTab').text(rightPaneTitle);
    $('#rightPane .card-header').empty();
  }

}



$(document).ready(function() {

  // highlight the current nav location with its unique color
  current_location = window.location.pathname.split('/')[1];
  if (current_location == 'components') {
    if ($('#engagement-info').attr('engagement-id')) {
      current_location = 'engagements';
    } else {
      current_location = 'templates';
    }
  }
  current_color = $('div.navstyle-'+current_location).attr('navcolor');
  $('div.navstyle-' + current_location).addClass('active');
  $('div.navstyle-' + current_location).find('a').attr('style', `border-color: var(${current_color}) !important`);

  // handle notifications
  processNotifications();

  // enable tooltips
  $('[data-toggle="tooltip"]').tooltip()

  /* SPLIT PANE TABS */
  refreshPaneTabs();
  $(document).on('paneLoaded', refreshPaneTabs);

  $('#paneLeftTab').off().click(function(){
    $('div.paneTab').removeClass('active');
    $('div#paneLeftTab').addClass('active');  
    $('#rightPane').hide();
    $('#leftPane').show();
    $('#leftPane').removeClass('col-md-6');
    $('#leftPane').addClass('col-lg-12');
  })

  $('#paneRightTab').off().click(function(){
    $('div.paneTab').removeClass('active');
    $('div#paneRightTab').addClass('active');  
    $('#leftPane').hide();
    $('#rightPane').show();
    $('#rightPane').removeClass('col-md-6');
    $('#rightPane').addClass('col-lg-12');
  })

  $('#paneCenterTab').off().click(function(){
    $('div.paneTab').removeClass('active');
    $('div#paneCenterTab').addClass('active');  
    $('#leftPane').show();
    $('#rightPane').show();
    $('.pane').removeClass('col-lg-12');
    $('#leftPane').addClass('col-md-6');
    $('#rightPane').addClass('col-md-6');
  })

  $(".paginate").DataTable({
      "pagingType": "full_numbers",
      "order": []
  });
});


$.ajaxSetup({
  headers: { "X-CSRFToken": getCookie("csrftoken") }
});

function getCookie(c_name)
{
  if (document.cookie.length > 0)
  {
    c_start = document.cookie.indexOf(c_name + "=");
    if (c_start != -1)
    {
      c_start = c_start + c_name.length + 1;
      c_end = document.cookie.indexOf(";", c_start);
      if (c_end == -1) c_end = document.cookie.length;
      return unescape(document.cookie.substring(c_start,c_end));
    }
  }
  return "";
}

// short random string, please in the name of god don't use this for crypto operations
function randomString() {
  return Math.random().toString(36).substring(2, 15);
}

// scroll to an element
function scrollTo(e) {
  $([document.documentElement, document.body]).animate({
    scrollTop: $(e).offset().top - 200
  }, 500);
}
