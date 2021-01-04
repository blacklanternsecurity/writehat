function postFigureMetadata(findingID) {
  if (inEngagements()) {
    let figureMetadata = [];
    let forceUpdate = false;
    $('.figureItem').each(function() {
      if ( $(this).attr('id') != 'dummyFigureItem' ) {
        let figureID = $(this).attr('figure-id');
        let figureCaption = $(this).find('.figure-caption').text();
        let figureSize = $(this).attr('figure-size');
        figureMetadata.push({
          'guid': figureID,
          'size': figureSize,
          'caption': figureCaption
        })
      } else if ($(this).attr('id') === 'dummyFigureItem' && $(this).prop('forceUpdate') === true) {
        forceUpdate = true
      } else {
        // continue
        return;
      }
    })
    if ((figureMetadata && figureMetadata.length) ||
        (figureMetadata.length === 0 && forceUpdate)) {
      $.ajax({
        url: `/images/finding/${findingID}/edit`,
        type:'post',
        data: JSON.stringify(figureMetadata),
        success: function(response) {
          success('Successfully saved figure metadata');
        },
        error: function(response) {
          error('Failed to update figure metadata');
        }
      })
    }
  }
}


function setCategoryID() {
  var categoryID = $('#finding-info').attr('category-id');
  $('#id_categoryID').val(categoryID);
  $('.selectpicker').selectpicker('refresh')
}


function findingSave() {
  let form = $('.writehat-form').closest('form');
  let post_url = form.attr('action');
  if (inEngagements()) {
    var engagementID = $('#engagement-info').attr('engagement-id');
    var redirectURL = '/engagements/fgroup/finding/edit/';
  } else {
    var redirectURL = '/findings/edit/';
  }
  // submit form
  $.ajax({
    url: post_url,
    type:'post',
    data: form.serialize(),
    success: function(findingID) {
      postFigureMetadata(findingID);
      var successMsg = 'Successfully saved finding';
      if (window.location.pathname.includes('/edit/')) {
        success(successMsg);
        $(document).trigger('saveEvent');
      } else {
        successRedirect(redirectURL + findingID, successMsg);
      }
    },
    error: function() {
      error('Failed to save finding');
    }
  })
}


// Update the CVSS/DREAD vector string & severity based on current selections
function updateRiskBadge() {

  var form = $('.writehat-form').closest('form');
  var form_data = form.serialize();
  var badgeContent = $('.risk-badge').text().trim().toUpperCase();

  // determine scoring type based on form fields
  if ($('#id_cvssAV').length) {
    var scoringType = 'CVSS';
  } else if ($('#id_dreadDamage').length) {
    var scoringType = 'DREAD';
  } else {
    var scoringType = 'PROACTIVE';
    $('.risk-badge').attr('finding-severity', 'Proactive');
    $('.risk-badge .textButton-text').text('Proactive');
  }

  if (scoringType != 'PROACTIVE') {
    // submit form
    $.post({
      url: `/validation/${scoringType}`.toLowerCase(),
      data: form.serialize(),
      success: function(response) {
        // update badge color
        $('.risk-badge').attr('finding-severity', response['severity']);
        // update badge text
        var severity = `${scoringType}: ${response['score'].toFixed(1)} ${response['severity']}`;
        $('.risk-badge .textButton-text').text(severity);
        // update vector string
        $('.risk-badge-content .dropdown-content').html(
          `<input value="${response['vector']}" style="min-width: 20rem"></input>`
        );
      },
      error: function() {
        error(`Failed to generate ${scoringType} preview`);
      }
    })
  }

}


function loadFigureSortable() {
  if($('#manageFiguresContent').length) {
    try {
      figureSortable.destroy();
    } catch {
      // ignore if sortable doesn't exist
    }
    figureSortable = new Sortable(manageFiguresSortable, {
      animation: 150,
    })
  }

  // figure delete
  $('.figureDelete').off().click(function(e) {
    e.stopPropagation();
    $(this).closest('.figureItem').remove();
    if ($('.figureItem').length === 1) {
      const dummy = $('.figureItem').first()
      if (dummy.prop("id") === "dummyFigureItem") {
        console.debug("Last figure deleted; setting forceUpdate on dummy item")
        dummy.prop("forceUpdate", true)
      }
    }
  })

  // figure edit
  $('.figureEdit').off().click(function(e) {

    e.stopPropagation();
    var figureItem = $(e.currentTarget).closest('.figureItem')
    var src = figureItem.find('img').attr('src');
    var caption = figureItem.find('.figure-caption').text();
    var size = figureItem.attr('figure-size');

    var readyEvent = 'figureEditReadyEvent';
    var imageEditor = new ImageUploader(inline=false, editing=true);

    $( document ).off(ImageUploader.editSuccessEvent);
    $( document ).on(ImageUploader.editSuccessEvent, function(e, figureID, caption, size) {
      console.log('editSuccessEvent');
      figureItem.find('.figure-caption').text(caption);
      figureItem.attr('figure-size', size);
      $('.modal').modal('hide');
    })

    $( document ).off(ImageUploader.readyEvent);
    $( document ).on(ImageUploader.editReadyEvent, function() {
      imageEditor.edit(src, caption, size);
      $( document ).off(ImageUploader.editReadyEvent);
    })
  })

  // figure upload
  $('#figureNew').off().click(function(e) {
    $( document ).off(ImageUploader.readyEvent);
    var imageUploader = new ImageUploader(input=null, inline=false);
    imageUploader.select();
  })
}


function refreshFigures() {
  if (inEngagements()) {
    loadPane('findingsFiguresList', 'manageFiguresContent', success_callback=function() {
      loadFigureSortable()
      $( document ).trigger( 'figuresRefresh' );
    })
  }
}

function showAdvancedCheckbox() {
  if (scoringType == 'CVSS') {
    // create new row for advanced checkbox
    if (!($('#advanced-choices-row').length)) {
      $('.writehat-form tr:nth-child(18)').after('<tr id="advanced-choices-row"><th class="text-warning">Show Advanced:</th><td></td></tr>');
      $('#show-advanced-choices').detach().appendTo(('#advanced-choices-row > td'));
    }
    
    // show/hide when toggled
    $('#finding-advanced-checkbox').off().change(function() {
      if (this.checked) {
        $('.finding-advanced-choice').each(function() {
          $(this).closest('tr').show();
        })
      } else {
        $('.finding-advanced-choice').each(function() {
          $(this).closest('tr').hide();
        })
      }
    })

    // hide advanced options by default
    var advanced_choices = $('.finding-advanced-choice');
    var advanced_choice_values = advanced_choices.map(function(x,y) {
      return y.value;
    }).toArray();

    // unless one of them has been changed already
    if (!(advanced_choice_values.some(function(v){return v !== 'X'}))) {
      advanced_choices.each(function() {
        $(this).closest('tr').hide();
      })
    } else {
       $('#finding-advanced-checkbox').click();
    }
  } else {
    // TODO: hide DREAD Descriptions and Affected Resources

    $('#show-advanced-choices').hide();
  }
}


function refreshJS() {
  // update risk preview
  updateRiskBadge();

  // stop dropdowns from closing when clicking inside
  $('.figure-caption').on("click.bs.dropdown", function (e) {
    e.stopPropagation();
    e.preventDefault();
  });

  // fancy select buttons
  $("select").not(".selectpicker").not(".grouped").togglebutton();
  $("select").not(".selectpicker").addClass("grouped");
  var groups = $("table.writehat-form .btn-group");

  groups.children("button").addClass("btn-secondary");
  groups.each(function() { 
    var buttons = $(this).children("button");
    var btnCount = buttons.length;
    buttons.each( function() { 
      $(this).addClass("n" + btnCount);
    });
  });

  showAdvancedCheckbox();

  // update the risk badge when selectors are changed
  $("select[name^='cvss'], select[name^='dread']").change(updateRiskBadge);

  loadToolTips();
  loadMarkdown();
  $('.selectpicker').selectpicker();
  refreshFigures();
}


function loadBlankForm() {
  console.log('loadBlankForm');
  $('#formDiv').show();
  $('#leftHeader').html('New Engagement Finding (blank form)');
  $('#findingForm').attr("action", formURL);
  $('#findingDatabaseSelect-modal').off('hide.bs.modal');
  $('#findingDatabaseSelect-modal').modal('hide');
  refreshJS();
}


function loadImportedForm() {
  console.log('loadImportedForm');
  $.ajax(
    {
      url : '/engagements/fgroup/' + $("#fgroup-info").attr('fgroup-id') + '/finding/import/' + $("#id_finding").val(),
      type: 'GET',
      contentType: 'application/json; charset=utf-8',
      dataType: 'html',
      success: function(data)
      {
        $('#leftHeader').html('New Engagement Finding (' + $("#id_finding option:selected" ).text() + ')');
        $('#findingDatabaseSelect-modal').modal('hide');
        $('#formDiv').html(data);
        //$('#id_categoryID').selectpicker();
        $('#findingForm').attr("action",formURL);
        $('#formDiv').show();
        refreshJS();
        setCategoryID();
        $('#id_findingGroup').val($("#fgroup-info").attr('fgroup-id'));
        $('#id_findingGroup').selectpicker('refresh');
        
        $('.categoryAddButton').off().click(function() {
          $('#categoryAdd-modal').modal('show');
        })
      },
      error: function()
      {
        error('Failed to import finding')
      }

    }
  )
}


function loadToolTips() {
  $('.tooltipSelect').click(function(e){
    var buttonID = $(e.currentTarget).attr('id').split('-');
    var fieldName = buttonID[buttonID.length-1];

    loadModal('tooltipSelect', function(tooltipSelectModal) {
      
      if (scoringType == 'DREAD'){
        $('#tooltipSelect-modalLabel').text('DREAD Info');
      }
      
      if (scoringType == 'CVSS'){
        $('#tooltipSelect-modalLabel').text('CVSS Info');
      }
  
      tooltipSelectModal.modal('show');
      selectedTooltipText = $('#tooltipText-'+fieldName).html();
      tooltipSelectModal.find('.modal-body').html(selectedTooltipText);
    })
  })
}


$(document).ready( function() {

  setCategoryID();

  // prevent cvss badge dropdown from closing on click
  $('.risk-badge-content .dropdown-content').click(function(e) {e.stopPropagation();})
  $('.dread-badge-content .dropdown-content').click(function(e) {e.stopPropagation();})

  // back button
  $('#backButton').click(function() {
    if (inEngagements()) {
      var engagementID = $('#engagement-info').attr('engagement-id');
      redirect(`/engagements/edit/${engagementID}`);
    } else {
      redirect('/findings');
    }
  })

  engagementID = $('#engagement-info').attr('engagement-id');
  fgroupID = $('#fgroup-info').attr('fgroup-id');
  scoringType = $('#fgroup-info').attr('fgroup-type');
  formURL = `/engagements/fgroup/${fgroupID}/finding/create`;

  //set the finding group ID
 $('#id_findingGroup').val(fgroupID);
 $('#id_findingGroup').selectpicker('refresh');

  // submit button
  $('#findingSave').click(function(e) {
    findingSave();
  });

  // saveToTemplate button
  $('#findingExport').click(function(e) {
    var findingID = $('#finding-info').attr('finding-id');
    successRedirect(
      `/findings/import/${findingID}`,
      'Successfully retrieved finding data',
      newTab=true
    )
  })
  

  // finding delete
  $('#findingDelete').click(function(e) {

    var findingName = $('#finding-info').attr('finding-name');

    promptModal(
      confirm_callback=function(e) {
        var findingID = $('#finding-info').attr('finding-id');
        if (inEngagements()) {
          var fgroupId = $('#fgroup-info').attr('fgroup-id');
          var deleteURL = `/engagements/fgroup/finding/delete/${findingID}`;
          var redirectURL = `/engagements/edit/${engagementID}`;
        } else {
          var deleteURL = `/findings/delete/${findingID}`;
          var redirectURL = `/findings`;
        }
        $.ajax({url: deleteURL, 
          type: 'POST',
          success: function(result) {
            successRedirect(redirectURL, `Successfully deleted finding "${findingName}"`);
          },
          error: function(result) {
            error(`Failed to delete finding "${findingName}"`);
          }
        })
      },
      title='Delete Finding?',
      body=`Are you sure you want to delete **${findingName}**?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Finding',
      danger=true
    )

  });



  if ( ! inEngagements() ) {
    $(".finding-database-exclude").each(function(){
      $(this).closest('tr').hide();
    })
  }

  if ( inEngagements() || window.location.pathname.includes('/findings/')) {
    refreshJS();
  } 

  // figure upload
  $( document ).on(ImageUploader.successEvent, function(e, figureID, caption, size) {
    if (!(inline)) {
      $('.modal').modal('hide');
      let newFigure = $('#dummyFigureItem').clone();
      newFigure.removeAttr('id');
      newFigure.find('.figure-caption').text(caption);
      newFigure.find('img').attr('src', '/images/' + figureID);
      newFigure.attr('figure-id', figureID);
      newFigure.attr('figure-size', size);
      newFigure.find('[figure-id]').each(function() {
        $(this).attr('figure-id', figureID);
      })
      newFigure.show();
      $('#manageFiguresSortable').append(newFigure);
      loadFigureSortable();
    }
  })

  // open the "import finding" modal if we're in engagements
  if ( inEngagements() && window.location.pathname.includes('/finding/new') ) {
    loadModal('findingDatabaseSelect', function(findingDatabaseSelectModal) {
      findingDatabaseSelectModal.modal('show');
      // load a blank form if the modal is closed
      findingDatabaseSelectModal.on('hide.bs.modal', loadBlankForm)
      $('#loadBlankForm').click(loadBlankForm);
      $('#loadImportedForm').click(function() {
        // cancel the loading of the blank form
        findingDatabaseSelectModal.unbind();
        loadImportedForm();
      })
      // simulate a click on the selectpicker
      $('.selectpicker').on('loaded.bs.select', function() {
        $('button.btn.dropdown-toggle.btn-light').click();
      })
      $('#id_finding').selectpicker();
    })
  }

})
