$(function() {
    var $severityStatistics = $("#severity_statistics");
    var $categoryStatistics = $("#category_statistics");
    var $customerStatistics = $("#customer_statistics");
    var $p = new URLSearchParams(window.location.search);
    var dreadBackgroundColors = [
        pattern.draw('diagonal-right-left', 'rgba(0, 98, 255, 0.7)'),
        pattern.draw('diagonal-right-left', 'rgba(255, 165, 0, 1)'),
        pattern.draw('diagonal-right-left', 'rgba(255, 58, 0, 0.8)'),
        pattern.draw('diagonal-right-left', 'rgba(255, 0, 0, 1)'),
        pattern.draw('diagonal-right-left', 'rgba(195, 0, 255, 1)'),
        pattern.draw('diagonal-right-left', 'rgba(60, 180, 108, 1)'),
      ];
    var proactiveBackgroundColors = [
        pattern.draw('line', 'rgba(0, 98, 255, 0.7)'),
        pattern.draw('line', 'rgba(255, 165, 0, 1)'),
        pattern.draw('line', 'rgba(255, 58, 0, 0.8)'),
        pattern.draw('line', 'rgba(255, 0, 0, 1)'),
        pattern.draw('line', 'rgba(195, 0, 255, 1)'),
        pattern.draw('line', 'rgba(60, 180, 108, 1)'),
      ];
    $.ajax({
        url: "get_statistics?startDate=" + $p.get("startDate") + "&endDate=" + $p.get("endDate"),
        type: "get",
        success: function(data) {
            $("h1").text(data.engagement_data);
            $.each(data.engagement_name_data, function(index, value) {
                $('<li>'+ value + '</li>').appendTo('#engagement_names');
              });
            var severityCtx = $severityStatistics[0].getContext("2d");
            var categoryCtx = $categoryStatistics[0].getContext("2d");
            var customerCtx = $customerStatistics[0].getContext("2d");
            Chart.register(ChartDataLabels);
            new Chart(severityCtx, {
                type: 'bar',
                data: {
                    labels: data.cvss_severity_labels,
                    datasets: [{
                        label: 'CVSS',
                        backgroundColor: ['rgba(0, 98, 255, 0.7)',  'rgba(255, 165, 0, 1)', 'rgba(255, 58, 0, 0.8)', 'rgba(255, 0, 0, 1)', 'rgba(195, 0, 255, 1)', 'rgba(60, 180, 108, 1)'],
                        data: data.cvss_severity_data,
                    },
                    {
                        label: 'DREAD',
                        backgroundColor: dreadBackgroundColors,
                        data: data.dread_severity_data
                    },      
                    {
                        label: 'PROACTIVE',
                        backgroundColor: proactiveBackgroundColors,
                        data: data.proactive_severity_data
                    }],
                },
                options: {
                    layout: {
                        padding: {
                            left: 5,
                            right: 5,
                            top: 50,
                            bottom: 5
                        }
                    },
                    responsive: true,
                    scales: {
                        x: {
                            ticks: {
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            }
                        },
                        y: {
                            stepSize: 1,
                            ticks: {
                                color: 'white',
                                callback: function(value) {if (value % 1 === 0) {return value;}},
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            enabled: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            offset: 5,
                            color: 'white',
                            formatter: function (value, context) { return value || null;  },
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        }
                    }
                }
            }),
            new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: data.category_labels,
                    datasets: [{
                        label: 'Total',
                        backgroundColor: ['rgba(0, 98, 255, 0.7)'],
                        data: data.category_data
                    }]
                },
                options: {
                    indexAxis: 'y',
                    layout: {
                        padding: {
                            left: 5,
                            right: 50,
                            top: 5,
                            bottom: 5
                        }
                    },
                    responsive: true,
                    scales: {
                        x: {
                            ticks: {
                                color: 'white',
                                callback: function(value) {if (value % 1 === 0) {return value;}},
                                font: {
                                    size: 14
                                }
                            }
                        },
                        y: {
                            ticks: {
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            offset: 5,
                            color: 'white',
                            formatter: function (value, context) { return value || null;  },
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        }
                    }
                }
            }
            ),new Chart(customerCtx, {
                type: 'bar',
                data: {
                    labels: data.customer_labels,
                    datasets: [{
                        label: 'Total',
                        backgroundColor: ['rgba(0, 98, 255, 0.7)'],
                        data: data.customer_data
                    }]
                },
                options: {
                    indexAxis: 'y',
                    layout: {
                        padding: {
                            left: 5,
                            right: 50,
                            top: 5,
                            bottom: 5
                        }
                    },
                    responsive: true,
                    scales: {
                        x: {
                            ticks: {
                                color: 'white',
                                callback: function(value) {if (value % 1 === 0) {return value;}},
                                font: {
                                    size: 14
                                }
                            }
                        },
                        y: {
                            ticks: {
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'end',
                            offset: 5,
                            color: 'white',
                            formatter: function (value, context) { return value || null;  },
                            font: {
                                weight: 'bold',
                                size: 16
                            }
                        }
                    }
                }
            }
            );
        }
    });
});