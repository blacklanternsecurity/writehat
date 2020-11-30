
/*
Given a binary blob and optional metadata, upload the image
and trigger an event (default 'figureUpload') with the image UUID
*/
function uploadImage(blob, size=100, caption='', eventString='figureUpload', eventArgs=[]) {

  formData = new FormData();
  size = Math.min(Math.max(size, 1), 100);
  formData.append('size', size);
  formData.append('caption', clean_str(caption));
  formData.append('file', blob, 'modified.png');

  $.post({
    url: '/images/upload',
    data: formData,
    processData: false,
    contentType: false,
    enctype: 'multipart/form-data',
    success: function (data) {
      uploadedFigureID = data.toString();
      $( document ).trigger( eventString, [uploadedFigureID, caption, size].concat(eventArgs));
      success('Successfully uploaded image');
    },
    error: function (data) {
      error('Failed to upload image');
    },
  });
}

/*
Class which handles every step of the upload process,
including cropping, annotating, and scaling.

HOW TO USE
==========

  1. Create a new ImageUploader object

    imageUploader = new ImageUploader();

  2. Listen for its "successEvent"

    $( document ).on(ImageUploader.inlineSuccessEvent, function(e, figureID, caption, size) {
      var figureString = `{${figureID}|${size}|${caption}}`;
      console.log(figureString);
    })

  3. Start the upload process

    imageUploader.select();

*/
class ImageUploader {

  static selectionEvent = 'imageSelectionEvent';
  static uploadEvent = 'imageUploadEvent';
  static successEvent = 'imageUploadSuccessEvent';
  static editSuccessEvent = 'imageEditSuccessEvent';
  static inlineSuccessEvent = 'imageInlineUploadSuccessEvent';
  static readyEvent = 'imageUploaderReadyEvent';
  static editReadyEvent = 'imageUploaderEditReadyEvent';

  constructor(inline=true, editing=false, eventArgs=[]) {

    this.file = null;
    this.cropper = null;
    this.marker = null;
    this.size = 100;
    this.caption = '';
    this.filename = null;
    this.savedImageStyle = '';
    this.modalsLoaded = 0;

    // whether or not the image is being inserted in markdown
    this.inline = inline;

    // if we're just editing and not uploading
    this.editing = editing;

    // arguments which are added onto the final success event
    this.eventArgs = eventArgs;

    this.load_events();
    this.load_modals();

    console.log(this);

  }


  // Start the upload process
  // Note: this fucky function definition syntax allows
  // class methods to be used as event handlers
  // so "this" isn't squashed by the event variable
  start = (e, file) => {

    this.file = file;
    this.filename = file.name;

    // reset the input
    $('#figure-input').attr('value', '');
    this.cropper_load();

  }


  // opens a file chooser for this ImageUploader instance
  select = e => {

    ImageUploader.selectImage(ImageUploader.selectionEvent);

  }


  edit = (src, caption, size) => {

    console.log('edit()');
    this.modalsLoaded = 0;

    $('#figure-source').attr('src', src);

    this.size = size;
    this.caption = caption;
    this.scaler_load();
    $('.load-annotate-modal').hide();
    $('.figureSave').off().click(e => {
      var caption = $('#imageCaptionInput').val();

      // move picture back to crop modal
      $('#figure-source').appendTo($('#crop-img'));
      $( document ).trigger(ImageUploader.editSuccessEvent, [null, this.caption, this.size].concat(this.eventArgs));
    })

  }


  // opens file chooser and triggers event with file blob
  static selectImage(eventString='figureSelected') {

    $('body #fileUploadTemp').remove();
    $('body').append('<input type="file" accept="image/png, image/jpeg" id="fileUploadTemp" style="display: none" />');
    
    $('#fileUploadTemp').change(function(e) {
      if (e.target.files.length) {
        var reader = new FileReader();
        var file = e.target.files[0];
        reader.onload = function (e) {
          $( document ).trigger(eventString, [file]);
          $('#figure-source').attr('src', reader.result);
        };
        reader.readAsDataURL(file);
      }
    })

    $('#fileUploadTemp').click();

  }


  marker_create = e => {

    this.marker_destroy()
    //console.log(document.getElementById('annotate-img'));
    this.marker = new markerjs.MarkerArea(
      document.getElementById('figure-source'),
      {
        targetRoot: document.getElementById('annotate-img')
      }
    );
    this.marker.show(
      (dataUrl) => {
        $('#figure-source').attr('src', dataUrl);
      }
    )

    // click the "ok" button when "Apply" is clicked
    $('.apply-annotation').off().click(function() {
      $('.markerjs-toolbar-button[title="OK"]').click();
    })

    // disable scroll
    $('body').addClass('disable-scroll');

  }


  marker_destroy = e => {

    console.log('marker_destroy()');
    try {
    this.marker.close();
    } catch(e) {}
    this.marker = null;

  }


  cropper_crop = e => {

    if (this.cropper) {
      var canvas = this.cropper.getCroppedCanvas({
        minWidth: 500
      })
      //var initialfigureURL = ('#figure-destination').attr('src');
      $('#figure-source').attr('src', canvas.toDataURL());
    }
    this.cropper_destroy();

  }


  cropper_destroy = e => {

    console.log('cropper_destroy()');
    try {
      this.cropper.destroy();
    } catch(e) {}
    this.cropper = null;
    $('#figure-source').attr('width', this.size + '%');

  }


  load_modals = e => {

    console.log('load_modals()');

    loadModal('imageCropper');
    loadModal('imageAnnotator');
    loadModal('imageSlider');

  }


  /* preps a modal once it's been loaded by binding .click() listeners, etc. */
  prep_modal = (e, modal) => {

    console.log('prep_modal()');

    $('.load-annotate-modal').off().click(this.marker_load);
    $('.load-crop-modal').off().click(this.cropper_load);
    $('.load-scale-modal').off().click(this.scaler_load);

    if (!this.editing) {
      $('.figureSave').off().click(function () {
        $( document ).trigger(ImageUploader.uploadEvent);
        $('.modal').modal('hide');
      });
    }

    $('.crop-figure').off().click(this.cropper_crop);

    this.modalsLoaded += 1;
    if (this.modalsLoaded >= 3) {
      var readyEvent = '';
      if (this.editing) {
        readyEvent = ImageUploader.editReadyEvent;
      } else {
        readyEvent = ImageUploader.readyEvent;
      }
      $( document ).trigger(readyEvent);
    }

    // destroy cropper when crop modal is hidden
    $( '#imageCropper-modal' ).off('hidden.bs.modal');
    $( '#imageCropper-modal' ).on('hidden.bs.modal', this.cropper_destroy);

    // destroy marker.js when annotation modal is hidden
    $( '#imageAnnotator-modal' ).off('hidden.bs.modal');
    $( '#imageAnnotator-modal' ).on('hidden.bs.modal', this.marker_destroy);

    // clear the input image when any modal is hidden
    $( document ).on('hidden.bs.modal', function() {
      // reset figure input (prevents bug where modals won't open after being closed once)
      // note: this only happens when the selected file is the same as the previous selection
      $('#figure-input').val('');

      // enable scrolling
      $('body').removeClass('disable-scroll');

    });

  }

  marker_load = e => {
    console.log('marker_load()');
    // disable scrolling

    this.cropper_destroy();
    this.marker_destroy();
    $('#annotate-img').empty();
    $('#figure-source').appendTo($('#annotate-img'));
    $('#figure-source').show();

    $('.modal').modal('hide');
    $('#imageAnnotator-modal').on('shown.bs.modal', this.marker_create);
    $('#imageAnnotator-modal').modal('show');
    if (this.savedImageStyle) {
      $('#figure-source').attr('style', this.savedImageStyle);
    }
  }


  cropper_create = e => {

    console.log('cropper_create()');
    this.cropper_destroy();
    this.marker_destroy();
    //$('#figure-source').attr('width', '100%');
    this.cropper = new Cropper(document.getElementById('figure-source'), {
      viewMode: 2,
      autoCropArea: 1,
    })

  }


  cropper_load = e => {
    console.log('cropper_load()');
    $('.modal').modal('hide');
    this.cropper_destroy();
    this.marker_destroy();
    $('#figure-source').appendTo($('#crop-img'));
    $('#imageCropper-modal').on('shown.bs.modal', this.cropper_create);
    $('#imageCropper-modal').modal('show');
    if (this.savedImageStyle) {
      $('#figure-source').attr('style', this.savedImageStyle);
    }
  }

  scaler_load = e => {

    console.log('scaler_load()');

    // temporarily set style to allow for resizing
    this.savedImageStyle = $('#figure-source').attr('style');
    $('#figure-source').attr('style', '')

    // update caption and size to match current values
    $('#imageCaptionInput').val(this.caption);
    $('#imageSizeSlider').val(this.size);

    $('.modal').modal('hide');
    this.cropper_destroy();
    this.marker_destroy();
    $('#figure-source').appendTo($('#scale-img'));
    $('#imageSlider-modal').modal('show');

    var updateSize = e => {
      try {
        var sizeValue = $('#imageSizeSlider').val().toString();
      } catch(e) {
        var sizeValue = '100';
      }
      $('#figure-source').attr('width', sizeValue.toString() + '%');
      $('#imageSizeSliderLabel').html(`Image width: ${sizeValue}%`);
      this.size = parseInt(sizeValue);
    }

    var updateCaption = e => {
      var caption = clean_str($('#imageCaptionInput').val());
      this.caption = caption;
      $('#figureCaptionExample').text(caption);
    }

    // set up the image size slider
    $('#imageSizeSlider').on('input', updateSize);
    $('#imageCaptionInput').on('input', updateCaption);
    if (!(this.caption)) {
      $('#imageCaptionInput').val(this.filename);
    }
    updateSize();
    updateCaption();
  }

  uploadFile = e => {

    console.log('uploadEvent');

    $('.modal').modal('hide');

    var successEvent = '';

    if (this.inline) {
      successEvent = ImageUploader.inlineSuccessEvent;
    } else {
      successEvent = ImageUploader.successEvent;
    }

    var b64str = $('#figure-source').attr('src');
    fetch(b64str)
    .then(res => res.blob())
    .then(blob => uploadImage(blob, this.size, this.caption, successEvent, this.eventArgs));

  }


  load_events = e => {

    /* when an image is selected */
    $( document ).off(ImageUploader.selectionEvent);
    $( document ).on(ImageUploader.selectionEvent, (e, file) => this.start(e, file));

    /* when an image is ready to be uploaded */
    $( document ).off(ImageUploader.uploadEvent);
    $( document ).on(ImageUploader.uploadEvent, this.uploadFile);

    /* when our modals are loaded */
    $( document ).off('modalLoaded-imageCropper');
    $( document ).off('modalLoaded-imageAnnotator');
    $( document ).off('modalLoaded-imageSlider');
    $( document ).on('modalLoaded-imageCropper', this.prep_modal);
    $( document ).on('modalLoaded-imageAnnotator', this.prep_modal);
    $( document ).on('modalLoaded-imageSlider', this.prep_modal);

  }

}