
/*** MARKDOWN EDITOR ***/

// markdown editor toolbar config
var default_toolbar_icons = [
  'bold',
  'italic',
  '|',
  'unordered-list',
  'ordered-list',
  {
    name: 'codeblock',
    action: function(editor) {
      var selections = editor.codemirror.getSelections();
      var highlighted = [];
      for (var i = 0; i < selections.length; i++) {
        highlighted.push('\n```\n\n```\n');
      }
      editor.codemirror.replaceSelections(highlighted);
    },
    className: 'fa fa-code',
    title: 'Code Block'
  },
  {
    name: 'pagebreak',
    action: function(editor) {
      var selections = editor.codemirror.getSelections();
      var highlighted = [];
      for (var i = 0; i < selections.length; i++) {
        highlighted.push('<div class="page-break"></div>');
      }
      editor.codemirror.replaceSelections(highlighted);
    },
    className: 'fa fa-window-minimize',
    title: 'Page Break'
  },
  {
    name: 'footnote',
    action: function(editor) {
      var selections = editor.codemirror.getSelections();
      var highlighted = [];
      for (var i = 0; i < selections.length; i++) {
        highlighted.push('{footnote|}');
      }
      editor.codemirror.replaceSelections(highlighted);
    },
    className: 'fa fa-sticky-note',
    title: 'Footnote'
  },
  '|',
  {
    name: 'reference',
    action: addReportLinks,
    className: 'fa fa-link',
    title: 'Link to Finding or Component'
  },
  {
    name: 'newImageUpload',
    action: function(editor) {

      imageUploader = new ImageUploader();

      if (typeof inlineSuccessEventListener == 'undefined') {
        inlineSuccessEventListener = true;
        $( document ).on(ImageUploader.inlineSuccessEvent, function(e, figureID, caption, size) {
          console.log('inlineSuccessEvent');
          var figureString = `\n\n{${figureID}|${size}|${caption}}\n\n`;
          editor.codemirror.replaceSelection(figureString);
        })
      }

      imageUploader.select();
    },
    className: 'fa fa-picture-o',
    title: 'Insert Image'
  },
  'table',
  '|',
  {
    name: 'purple',
    action: highlightPurple,
    className: 'fa fa-exclamation purple',
    title: 'Highlight Purple',
  },
  {
    name: 'pink',
    action: highlightPink,
    className: 'fa fa-exclamation pink',
    title: 'Highlight Pink',
  },
  {
    name: 'red',
    action: highlightRed,
    className: 'fa fa-exclamation red',
    title: 'Highlight Red',
  },
  {
    name: 'orange',
    action: highlightOrange,
    className: 'fa fa-exclamation orange',
    title: 'Highlight Orange',
  },
  {
    name: 'yellow',
    action: highlightYellow,
    className: 'fa fa-exclamation yellow',
    title: 'Highlight Yellow',
  },
  {
    name: 'green',
    action: highlightGreen,
    className: 'fa fa-exclamation green',
    title: 'Highlight Green',
  },
  {
    name: 'blue',
    action: highlightBlue,
    className: 'fa fa-exclamation blue',
    title: 'Highlight Blue',
  },
  {
    name: 'gray',
    action: highlightGray,
    className: 'fa fa-exclamation gray',
    title: 'Highlight Gray',
  },
  {
    name: 'mono',
    action: highlightMono,
    className: 'fa fa-exclamation text-white',
    title: 'Monospace',
  },
  '|',
  'preview',
  '|',
  {
    name: 'track-changes',
    action: trackChanges,
    className: 'fa fa-code-branch',
    title: 'Track Changes'
  },

  //'side-by-side',
  //'fullscreen',
]




/* CHANGE TRACKING FUNCTIONS */

/* identify which component or findings / field is being accessed */
function trackChangesIdentify(parentElement)
{
    // determine if we are in a component or finding
    if (window.location.pathname.includes('/components'))
    {
       var isComponent = true;
       var trackID = window.location.pathname.split("/")[2];
       var trackField = 'text';
    }
    else
    {
      
       var isComponent = false;
       var trackID = window.location.pathname.split("/").slice(-1)[0];
       var trackField = parentElement.name;
    }
    return [trackID,isComponent,trackField]
}

function loadInEditor(version,fieldName,editor,trackChangesModal){

    promptModal(
      confirm_callback=function(e) {
        editor.codemirror.setValue($("#trackChangeActual").text());
        trackChangesModal.modal('hide');
      },
      title='Load in editor?',
      body=`Are you sure you want to load Revision ${version} of field **${fieldName}** into the editor? Unsaved contents will be lost!`,
      leftButtonName='Cancel',
      rightButtonName='Load in Editor',
      danger=true
    );

}


function diff2HtmlGenerate(unifiedDiff){
  var diffHtml = Diff2Html.html(unifiedDiff,{drawFileList: false, matching: 'words', outputFormat: 'line-by-line',});
  var jHtmlObject = jQuery(diffHtml);
  jHtmlObject.find(".d2h-file-header").remove();
  var diffHtmlNew = jHtmlObject.html();
  return diffHtmlNew
}

function trackChangesAjax(editor,id,currentText,isComponent,fieldName,fromVersion,toVersion){

    $.ajax({
    url: `/revisions/compare`,
    type: 'POST',
    data: {
      'uuid': id,
      'currentText': currentText,
      'isComponent': isComponent,
      'fieldName': fieldName,
      'fromVersion': fromVersion,
      'toVersion': toVersion,
    },
    success: function(data) {
      //$('#trackChangeViewer').html(diff2HtmlGenerate(data));
      var fromText = atob(data.fromText.replace(/_/g, '/').replace(/-/g, '+'));
      var unifiedDiff = atob(data.unifiedDiff.replace(/_/g, '/').replace(/-/g, '+'));
      $('#diff2html').html(diff2HtmlGenerate(unifiedDiff));
      var currentUser = $.trim($('.nav-username').text());

      if (fromVersion == "-1"){
        $('#owningUserLeft').text("Modified by: " + currentUser);  
      }
      else{
        $('#owningUserLeft').text("Modified by: " + $("#trackChangeCompareFrom option:selected" ).attr("data-owner"));
      }
 

      if (toVersion == "-1"){
        $('#owningUserRight').text("Modified by: " + currentUser);
      }
      else{
        $('#owningUserRight').text("Modified by: " + $("#trackChangeCompareTo option:selected" ).attr("data-owner"));
      }
      
      $("#trackChangeActual").text(fromText);
    },
    error: function(data) {
      error('Error loading revisions: ' + data.responseText);
    }
  })
}

function populateDropDown(data){
  //var array = JSON.parse(JSON.stringify(data));

  $('.trackChangeVersion').empty();
  $('#trackChangeCompareFrom').append('<option value="-1">Current Text</option>');
  $('#trackChangeCompareTo').append('<option value="-1">Current Text</option>');
  Object.keys(data).slice().reverse().forEach(function(key){
      $('.trackChangeVersion').append(`<option value="${key}" data-owner="${data[key][1]}">Revision ${key} (${data[key][0]})</option>`);
  });
  $('.selectpicker').selectpicker();
}

function populateTextViewer(editor){
    $("#trackChangeActual").text(editor.codemirror.getValue());
}


function trackChanges(editor){
  var parentElement = editor.codemirror.getWrapperElement().closest('td').children[0];
  trackArray = trackChangesIdentify(parentElement);
  loadModal('trackChanges', function(trackChangesModal) {

    $.ajax({
    url: `/revisions/list`,
    type: 'POST',
    data: {
      'uuid': trackArray[0],
      'isComponent': trackArray[1],
      'field': trackArray[2],
    },
    success: function(data) {
      populateDropDown(data);
      populateTextViewer(editor);
      trackChangesModal.modal('show');
      $('#cancelTrackChanges').off().click(function() {
        trackChangesModal.modal('hide');
      })
      $('#loadInEditor').off().click(function() {
        loadInEditor(version=$('#trackChangeCompareFrom').val(),fieldName=trackArray[2],editor=editor,trackChangesModal=trackChangesModal);
      })


      $( ".trackChangeVersion" ).change(function() {
      
          trackChangesAjax(editor,trackArray[0],editor.codemirror.getValue(),trackArray[1],trackArray[2],$('#trackChangeCompareFrom').val(),$('#trackChangeCompareTo').val());
        
      });
      
    },
    error: function(data) {
      error('Error loading revisions: ' + data.responseText);
    }
  })

    

   

  })
}

/* HIGHLIGHTING FUNCTIONS */

function highlightMarkdown(editor, color) {
  var selections = editor.codemirror.getSelections();
  var highlighted = [];
  for (var i = 0; i < selections.length; i++) {
    highlighted.push(`<hl ${color}>${selections[i]}</hl>`);
  }
  editor.codemirror.replaceSelections(highlighted);
}
function highlightPurple(editor) {
  highlightMarkdown(editor, 'purple');
}
function highlightPink(editor) {
  highlightMarkdown(editor, 'pink');
}
function highlightRed(editor) {
  highlightMarkdown(editor, 'red');
}
function highlightOrange(editor) {
  highlightMarkdown(editor, 'orange');
}
function highlightYellow(editor) {
  highlightMarkdown(editor, 'yellow');
}
function highlightGreen(editor) {
  highlightMarkdown(editor, 'green');
}
function highlightBlue(editor) {
  highlightMarkdown(editor, 'blue');
}
function highlightGray(editor) {
  highlightMarkdown(editor, 'gray');
}
function highlightMono(editor) {
  highlightMarkdown(editor, 'mono');
}


// 'todo' marker handling
function checkTodoMarker(elem) {
  var value = elem.getValue();
  var editor = elem.getTextArea();
  var label = $(editor).parent().siblings("th").children("label");
  var regex = /\{\s{0,2}todo(\|[^}]+)?\s{0,2}\}/i;
  console.log(value.match(regex));
  if (value.match(regex)) {
    label.addClass("todo");
  } else {
    label.removeClass("todo");
  }
}

/* searches for textareas and turns them into markdown editors */
function loadMarkdown() {

  if (!($('textarea[mde]').length)) {
    $('textarea:visible').not('[mde]').each(function() {
      $(this).attr('mde', true);
      console.log('creating markdown editor');

      // create editor in the current textarea
      const simplemde = new SimpleMDE({ 
        element: this,
        forceSync: true,
        showIcons: [
          'table',
        ],
        autoDownloadFontAwesome: true,
        // toolbar
        toolbar: default_toolbar_icons,
      })
      // set the theme
      simplemde.codemirror.setOption("theme", "monokai");
      simplemde.codemirror.options.extraKeys['Tab'] = false;
      simplemde.codemirror.options.extraKeys['Shift-Tab'] = false;

      simplemde.codemirror.on("blur", (elem => checkTodoMarker(elem)));
      checkTodoMarker(simplemde.codemirror);
    })
  }

  // hide toolbar
  $('.editor-toolbar').hide();
  $('.CodeMirror').focusin(function(e) {
    // hide editor toolbars by default
    $('.editor-toolbar').hide();
    $(e.currentTarget).prev('.editor-toolbar').show();
  });

}


/* ADDING REFERENCES, ETC */

function addReportLinks(editor) {

  loadModal('referenceSelect', function(referenceSelectModal) {

    referenceSelectModal.modal('show');

    $('.userTemplateInsertButton').off().click(function() {
      var keyword = $(this).text();
      editor.codemirror.replaceSelection(`{ ${keyword} }`);
    })

    // component
    $('#componentReferenceSelect').off().click(function() {
      referenceSelectModal.modal('hide');
      loadModal('componentSelect', function(componentSelectModal) {
        componentSelectModal.modal('show');
        checkboxPrep();
        $('#componentSelectSaveButton').off().click(function() {
          var references = [];
          $('#componentSelect-modal table tr .custom-checkbox input.custom-control-input').each(function() {;
            if ($(this).prop('checked')) {
              var componentID = $(this).closest('tr').attr('component-id');
              if (componentID) {
                references.push(`{component|${componentID}|index,name}`);
              }
            }
          })
          componentSelectModal.modal('hide');
          editor.codemirror.replaceSelection(references.join(','));
        });
      });
    })

    // finding
    $('#findingReferenceSelect').off().click(function() {
      referenceSelectModal.modal('hide');
      loadModal('findingSelect', function(findingSelectModal) {
        findingSelectModal.modal('show');
        checkboxPrep();
        $('#findingSelectSaveButton').off().click(function() {
          var references = [];
          $('#findingSelect-modal table tr .custom-checkbox input.custom-control-input').each(function() {;
            if ($(this).prop('checked')) {
              var findingID = $(this).closest('tr').attr('finding-id');
              if (findingID) {
                references.push(`{finding|${findingID}|number,name,severity}`);
              }
            }
          })
          console.log(references);
          findingSelectModal.modal('hide');
          editor.codemirror.replaceSelection(references.join(','));
        });
      });
    })

  })
}
