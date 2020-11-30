  // finding delete
  $('.findingDelete').click(function(e) {

    var findingID = $(e.currentTarget).closest('tr').attr('finding-id');
    var findingName = $(e.currentTarget).closest('tr').attr('finding-name');

    promptModal(
      confirm_callback=function(e) {
        if (inEngagements()) {
          var engagementID = $('#engagement-info').attr('engagement-id');
          var deleteURL = '/engagements/fgroup/finding/delete/' + findingID;
          var redirectURL = `/engagements/edit/${engagementID}`;
        } else {
          var deleteURL = '/findings/delete/' + findingID;
          var redirectURL = '/findings';
        }

        $.ajax({url: deleteURL, 
          type: 'POST',
          success: function(result) {
            successRedirect(redirectURL, `Successfully deleted finding: "${findingName}"`);
          },
          error: function() {
            errorRedirect(redirectURL, `Error deleting finding: "${findingName}"`);
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
