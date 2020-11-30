function checkboxPrep() {

  // parent must be a string representing a class or id, such as "#findingSelect-modal"
  // parent must also be a table

  // when 'all' (checkbox in header) is checked, select all
  $('table.writehat-form thead div.custom-checkbox > label.custom-control-label').click(function(e) {
    var checkbox = $(this).closest('div').find('input');
    var checked = !checkbox.prop('checked');
    checkbox.prop('checked', checked);
    $(e.currentTarget).closest('table').find('tbody div.custom-checkbox > input').prop('checked', checked);
  })

  // update the "all" checkbox
  $('div.custom-checkbox > input').click(checkboxUpdateAll);
  checkboxUpdateAll();

}


function checkboxUpdateAll() {

  $(document).find('table.writehat-form').each(function(i, parentForm) {

    var parentForm = $(parentForm);

    // update the "all" checkbox
    var all_checked = true;
    parentForm.find('tbody div.custom-checkbox > input').each(function() {
      var checked = $(this).prop('checked');
      if (!(checked)) {
        all_checked = false;
      }
    })

    if (all_checked) {
      parentForm.find('thead div.custom-checkbox > input').prop('checked', true);
    } else {
      parentForm.find('thead div.custom-checkbox > input').prop('checked', false);
    }

  })
}