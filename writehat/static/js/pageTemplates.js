
function submitForm() {
  if (inURL('pages/new')) {
    var action = 'create';
  } else {
    var pageID = getItemIDs()['pageID'];
    var action = `update/${pageID}`;
  }

  var formData = $('#pageTemplateForm').serialize();

  $.post({
    url: `/pages/${action}`,
    data: formData,
    success: function (data) {
      if (action == 'create') {
        var url = `/pages/edit/${data}`;
        var message = 'Successfully created page template';
      } else {
        var url = `/pages/edit/${pageID}`;
        var message = 'Successfully updated page template';
      }
      successRedirect(url, message);
    },
    error: function (data) {
      error(`Failed to ${action} page template`);
      refreshPageTemplateJS();
    },
  });

}


function startUpload(e) {
  var imageUploader = new ImageUploader(inline=true, editing=false, eventArgs=[$(this)]);
  $( document ).off(ImageUploader.inlineSuccessEvent);
  $( document ).on(ImageUploader.inlineSuccessEvent, function(e, imageID, caption, size, imageSelect) {
    var imageContainer = $(imageSelect).closest('.imageContainer');
    imageContainer.find('img.imageSelect').attr('src', `/images/${imageID}`);
    imageContainer.find('img.imageSelect').show();
    imageContainer.find('.imagePlaceholder').hide();
    imageContainer.find('input').val(imageID);
    imageContainer.find('.imageDeleteIcon').show();
    imageContainer.removeAttr('style');
    refreshPageTemplateJS();
  })
  imageUploader.select();
}


function refreshPageTemplateJS() {
  $('.imageSelect').each(function() {
    if ($(this).is(':visible')) {
      $(this).removeAttr('style');
    } else {
      $(this).closest('.imageContainer').attr('style', 'background-color: rgba(255,255,255,.2)');
    }
  })
}


$( document ).ready(function() {

  $('#pageTemplateSave').click(submitForm);

    // for deleting from the page edit page
  $('#pageTemplateDelete').click(function(e) {
    var pageID = $('#page-info').attr('page-id');
    var pageName = $('#page-info').attr('page-name');

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
    
    $('.imageSelect').off().click(startUpload);
    $('.imagePlaceholder').off().click(startUpload);
    $('.imageSelectIcon').off().click(startUpload);
  })

  // image uploads
  $('.imageSelect').off().click(startUpload);
  $('.imagePlaceholder').off().click(startUpload);
  $('.imageSelectIcon').off().click(startUpload);

  // delete image
  $('.imageDeleteIcon').click(function(e) {
    var imageContainer = $(this).closest('.imageContainer');
    imageContainer.find('img.imageSelect').attr('src', '');
    imageContainer.find('input').val('');
    imageContainer.find('.imageSelect').hide();
    imageContainer.find('.imagePlaceholder').show();
    imageContainer.find('.imageDeleteIcon').hide();

    imageContainer.find('.imageSelect').off().click(startUpload);
    imageContainer.find('.imagePlaceholder').off().click(startUpload);
    imageContainer.find('.imageSelectIcon').off().click(startUpload);
    refreshPageTemplateJS();
  })

  refreshPageTemplateJS();

})