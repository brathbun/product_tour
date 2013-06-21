// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.


 // DOMContentLoaded

//Main Filter JS
$(function() {
    // bind dropdowns in the form
    var $filterchannel = $('#filter select[name="channel"]');
    var $filtermedium = $('#filter select[name="medium"]');
    var $filterproduct = $('#filter select[name="product"]');

    // get the first collection
    var $applications = $('#applications');

    // clone applications to get a second collection
    var $data = $applications.clone();

    // attempt to call Quicksand on every form change
    $('select').change(
        function() {
            $(this).addClass('animate');
            if ($($filterchannel).val() == '0'){
                if ($($filtermedium).val() == '0'){
                    if ($($filterproduct).val() == '0'){
                        //0-0-0
                        var $filteredData = $data.find('div');
                    } else {
                        //0-0-1
                        var $filteredData = $data.find('div[data-product=' + $($filterproduct).val() + ']' );
                    }
                } else {
                    if ($($filterproduct).val() == '0'){
                        //0-1-0
                        var $filteredData = $data.find('div[data-medium=' + $($filtermedium).val() + ']' );
                    } else {
                        //0-1-1
                        var $filteredData = $data.find('div[data-medium=' + $($filtermedium).val() + ']' + 'div[data-product=' + $($filterproduct).val() + ']');
                    }
                }
            } else {
                if ($($filtermedium).val() == '0'){
                    if ($($filterproduct).val() == '0'){
                        //1-0-0
                        var $filteredData = $data.find('div[data-channel=' + $($filterchannel).val() + ']' );
                    } else {
                        //1-0-1
                        var $filteredData = $data.find('div[data-channel=' + $($filterchannel).val() + ']' + 'div[data-product=' + $($filterproduct).val() + ']');
                    }
                } else {
                    if ($($filterproduct).val() == '0'){
                        //1-1-0
                        var $filteredData = $data.find('div[data-channel=' + $($filterchannel).val() + ']' + 'div[data-medium=' + $($filtermedium).val() + ']');
                    } else {
                        //1-1-1
                        var $filteredData = $data.find('div[data-channel=' + $($filterchannel).val() + ']' + 'div[data-medium=' + $($filtermedium).val() + ']' + 'div[data-product=' + $($filterproduct).val() + ']');
                    }
                }
            }
            
            // finally, call quicksand
            $applications.quicksand($filteredData, {
                duration: 1000,
                easing: 'easeInOutQuad',
                adjustHeight:   'auto'
        });
    });
});