$(document).ready(function() {

  // Table Filtering
  var status = $('input[name="status"]:checked');
  console.log("status:" + status);

  // Custom range filtering function
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    statusValue = $("input[name='status']:checked").val();
    console.log("status value: " + statusValue);
    var itemActive = data[4]; // use data for the active status column

    if (statusValue == "inactive") {
      return itemActive == "inactive";
    } else if (statusValue == "active") {
      return itemActive == "active";
    } else if ( statusValue == "draft") {
      return itemActive == "draft";
    }

    return true;
  });
  
  var table = $('#reports').DataTable();
  
  // Bind the change event handler
  $('#status-radio').change(function() {
      table.draw();
      console.log("status change detevted.")
  });
  
  // Trigger the change event to set the filter active by default
  $('#status-radio').trigger('change');

})
