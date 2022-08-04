function updateReportFindings() {
  if (inEngagements()) {
    var findingsList = [];
    var all_checked = true;
    $('#findingSelect-modal table.writehat-form tbody tr').each(function() {
      var checked = $(this).find('.custom-checkbox input.custom-control-input').prop('checked');
      
      if (checked) {
        findingsList.push($(this).attr('finding-id'))
      } else {
        all_checked = false;
      }
    })

    if (all_checked) {
      findingsList = [];
    }
    reportUpdateFindings(findingsList, callback=function() {
      $('#findingSelect-modal').modal('hide');
    })
  }
}


function getReportFindings() {
  $.post({
    url: '/engagements/report/findings',
    data: getItemIDs(),
    success: function(response) {
      $('#findingSelect-modal table tr input.custom-control-input').prop('checked', false);
      for (var i=0; i < response.length; i++) {
        var findingCheckbox = $(`#findingSelect-modal tr[finding-id=${response[i]}] input.custom-control-input`);
        findingCheckbox.prop('checked', true);
      }
      checkboxPrep();
    },
  })
}


function showFindingSelectionModal() {
  if (inEngagements()) {
    loadModal('findingSelect', function(modalID) {
      getReportFindings();
      $(modalID).modal('show');
      $('#findingSelectSaveButton').click(updateReportFindings);
    });
  }
}


function deleteComponent(e) {
  //Use target.closest() instead of parent-component attribute
  //parentComponent = $('#' + $(e.currentTarget).attr('parent-component'))
  var component = $(e.currentTarget).closest(".reportComponent");
  var componentName = component.find('.componentName').text();

  promptModal(
    confirm_callback=function() {
      component.remove();
    },
    title='Delete Component?',
    body=`Are you sure you want to delete **${componentName}**?`,
    leftButtonName='Cancel',
    rightButtonName='Delete Component',
    danger=true
  )

}



function cloneComponent(e) {
  var component = $(e.currentTarget).closest('.reportComponent');
  var componentName = component.find('div.componentName').first().text().trim();

  promptModal(
    confirm_callback=function() {
      var componentClone = component.clone();
      componentClone.find('.componentName').text(`Clone of ${componentName}`);
      componentClone.insertAfter(component);
    },
    title='Clone Component?',
    body=`Are you sure you want to clone **${componentName}**?`,
    leftButtonName='Cancel',
    rightButtonName='Clone Component'
  ) 
}



function refreshReportJS() {

  // delete components
  $('.componentDelete').off().click(deleteComponent);

  // clone components
  $('.componentDuplicate').off().click(cloneComponent);

  $('.componentEdit').off().click(function(e) {
    window.location.href = "/components/" + $(this).attr("componentID") + "/edit";
  })

  $('.reviewStatus').click(function(e) {
    window.location.href = "/engagements/report/" + $(this).attr("reportID") + "/status";
  })

  // set page template
  $('#id_pageTemplateID').prop('required', false);
  var pageID = $('#page-info').attr('page-id');
  $('#id_pageTemplateID').val(pageID);
  $('.selectpicker').selectpicker('render');

  $('.componentDelete').off().click(deleteComponent)
  loadSortable();

}


$(document).ready(function() {

  var reportID = $('#report-info').attr('report-id');

  // back button
  $('#backButton').click(function() {
    if (inEngagements()) {
      var engagementID = $('#engagement-info').attr('engagement-id');
      redirect(`/engagements/edit/${engagementID}`);
    } else {
      redirect('/templates');
    }
  })


  // select findings button
  $('#findingSelectButton').click(showFindingSelectionModal);


  // Save button
  $('#reportUpdate').click(function(e) {
    // make sure there is a name
    var reportName = $('#reportForm #id_name').val();
    if (!reportName && reportName != undefined) {
      error('Please specify a name for the report');
      return;
    }
    reportUpdateAndRefresh()
  })


  $('#reportGenerate').click(function() {
    var url = '/engagements/report/' + reportID + '/generate';
    window.open(url, '_blank');
  })

  $('#reportGeneratePdf').click(function() {
    var url = '/engagements/report/' + reportID + '/generatePdf';
    window.open(url, '_blank');
  })

  // saveToTemplate button
  $('#saveToTemplate').click(function() {
    $.ajax({url: '/engagements/report/' + reportID + '/saveToTemplate', 
      type: 'POST',
      success: function(result) {
        // open template editor in new tab
        successRedirect(`/templates/edit/${result}`, 'Successfully created template', newTab=true);
      },
      error: function(result) {
        error('Failed to create template');
      }
    })
  })

  $('#reportEdit').click(function(e) {
    target = $(e.currentTarget);

    if (target.hasClass('paneSwitched')) {
      target.removeClass('paneSwitched');
      $('#paneLeftTab').click();
    } else {
      loadPane('availableComponents', 'rightPane', success_callback=loadSortable, button=target);
      $('#paneCenterTab').click();
    }

  })

  refreshReportJS();

  if (window.location.pathname.endsWith('/new')) {
    $('#paneCenterTab').click();
  } else {
    $('#paneLeftTab').click();
  }

  $(".container-collapse").click( function() {
    let container = $(this).closest(".componentItem");
    let c_id = container.attr("component-id");
    let c_name = "hide_" + c_id + "=1; path=/; ";
    container.children(".containerDiv").slideToggle("fast");

    if ($(this).hasClass("fa-angle-right")) {
      $(this).removeClass("fa-angle-right");
      $(this).addClass("fa-angle-down");
      localStorage.setItem("hide_" + c_id, 0);
    } else {
      $(this).removeClass("fa-angle-down");
      $(this).addClass("fa-angle-right");
      localStorage.setItem("hide_" + c_id, 1);
    }
  });

  $(".container-collapse").each( function() { 
    let container = $(this).closest(".componentItem");
    let c_id = container.attr("component-id");
    if (localStorage.getItem("hide_" + c_id) == 1) {
      $(this).trigger("click");
    }
  });

});

$(document).on('paneLoaded', refreshReportJS);
