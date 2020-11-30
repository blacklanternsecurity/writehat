function updateComponentStatus(event) {
    let component = $(event.item).attr("component-id"), 
        status = $(event.target).attr("status");

    let postData = JSON.stringify({'reviewStatus': status});
    console.log(postData);
    $.post({
        url: `/components/${component}/status/update`, 
        data: postData,
        contentType: 'application/json; charset=utf-8',
        success: function(result) { success("Review status updated."); },
        error: function(result) { error("Review status could not be updated."); console.log(result); }
    });
}

$().ready( function() { 
    $(".status-column").each( function() { 
        console.log($(this));
        new Sortable($(this)[0], {
                             group: 'shared',
                             animation: 150,
                             nested: false,
                             onAdd: function(e) { updateComponentStatus(e); }
                         }
        );
    });

    $('.componentEdit').off().click(function(e) {
        window.open("/components/" + $(this).attr("componentID") + "/edit", "_blank");
    });

    $('#backButton').click(function() {
        var reportID = $('#report-info').attr('report-id');
        redirect(`/engagements/report/${reportID}/edit`);
    });

    $("#displayToggle").change( function() { 
        let filter=$(this).val();
        $(".componentItem").each( function() { 
            if (filter == "-1" || $(this).attr("user-id") == filter) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
        localStorage.setItem("filter_" + $('#report-info').attr('report-id'), filter);
    });

    let filter = localStorage.getItem("filter_" + $('#report-info').attr('report-id'));
    if (filter == undefined) filter = "-1";
    $("#displayToggle").val(filter).trigger("change");

});
