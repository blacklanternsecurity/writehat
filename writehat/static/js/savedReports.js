function saveState() {
  console.log("SAVED");
  var status = {};
  $(".btn-save-state").each(function() {
    status[$(this).attr("id")] = $(this).prop("checked");
  });
  localStorage.setItem("status", JSON.stringify(status));
}

$(document).ready(function() {

  if (localStorage.getItem("status")) {
    var savedStatus = JSON.parse(localStorage.getItem("status"));
    if (savedStatus) {
      $(".btn-save-state").each(function() {
        var id = $(this).attr("id");
        if (savedStatus.hasOwnProperty(id)) {
          $(this).prop("checked", savedStatus[id]);
          $(this).closest("label").toggleClass("active", savedStatus[id]);
        }
      });
    }
  }

  // Custom range filtering function
  $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
    var itemStatus = data[4];
    return $(`input[name='status'][value='${itemStatus}']:checked`).length === 1;
  });
  
  var table = $('#reports').DataTable();
  
  // Bind the change event handler
  $('#status-radio').change(function() {
    saveState();
      table.draw();
  });
  
  // Trigger the change event to set the filter active by default
  $('#status-radio').trigger('change');

});