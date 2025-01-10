var p = new URLSearchParams(window.location.search);
if (p.get("startDate") || p.get("endDate")) {
    var startDate = p.get("startDate")
    var endDate = p.get("endDate")
} else {
    const date = new Date();
    var startDate = `1-${date.getMonth() + 1}-${date.getFullYear()}`
    var endDate = `${new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
}

const picker = new Litepicker({
    element: document.getElementById('litepicker'),
    format: 'D-M-YYYY',
    singleMode: false,
    lang: 'en-GB',
    startDate: startDate,
    endDate: endDate,
    setup: (picker) => {
        picker.on('selected', (date1, date2) => {
            document.getElementById("startDate").value = `${date1.getDate()}-${(date1.getMonth() + 1)}-${date1.getFullYear()}`;
            document.getElementById("endDate").value = `${date2.getDate()}-${(date2.getMonth() + 1)}-${date2.getFullYear()}`;
            document.getElementById("statisticsForm").submit();
        });
    },
});