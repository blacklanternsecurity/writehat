$(document).ready(function() {

  loadSortable();

  // Save button
  $('#reportCreate').click(function() {

    // make sure there is a name
    if (!($('#reportForm #id_name').val())) {
      error('Please specify a name for the report');
      return;
    }

    // getReportJSON() moved to global.js
    var reportJSON = JSON.stringify(getReportJSON());

    // handle both reportTemplate and engagementReport creation

    if (inEngagements()) {
      var engagementID = $('#engagement-info').attr('engagement-id');
      var saveURL = `/engagements/${engagementID}/report/create`;
      var redirectURL = `/engagements/edit/${engagementID}`;
    } else {
      var saveURL = '/templates/create';
      var redirectURL = '/templates';
    }

    $.ajax({url: saveURL, 
      type: 'POST',
      data: reportJSON,
      contentType: "application/json; charset=utf-8",
      success: function(result) {
        var uuid = result.responseText;
        var reportName = $('#reportForm #id_name').val();
        successRedirect(redirectURL, `Successfully created report: "${reportName}"`);
      },
      error: function(result) {
        error('Error occured while creating report');
      }
    })
  })
})




function loadImportedForm() {
  console.log('loadImportedForm');
  $.ajax(
    {
      url : '/engagements/fgroup/finding/import/' + $("#id_finding").val(),
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
      }
    }
  )
}