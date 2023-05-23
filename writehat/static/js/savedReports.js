$(document).ready(function() {

  // Toggle filtering by active reports
  function filterRowsByActive(isActive) {
    $('.report-row').each(function() {
      if (isActive) {
        if (!$(this).data('isActive')) {
          $(this).hide();
        } else {
          $(this).show();
        }
      } else {
        $(this).show();
      }
    });
  }

  // Toggle filtering by active reports
  var isActiveToggle = $('#isActiveToggle');
  
  isActiveToggle.change(function() {
    var isActive = $(this).prop('checked');
    filterRowsByActive(isActive);
  });
    
  // Call the filterRowsByActive function on page load
  var isActiveInitially = isActiveToggle.prop('checked');
  filterRowsByActive(isActiveInitially);

})
