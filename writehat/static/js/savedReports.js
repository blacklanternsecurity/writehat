$(document).ready(function() {

  // Table Filtering
  var actvToggle = $('#filterActiveToggle');

  // Custom range filtering function
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
      var isActv = actvToggle.prop('checked');
      var itemActive = data[4]; // use data for the active status column
  
      if (isActv) {
          return itemActive == "True";
      } else {
          return true;
      }
  });
  
  var table = $('#reports').DataTable();
  
  // Bind the change event handler
  actvToggle.change(function() {
      table.draw();
  });
  
  // Trigger the change event to set the filter active by default
  actvToggle.trigger('change');

})
