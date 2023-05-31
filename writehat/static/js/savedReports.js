$(document).ready(function() {

  // Table Filtering
  var status = $('input[name="status"]:checked');

  // Custom range filtering function
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    var statusValue = new Array();
    $.each($("input[name='status']:checked"), function() {
      statusValue.push($(this).val());
    });

    var itemActive = data[4]; // use data for the active status column

    if (statusValue.includes(itemActive)) { return true; }

    return false;
  });
  
  var table = $('#reports').DataTable();
  
  // Bind the change event handler
  $('#status-radio').change(function() {
      table.draw();
  });
  
  // Trigger the change event to set the filter active by default
  $('#status-radio').trigger('change');

});