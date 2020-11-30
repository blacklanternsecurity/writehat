
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
  '|',
  'preview',
  //'side-by-side',
  //'fullscreen',
]

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