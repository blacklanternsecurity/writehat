var whitelists = cachedGet('/validation/whitelists');

var validators = {
  names: whitelists['names'].join(''),
  strict_names: whitelists['strict_names'].join(''),
}


// takes a string and returns a version with illegal characters stripped out
function validate_name(s, strict=false) {
  if (strict) {
    return clean_str(s, validators.strict_names);
  } else {
    return clean_str(s, validators.names);
  }
}


function clean_str(s, whitelist=validators.names) {
  var chars = [];
  for (i = 0; i < s.length; i++) {
    var char = s[i];
    if (whitelist.includes(char)) {
      chars.push(char);
    }
  }
  return chars.join('');
}


function validate() {
  var cleaned = validate_name($(this).val());
  $(this).val(cleaned);
}


function validate_strict() {
  var cleaned = validate_name($(this).val(), strict=true);
  $(this).val(cleaned);
}


function bind_validators() {

  //$('input.name-validation').unbind(validate);
  $('input.name-validation').keyup(validate);

  //$('input.strict-name-validation').unbind(validate_strict);
  $('input.strict-name-validation').keyup(validate_strict);

  $('i.fa-save').each(function() {
    //$(this).closest('button').unbind(highlight_missing_fields);
    $(this).closest('button').click(highlight_missing_fields);
  })

}


function find_closest_form(e) {
  var closest_form = $(e.currentTarget).closest('.modal').find('form')[0];
  if (closest_form == undefined) {
    closest_form = $(e.currentTarget).closest('pane').find('form')[0];
  }
  if (closest_form == undefined) {
    closest_form = $('body').find('form')[0];
  }
  return $(closest_form);
}


function highlight_missing_fields(e) {
  var border_style = 'border: 1px solid red; background: rgb(50,0,0)';
  var form = find_closest_form(e);
  var first_missing = true;

  // all fields marked as required
  // and all selectpicker fields
  form.find('[required]').each(function() {
    if (!($(this).val())) {
      var highlight_el = $(this).closest('tr');
      if (highlight_el.length < 1) {
        highlight_el = $(this).closest('div');
      }
      highlight_el.attr('style', border_style)
      // if this is the first missing field, scroll to it
      if (first_missing) {
        scrollTo(this);
        first_missing = false;
      }
    } else {
      $(this).closest('tr').removeAttr('style');
    }
  })

}


// load the validators when the document is loaded
$(document).ready(bind_validators);
// load the validators when a pane is loaded
$(document).on('paneLoaded', bind_validators);
// load the validators when a modal is loaded
$(document).on('modalLoaded', bind_validators);