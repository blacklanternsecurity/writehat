$(document).ready(function() {

  $('#writehat-engagements').on('click', '.engagementDelete', function(e){

    engagementID = $(e.currentTarget).closest('tr').attr('engagement-id');
    engagementName = $(e.currentTarget).closest('tr').attr('engagement-name');

    promptModal(
      confirm_callback=function(e) {
        $.post({url: `/engagements/delete/${engagementID}`, 
          success: function(result) {
            successRedirect('/engagements', `Successfully deleted engagement: "${engagementName}" and all child entities`);
          }
        })
      },
      title='Delete Engagement?',
      body=`Are you sure you want to delete **${engagementName}** and all of its reports and findings?`,
      leftButtonName='Cancel',
      rightButtonName='Delete Engagement',
      danger=true
    )

  })

  $('#writehat-engagements').on('click', '.engagementClone', function(e){

    engagementID = $(e.currentTarget).closest('tr').attr('engagement-id');
    engagementName = $(e.currentTarget).closest('tr').attr('engagement-name');

    promptModal(
      confirm_callback=function(e) {
        $.post({url: `/engagements/clone/${engagementID}`, 
          success: function(result) {
            successRedirect('/engagements', `Successfully cloned engagement: "${engagementName}"`);
          }
        })
      },
      title='Clone Engagement?',
      body=`Are you sure you want to clone **${engagementName}** and all of its reports and findings?`,
      leftButtonName='Cancel',
      rightButtonName='Clone Engagement',
      danger=false
    )

  })



  /*
  $('.engagementEdit').click(function(e) {

    console.log(e.currentTarget);
    engagementID = $(e.currentTarget).closest('tr').attr('engagement-id');
    window.location.href = '/engagements/edit/' + engagementID;

  });
  */

})