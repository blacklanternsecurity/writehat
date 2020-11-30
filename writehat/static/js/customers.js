function refreshCustomers(customerID, customerName) {
  $('#id_customerID').prepend(`<option value="${customerID}">${customerName}</option>`);
  $('#id_customerID').val(customerID);
  $('.selectpicker').selectpicker('refresh');
}

function setCustomerID() {
  var customerID = $('#engagement-info').attr('customer-id');
  $('.selectpicker[name=customerID]').val(customerID);
  $('.selectpicker').selectpicker('refresh')
}


$(document).on('modalLoaded', function() {
  $('#customerAdd,.customerAddButton').off().click(function() {
    loadModal('customerAdd');
  })
})

function deleteCustomer(customerID, customerName) {
  promptModal(
    confirm_callback=function(e) {
      $.post({
        url: `/customers/${customerID}/delete`,
        success: function() {
          successRedirect(`/customers`, 'Customer successfully deleted');
        },
        error: function(data) {
          error('Failed to delete customer');
        }
      })
    },
    title='Delete Customer?',
    body=`Are you sure you want to delete **${customerName}** and all of its reports and findings?`,
    leftButtonName='Cancel',
    rightButtonName='Delete Customer',
    danger=true
  )
}


$(document).on('modalLoaded-customerAdd', function(e, modalDiv) {

  $('#customerAdd-modal').modal('show');
  $('.selectpicker').selectpicker();

  // when a new customer is added
  $('#customerAddSave').click(function() {

    var formData = modalDiv.find('form');
    var customerName = formData.find('input[name="name"]').val();

    // don't do anything if there's no name
    if (! customerName.length ) 
    {
      error('Please specify a customer name');
      return;
    }

    $.post({
      url: '/customers/create', 
      data: $(formData).serialize(),
      success: function(customerID) {
        refreshCustomers(customerID, customerName);
        $('#customerAdd-modal').modal('hide');
        success('Customer added successfully');
      },
      error: function(data) {
        error('Failed to create customer: ' + data.responseText);
      }
    });
  });
})


$(document).ready(function() {

  $('#customerAdd,.customerAddButton').off().click(function() {
    loadModal('customerAdd');
  })

  $('#customerNew').off().click(function() {
    loadModal('customerAdd', function(customerAddModal) {
      customerAddModal.on('hidden.bs.modal', function() {
        location.reload();
      })
    });
  })

  $('#customerSave').off().click(function() {
    var formData = $('#customerForm').serialize();
    var customerID = $('#customer-info').attr('customer-id');
    $.post({
      url: `/customers/${customerID}/edit`,
      data: formData,
      success: function() {
        successRedirect(`/customers/${customerID}/edit`, 'Customer saved successfully');
      },
      error: function(data) {
        error('Failed to save customer: ' + data.responseText);
      }
    })
  })

  $('.customerListDelete').click(function() {
    console.log('asdf');
    var customerID = $(this).closest('tr').attr('customer-id');
    var customerName = $(this).closest('tr').attr('customer-name');
    deleteCustomer(customerID, customerName);
  })

  $('#customerDelete').click(function() {
    var customerID = $('#customer-info').attr('customer-id');
    var customerName = $('#customer-info').attr('customer-name');
    deleteCustomer(customerID, customerName);
  })

})