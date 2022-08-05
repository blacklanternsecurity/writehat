$(document).on('paneLoaded-categoryBrowse', function(e, paneDiv) {
  $('.categoryEdit').click(function(e) {
    var category = $(e.currentTarget).closest('.category');
    var categoryID = category.attr('category-id');
    var categoryName = category.attr('category-name');
    var categoryParent = category.parent().closest('.category').attr('category-id');
    var categoryEditModal = $('#categoryEdit-modal');
    categoryEditModal.find('[name="categoryAddName"').val(categoryName);
    categoryEditModal.find('[name="categoryAddID"').val(categoryParent);
    $('.selectpicker').selectpicker('refresh');
    $('#categoryEdit-modal').attr('category-id', categoryID);
    $('#categoryEdit-modal').modal('show');
  })
})

$(document).on('modalLoaded-categoryEdit', function(e, modalDiv) {

  $('.selectpicker').selectpicker();

  $('#categoryEditSave').click(function() {
    var newCategoryID = $('#categoryEdit-modal').attr('category-id');
    var newCategoryName = $('#id_edit_categoryAddName').val();
    var newCategoryParent = $('#categoryEdit-modal select[id="id_categoryAddID"]').val();
    $.ajax({
      url: `/findings/category/edit/${newCategoryID}`,
      type: 'POST',
      data: {
        'categoryName': newCategoryName,
        'categoryParent': newCategoryParent
      },
      success: function(data) {
        refreshCategories();
        success('Category saved successfully');
        $('#categoryEdit-modal').modal('hide');
      },
      error: function(data) {
        error('Error saving category: ' + data.responseText);
      }
    })
  })

  $('#categoryEditDelete').click(function() {
    var categoryID = $('#categoryEdit-modal').attr('category-id');

    $.ajax({
      url: `/findings/category/delete/${categoryID}`,
      type: 'POST',
      success: function(data) {
        success('Category deleted successfully');
        refreshCategories();
        $('#categoryEdit-modal').modal('hide');
      },
      error: function(data) {
        let msg = 'Failed to delete category'
        if (data.responseText !== null)
          msg = `${msg}: ${data.responseText}`
        error(msg)
      }
    })
  })

})

$(document).on('modalLoaded-categoryAdd', function(e, modalDiv) {

  $('.selectpicker').selectpicker();

  // when a new category is added
  $('#categoryAddSave').click(function() {

    var newCategoryName = $('#id_categoryAddName').val();
    var newCategoryParent = $('#id_categoryAddID').val();
    var NewCategoryParentName = $("button[data-id='id_categoryAddID']").find('.filter-option-inner-inner').text();
    if (NewCategoryParentName == 'Nothing Selected') {
      NewCategoryParentName = ''
    } else {
      newCategoryParentName = NewCategoryParentName + ' -> ';
    }

    // don't do anything if there's no name
    if (! newCategoryName.length ) 
    {
      error('Please specify a category name');
      return;
    }

    $.ajax({
      url: '/findings/category/add', 
      type: 'POST',
      data: {
        'categoryName': newCategoryName,
        'categoryParent': newCategoryParent
      },
      success: function(data) {
        refreshCategories(data,newCategoryName,newCategoryParentName);
        $('#categoryAdd-modal').modal('hide');
        success('Category added successfully');
      },
      error: function(data) {
        error('Failed to save category: ' + data.responseText);
      }
    });
  });
})


// refresh the category list
// optionally pass in a newly created category
function refreshCategories(categoryID='',newCategoryName='',newCategoryParentName='') {

  if (window.location.pathname == '/findings') {
    loadPane('categoryBrowse','fullPane');
  }

  loadModal('categoryAdd', function() {
    $('#id_categoryAddName').val("");
    $('#id_categoryAddID').val("");
    $('.selectpicker').selectpicker('refresh');
  })

  if (categoryID.length && newCategoryName.length) {
    $('#id_categoryID').prepend('<option value="' + categoryID + '">' + newCategoryParentName + newCategoryName + '</option>');
    $('#id_categoryID').val(categoryID);
    $('.selectpicker').selectpicker('refresh');
  }
}


function showFinding(f) {
  var finding = $(f);
  finding.show();
  finding.addClass('SHOW');
}

function hideFinding(f) {
  var finding = $(f);
  finding.hide();
  finding.removeClass('SHOW');
}

function showCategory(c, children=false) {
  var category = $(c);
  var dataTarget = $(category.find('div[data-target]').attr('data-target'));
  category.show();
  // expand the category if it's collapsed
  category.attr('aria-expanded', 'true');
  dataTarget.addClass('show');

  if (children) {
    // show all contained findings
    category.find('.findingItem').each(function() {
      showFinding(this);
    })
    // show all contained categories
    category.find('.category').each(function() {
      showCategory(this, children=true);
    })
  }
}

function hideCategory(c) {
  var category = $(c);
  var dataTarget = $(category.find('div[data-target]').attr('data-target'));
  category.hide();
  category.attr('aria-expanded', 'false');
}


function searchFindings() {
  var searchField = $(this);
  var searchTerm = $(this).val().toLowerCase();

  // hide or show matching findings
  $('.findingItem').each(function() {
    var finding = $(this);
    var findingName = finding.attr('finding-name').toLowerCase();
    if (findingName.includes(searchTerm) | searchTerm.length == 0) {
      showFinding(finding);
    } else {
      hideFinding(finding);
    }
  });

  // hide or show matching categories
  $('.category').each(function() {
    var category = $(this);
    var dataTarget = $(category.find('div[data-target]').attr('data-target'));
    var categoryName = category.attr('category-name').toLowerCase();
    if (categoryName.includes(searchTerm) | searchTerm.length == 0) {
      showCategory(category, children=true);
    }
    // expand a category if it has matching findings
    var visibleFindings = dataTarget.find('.findingItem.SHOW');
    if (!(visibleFindings.length == 0) | searchTerm.length == 0) {
      showCategory(category);
    }
  });

  // hide empty categories
  $('.category').each(function() {
    var category = $(this);
    var dataTarget = $(category.find('div[data-target]').attr('data-target'));
    var visibleFindings = dataTarget.find('.findingItem.SHOW');
    if ((visibleFindings.length == 0) & searchTerm.length > 0) {
      hideCategory(category);
    }
  });

}


$(document).ready(function() {

  $('.categoryAddButton').off().click(function() {
    $('#categoryAdd-modal').modal('show');
  })

  loadModal('categoryAdd');

  if (window.location.pathname == '/findings') {

    // load necessary panes and modals
    loadPane('categoryBrowse', 'fullPane');
    loadModal('categoryEdit');

    // client-side search feature
    $('#searchFindings').keyup(searchFindings);
  }
})
