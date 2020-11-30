
//not used at the momement, might need it later
/*
function downloadFileFromText(content) {
    var a = document.createElement('a');
    var blob = new Blob([content], {type : "text/plain;charset=UTF-8"});
    a.href = window.URL.createObjectURL(blob);
    a.download = 'test.json'
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click(); //this is probably the key - simulating a click on a download link
    delete a;// we don't need this anymore
}
*/



$(document).on('click', '#saveToBackup', function(){

   window.open('/admintools/backup');
   // $.post({
   // url: '/admintools/backup',
  //  success: function(response) {
 //   alert('download');
 //   },
 // });
})


$('#backup').click(function(e){
loadModal('adminBackup', function(adminBackupModal) {
  adminBackupModal.modal('show'); 
  });
})


$('#restorefromBackup').click(function(e){
loadModal('adminRestore', function(adminRestoreModal) {
  var challenge1;
  var challenge2;
  adminRestoreModal.modal('show'); 
  });
})


$(document).on('click', '#restoreFromBackupFake', function(){
  challenge1 = Math.floor(Math.random() * 11);
  challenge2 = Math.floor(Math.random() * 11);
  var challenge = "Please type the result of adding: " + challenge1 + " to: " + challenge2;
  $('#answer').html("");
  $('#warningDiv').hide();
  $('#restoreFromBackupFake').hide()
  $('#challengeDiv2').text(challenge);
  $('#challengeDiv1').removeClass("d-none");
  $('#challengeDiv2').removeClass("d-none");
  $('#challengeDiv3').removeClass("d-none");
})


$(document).on('click', '#challengeButton', function(){
    if (parseInt($('#answer').val()) === (challenge1 + challenge2))
    {
    	$('#backupUpload').removeClass("d-none");
      $('#restoreFromBackupReal').removeClass("d-none");
        
    }
    else
    {
    	error("You shouldn't be doing this right now!")
    }
 
})


$(document).on('click', '#restoreFromBackupReal', function(){


    $('#backupUpload').addClass("d-none");
    $('#restoreFromBackupReal').addClass("d-none");
    $('#inProgressDiv').removeClass("d-none");

    var formData = new FormData();
    formData.append('file', $('#backupUpload')[0].files[0]);

    $.ajax({
       url : '/admintools/restore',
       type : 'POST',
       data : formData,
       processData: false,  // tell jQuery not to process the data
       contentType: false,  // tell jQuery not to set contentType
       success: function(data) {
         success('Restore successful!');
         $('#adminRestore-modal').hide()
        
        
        // refresh the findings view if we're on the findings page
      //  if ( window.location.href.endsWith('/findings') ) {
    //      loadPane('categoryBrowse', 'fullPane');
          // empty out the form
    //      $('#id_name').empty();
    //      $('#id_category').empty();
      },
      error: function(data) {
      $('#adminRestore-modal').hide();
      error('Restore FAILED: ' + data.responseText);
     }});
})
