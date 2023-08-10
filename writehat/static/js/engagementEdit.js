function updateFindingPrefix() {
  var prefixes = {
    'CVSS': 'T',
    'DREAD': 'NT',
    'PROACTIVE': 'P'
  }
  var scoringType = $('#id_scoringType').val()
  $('.modal').find('input[name="prefix"]').val(prefixes[scoringType]);
}

function saveState() {
  console.log("SAVED");
  var status = {};
  $(".btn-save-state").each(function() {
    status[$(this).attr("id")] = $(this).prop("checked");
  });
  localStorage.setItem("status", JSON.stringify(status));
}

$(document).ready(function() {

  if (localStorage.getItem("status")) {
    var savedStatus = JSON.parse(localStorage.getItem("status"));
    if (savedStatus) {
      $(".btn-save-state").each(function() {
        var id = $(this).attr("id");
        if (savedStatus.hasOwnProperty(id)) {
          $(this).prop("checked", savedStatus[id]);
          $(this).closest("label").toggleClass("active", savedStatus[id]);
        }
      });
    }
  }

  var engagementID = $('#engagement-info').attr('engagement-id');
  var engagementName = $('#engagement-info').attr('engagement-name');

  $('#engagementDelete').click(function(e) {

    promptModal(
      confirm_callback=function() {
        $.post({
          url: '/engagements/delete/' + engagementID, 
          success: function(result) {
            successRedirect('/engagements', `Successfully deleted engagement: "${engagementName}" and all child entities`);
          }
        })
      },
      title='Delete Engagement?',
      body=`Are you sure you want to delete **${engagementName}** and all of its reports and findings?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Engagement, Reports, and Findings',
      danger=true
    )

  });

  // Custom range filtering function
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    var itemStatus = data[4];
    return $(`input[name='status'][value='${itemStatus}']:checked`).length === 1;
  });

  var table = $('#reports').DataTable();
  
  // Bind the change event handler
  $('#status-radio').change(function() {
      saveState();
      table.draw();
  });
  
  // Trigger the change event to set the filter active by default
  $('#status-radio').trigger('change');

  // edit button
  $('#engagementEdit').click(function(e) {
    loadModal('engagementEdit', function(engagementEditModal) {
      engagementEditModal.modal('show');
      setCustomerID();

      $('#id_pageTemplateID').prop('required', false);
      var pageID = $('#page-info').attr('page-id');
      $('#id_pageTemplateID').val(pageID);
      $('.selectpicker').selectpicker('render');

      $('#engagementEditSave').click(function() {

        if (!($('#id_name').val())) {
          error('Please specify a name for the engagement');
          return;
        }

        var form = engagementEditModal.find('form');
        $.ajax({
          url: form.attr('action'),
          method: 'POST',
          data: form.serialize(),
          success: function() {
            successRedirect('/engagements/edit/' + engagementID, 'Successfully updated engagement');
          },
          error: function() {
            error('Failed to update engagement');
          }
        })
      })
    });
  });


  // remove fgroup 
  $( "button[id^='fgroupDelete']" ).click(function(e) {

    var groupId = $(e.currentTarget).attr('id').split('_')[1];
    var findingGroupName = $('#fgroupName_' + groupId).text();

    promptModal(
      confirm_callback=function() {
        $.post({
          url: `/engagements/fgroup/delete/${groupId}`, 
          success: function(reportID) {
           successRedirect('/engagements/edit/' + engagementID,'Successfully removed findingGroup and child findings')
           //TO DO: get load pane to work instead of a redirect
           //loadPane('findingGroupList','groupListPane');
          },
          error: function(result) {
            error('Failed to delete finding group');
          }
        })
      },
      title='Delete Finding Group?',
      body=`Are you sure you want to delete **${findingGroupName}** and all of its findings?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Finding Group and Associated Findings',
      danger=true
    )

  })


  // finding group (name) edit
  $('.fgroupedit').click(function(e) {

    var fgroupID = $(this).attr('fgroupID');

    loadModal('editFindingGroup', function(editFindingGroupModal) {
      editFindingGroupModal.modal('show');

      $('#cancelEditFgroup').off().click(function() {
        editFindingGroupModal.modal('hide');
           
      });

      $('#saveEditFgroup').click(function(e) {

        if (!($(this).closest('.modal').find('[name="name"]').val())) {
          error('Please specify a name for the finding group');
          return;
        }

        $.post({
          url: `/engagements/fgroup/edit/${fgroupID}`,
          data: $(e.currentTarget).closest('.modal').find('form').serialize(),
          success: function(reportID) {
           editFindingGroupModal.modal('hide');
           successRedirect(`/engagements/edit/${engagementID}`, 'Successfully updated finding group')
          },
          error: function(result) {
            error('Failed to update finding group');
          }
        })
      });

    }, {'fgroupID': fgroupID}, );


  });

  // new fgroup button
  $('#fgroupAdd').click(function() {
     loadModal('newFindingGroup', function(newFindingGroupModal) {
     
      newFindingGroupModal.modal('show');

      // update the finding prefix when scoring method is changed
      $('#id_scoringType').off().change(updateFindingPrefix);
      updateFindingPrefix();

      $('#cancelNewFgroup').off().click(function() {
        newFindingGroupModal.modal('hide');   
      });
      $('#saveNewFgroup').click(function() {

        if (!($(this).closest('.modal').find('[name="name"]').val())) {
          error('Please specify a name for the finding group');
          return;
        }

        var scoringType;
        if ($('#id_scoringType').val() == 'CVSS') {
          scoringType = 'cvss';
        } else if ($('#id_scoringType').val() == "DREAD")  {
          scoringType = 'dread';
        } else if ($('#id_scoringType').val() == "PROACTIVE")  {
          scoringType = 'proactive';
        } else {
          error('Invalid group type submitted');
        }


        $.ajax({
          url: `/engagements/${engagementID}/fgroup/${scoringType}/create`,
          type: 'POST',
          data: {
              'name': $('#id_name').val(),
              'prefix': $('#id_prefix').val()
          },
          success: function(reportID) {
           newFindingGroupModal.modal('hide');

           successRedirect('/engagements/edit/' + engagementID, 'Successfully added findingGroup')
           //TO DO: get load pane to work instead of a redirect
           //loadPane('findingGroupList','groupListPane');

          },
          error: function(result) {
            error('Failed to create findingGroup');
          }
          })
      });

     });
   });


  // new report button
  $('#reportCreate').click(function() {

    loadModal('reportTemplateSelect', function(reportTemplateSelectModal) {

      reportTemplateSelectModal.modal('show');

      // load vanilla report creation page if the modal is closed
      //reportTemplateSelectModal.on('hide.bs.modal', function() {
      //  redirect(`/engagements/${engagementID}/report/new`);
      //})
      $('#cloneReportTemplate').off().click(function() {
        // cancel the loading of the new report page
        reportTemplateSelectModal.unbind();
        var reportTemplateID = $('#id_reportTemplate').val();
        loadReportTemplate(reportTemplateID);
      })
      $('#createFromScratch').off().click(function() {
        redirect(`/engagements/${engagementID}/report/new`);
      })
      // simulate a click on the selectpicker
      $('.selectpicker').on('loaded.bs.select', function() {
        $('button.btn.dropdown-toggle.btn-light').click();
      })
      $('#id_reportTemplate').selectpicker();
    })

  })

  // loadFromTemplate button
  function loadReportTemplate(reportTemplateID) {
    $.post({
      url: `/engagements/report/${reportTemplateID}/createFromTemplate`, 
      data: {
        'engagementID': $('#engagement-info').attr('engagement-id'),
      },
      success: function(reportID) {
        var url = `/engagements/report/${reportID}/edit`;
        successRedirect(url, 'Successfully created report from template');
      },
      error: function(result) {
        error('Failed to create report');
      }
    })
  }

  // report generate button (HTML)
  $('.reportGenerateHTML').click(function(e) {
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    var win = window.open(`/engagements/report/${reportID}/generate`, '_blank');
    if (win) {
      // browser has allowed it to be opened
      win.focus();
    } else {
      // browser has blocked it
      error('Please allow popups for this site');
    }
  })

  // report generate button (PDF)
  $('.reportGeneratePDF').click(function(e) {
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    var win = window.open(`/engagements/report/${reportID}/generatePdf`, '_blank');
    if (win) {
      // browser has allowed it to be opened
      win.focus();
    } else {
      // browser has blocked it
      error('Please allow popups for this site');
    }
  })

  // report generate button (PDF)
  $('.reportEdit').click(function(e) {
    var reportID = $(e.currentTarget).closest('tr').attr('report-id');
    window.location.href = `/engagements/report/${reportID}/edit`;
  })

})
