/*
*
* Contact JS
* @ThemeEaster
*/
$(function() {
    // Get the form.
    var form = $('#ajax_contact');

    // Get the messages div.
    var formMessages = $('#form-messages');
    formMessages.hide();

    // Set up an event listener for the contact form.
    $(form).submit(function(event) {
        // Stop the browser from submitting the form.
        event.preventDefault();

        // Basic validation check.
        var required = $(form).find('[required]');
        var valid = true;
        required.each(function() {
            if (!$(this).val() || !$(this).val().trim()) {
                $(this).css('border-color', '#e31837');
                valid = false;
            } else {
                $(this).css('border-color', '');
            }
        });
        if (!valid) {
            formMessages.removeClass('alert-success').addClass('alert-danger');
            formMessages.text('Please fill in all required fields.');
            formMessages.show();
            setTimeout(function(){ formMessages.hide(); }, 5000);
            return;
        }

        var submitBtn = $(form).find('#submit');
        var originalBtnText = submitBtn.html();
        submitBtn.prop('disabled', true).text('Sending…');

        // Serialize the form data.
        var formData = $(form).serialize();

        // Submit the form using AJAX to FormSubmit.co.
        $.ajax({
            type: 'POST',
            url: $(form).attr('action'),
            data: formData,
            dataType: 'json'
        })
        .done(function(response) {
            // Make sure that the formMessages div has the 'success' class.
            $(formMessages).removeClass('alert-danger');
            $(formMessages).addClass('alert-success');

            // Set the message text.
            $(formMessages).text('Thank you! Your message has been sent. We will get back to you shortly.');

            formMessages.show();

            setTimeout(function(){
                formMessages.hide();
            }, 6000);

            // Clear the form.
            form[0].reset();
        })
        .fail(function(data) {
            // Make sure that the formMessages div has the 'error' class.
            $(formMessages).removeClass('alert-success');
            $(formMessages).addClass('alert-danger');

            // Set the message text.
            $(formMessages).text('Oops! An error occurred and your message could not be sent. Please call us at 011 568 5340.');

            formMessages.show();

            setTimeout(function(){
                formMessages.hide();
            }, 6000);

        })
        .always(function() {
            submitBtn.prop('disabled', false).html(originalBtnText);
        });

    });

});
