/* GLOBAL FUNCTIONS RELATED TO REPORTS */
/* OTHER REPORT SCRIPTS USE FUNCTIONS FROM THIS FILE */

// delete report
function reportDeleteAndRefresh(reportID, reportName) {
  if (inEngagements()) {
    var engagementID = $('#engagement-info').attr('engagement-id');
    var deleteURL = `/engagements/report/${reportID}/delete`;
    var redirectURL = `/engagements/edit/${engagementID}`;
  } else {
    var deleteURL = '/templates/delete/' + reportID;
    var redirectURL = '/templates';
  }

  $.post({
    url: deleteURL, 
    success: function(result) {
      successRedirect(redirectURL, `Successfully deleted report: "${reportName}"`);
    },
    error: function() {
      errorRedirect(redirectURL, `Error deleting report: "${reportName}"`);
    }
  })
}

// delete page
function pageDeleteAndRefresh(pageID, pageName) {
  $.post({
    url: `/pages/delete/${pageID}`, 
    success: function(result) {
      successRedirect('/templates', `Successfully deleted page: "${pageName}"`);
    },
    error: function() {
      errorRedirect('/templates', `Error deleting page: "${pageName}"`);
    }
  })
}

// update report components & name
function reportUpdateAndRefresh() {
  var reportID = $('#report-info').attr('report-id');
  var reportName = $('#reportForm #id_name').val();

  if (inEngagements()) {
    var engagementID = $('#engagement-info').attr('engagement-id');
    var saveUrl = '/engagements/report/' + reportID + '/update';
  } else {
    var saveUrl = '/templates/update/' + reportID;
  }

  $.post({
    url: saveUrl,
    data: JSON.stringify(getReportJSON()),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    success: function(result) {
      if (result.length > 0) {
        success(`Successfully saved ${reportName}`);
        loadPane('reportComponents', 'leftPane');
        $(document).trigger('saveEvent');
      }
    }, 
    error: function(result) {
        error("An error occurred while saving the report");
    }
  })
}


// updates the findings for a report
function reportUpdateFindings(findingsList=[], callback=function(){}) {

  var reportID = $('#report-info').attr('report-id');

  $.post({
    url: `/engagements/report/${reportID}/update`, 
    data: JSON.stringify({'reportFindings': findingsList}),
    contentType: 'application/json; charset=utf-8',
    success: function(result) {
      success('Successfully updated findings');
      callback();
    },
    error: function(result) {
      error("An error occurred while updating the findings");
    }
  })

}

// Use componentToJson to recursively build a list of components in the report
function getReportJSON() {
  var reportContents = {};
  var reportData = $('#reportForm').serializeArray();
  $.map(reportData, function(n, i) {
    if (!(n['value'] == '')) {
      reportContents[n['name']] = n['value'];
    }
  });

  var reportComponentDivs = $('#reportComponents > .reportComponent');
  var reportComponents = [];

  reportComponentDivs.each(function() { 
    var component = componentToJson($(this)[0]);
    reportComponents.push(component);
  });

  reportContents["reportComponents"] = reportComponents;

  return reportContents;
}


// Enumerate report component hierarchy
function componentToJson(element) {
  var component = {
    'type': $(element).attr('component-type'),
    'uuid': $(element).attr('component-id')
  }
  
  var children = $(element).children(".containerDiv").children(".reportComponent");
  if (children.length) {
    component['children'] = [];

    children.each( function() { 
      component['children'].push(componentToJson($(this)));
    });
  }

  return component;
}


/* DRAG AND DROP */

function makeSortable(e) {
  new Sortable(e, {
    group: 'shared',
    animation: 150,
    nested: true,
    onAdd: function(e) {
      if ($(e.item).hasClass("containerComponent")) {
        makeSortable($(e.item).children(".containerDiv")[0]);
      }
    }
  });
}

loadSortable = function() {
  if ($('#availableComponents').length || $('#reportComponents').length) {

    if($('#availableComponents').length) {
      new Sortable(availableComponents, {
        group: {
          name: 'shared', // set both lists to same group
          pull: 'clone',  // To clone: set pull to 'clone'
        },
        sort:false,
        nested: true,
        animation: 150,
        onAdd: function (e) {
          $(e.item).remove();
        }
      });
    };

    if($('#reportComponents').length) {
      new Sortable(reportComponents, {
        group: 'shared',
        animation: 150,
        nested: true,
        onAdd: function(e) {
          if ($(e.item).hasClass("containerComponent")) {
              makeSortable($(e.item).children(".containerDiv")[0]);
          }
        }
      });
    };

    var containerComponents = $('#reportComponents').find('.containerDiv');
    if (containerComponents.length) {
      containerComponents.each( function() { 
        makeSortable($(this)[0]);
      });
    }
  };
};

$( document ).ready(function() {

  // clone report button
  $('.reportClone').click(function(e) {

    var reportName = $(e.currentTarget).closest('tr').attr('report-name');
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');

    promptModal(
      confirm_callback=function(e) {
        $.post({
          url: `/templates/clone/${reportID}`,
          success: function(clonedReportID) {
            if (inEngagements()) {
              var engagementID = $('#engagement-info').attr('engagement-id');
              var cloneRedirectURL = `/engagements/edit/${engagementID}`;
            } 
            else {
              var cloneRedirectURL = '/templates';
            }
            successRedirect(cloneRedirectURL, 'Successfully cloned report');
          },
          error: function() {
            error('Failed to clone report');
          }
        })
      },
      title='Clone Report?',
      body=`Are you sure you want to clone **${reportName}**?`,
      leftButtonName='Cancel',
      rightButtonName='Clone Report',
    )
  })

  // for deleting from the report edit page
  $('#reportDelete').click(function(e){

    var reportID = $('#report-info').attr('report-id');
    var reportName = $('#report-info').attr('report-name');

    promptModal(
      confirm_callback=function(e) {
        reportDeleteAndRefresh(reportID, reportName);
      },
      title='Delete Report?',
      body=`Are you sure you want to delete **${reportName}** and all of its components?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Report',
      danger=true
    )

  });


  // for deleting from a list
  $('.reportDelete').click(function(e) {

    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    var reportName = $(e.currentTarget).closest('tr').attr('report-name');

    promptModal(
      confirm_callback=function(e) {
        reportDeleteAndRefresh(reportID, reportName);
      },
      title='Delete Report?',
      body=`Are you sure you want to delete **${reportName}** and all of its components?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Report',
      danger=true
    )

  })


  $('.reportEdit').click(function(e) {
    reportID = $(e.currentTarget).closest('tr').attr('report-id');
    if (inTemplates()) {
      var url = '/templates/edit/' + reportID;
    } else {
      var url = '/engagements/report/' + reportID + '/edit';
    }
    window.location.href = url;
  })

  /*
  // clone report button
  $('.reportClone').click(function(e) {
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    $.post({
      url: `/templates/clone/${reportID}`,
      success: function(clonedReportID) {
        successRedirect(`/templates`, 'Successfully cloned report');
      },
      error: function() {
        error('Failed to clone report');
      }
    })
  })

  // for deleting from a list
  $('.reportDelete').click(function(e) {
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    var reportName = $(e.currentTarget).closest('tr').attr('report-name');
    reportDeleteAndRefresh(reportID, reportName);
  })

  // for deleting from the report edit page
  $('#reportDelete').click(function(e) {
    var reportID = $('#report-info').attr('report-id');
    var reportName = $('#report-info').attr('report-name');
    reportDeleteAndRefresh(reportID, reportName);
  })


  // report edit button
  $('.reportEdit').click(function(e) {
    if (inTemplates()) {
      var url = '/templates/edit/';
    } else {
      var url = '/reports/edit/';
    }
    reportID = $(e.currentTarget).closest('tr').attr('report-id');
    window.location.href = url + reportID;
  });
  */

  // page edit button
  $('.pageEdit').click(function(e) {
    var pageID = $(e.currentTarget).closest('tr').attr('page-id');
    window.location.href = `/pages/edit/${pageID}`;
  });

  // page delete button (list)
  $('.pageDelete').click(function(e) {

    var pageID = $(e.currentTarget).closest('tr').attr('page-id');
    var pageName = $(e.currentTarget).closest('tr').attr('page-name');

    promptModal(
      confirm_callback=function(e) {
        pageDeleteAndRefresh(pageID, pageName);
      },
      title='Delete Page Template?',
      body=`Are you sure you want to delete **${pageName}**?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Page Template',
      danger=true
    )
  })

  // clone page button
  $('.pageClone').click(function(e) {

    var pageID = $(e.currentTarget).closest('tr').attr('page-id');
    var pageName = $(e.currentTarget).closest('tr').attr('page-name');

    promptModal(
      confirm_callback=function(e) {
        $.post({
          url: `/pages/clone/${pageID}`,
          success: function(clonedPageID) {
            successRedirect(`/templates`, 'Successfully cloned page');
          },
          error: function() {
            error('Failed to clone page');
          }
        })
      },
      title='Clone Page Template?',
      body=`Are you sure you want to clone **${pageName}**?`,
      leftButtonName='Cancel',
      rightButtonName='Clone Page Template',
    )
  })

  // when the "report components" pane is refreshed
  $(document).on('paneLoaded-reportComponents', function() {
    $('.componentEdit').click(function(e) {
         window.location.href = "/components/" + $(this).attr("componentID") + "/edit";
    })
  })

})
