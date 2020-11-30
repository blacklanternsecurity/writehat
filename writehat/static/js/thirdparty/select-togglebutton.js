
(function($) {
    // Define the togglebutton plugin.
    $.fn.togglebutton = function(opts) {
        // Apply the users options if exists.
        var settings = $.extend( {}, $.fn.togglebutton.defaults, opts);

        // For each select element.
        this.each(function() {
            var self = $(this);
            var multiple = this.multiple;

            // Retrieve all options.
            var options = self.children('option');
            // Create an array of buttons with the value of select options.
            var buttons = options.map(function(index, opt) {
                var button = $("<button type='button' class='btn btn-default'></button>")
                .prop('value', opt.value)
                .text(opt.text);

                // Add an `active` class if the option has been selected.
                if (opt.selected) {
                    button.addClass("active");
                }

                // Return the button.
                return button[0];
            });

            // For each button, implement the click button removing and adding
            // `active` class to simulate the toggle effect. And also change the
            // select selected option.
            buttons.each(function(index, btn) {
                $(btn).click(function() {
                     // Check if the clicked button has the class `active`.
                    if ($(btn).hasClass("active")) {
                       
                        return;

                    } else {

                        // Retrieve all buttons siblings of the clicked one with an
                        // `active` class !
                        var activeBtn = $(btn).siblings(".active");
                        var total = [];

                        // Remove all selected property on options.
                        self.children("option:selected").prop("selected", false);

                        // add the active class
                        $(btn).addClass("active");
                        options.val(btn.value).prop("selected", true);
                        total.push(btn.value);

                        // If the select allow multiple values, remove all active
                        // class to the other buttons (to keep only the last clicked
                        // button).
                        if (!multiple) {
                            activeBtn.removeClass("active");
                        }

                        // Push all active buttons value in an array.
                        activeBtn.each(function(index, btn) {
                            total.push(btn.value);
                        });

                        // Change selected options of the select.
                        self.val(total).change();

                    }
                });
            });

            // Group all the buttons in a `div` element.
            var btnGroup = $("<div class='btn-group'>").append(buttons);
            // Include the buttons group after the select element.
            self.after(btnGroup);
            // Hide the display element.
            self.hide();
        });
    };

    // Set the defaults options of the plugin.
    $.fn.togglebutton.defaults = {
    };

}(jQuery));
