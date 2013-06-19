$(document).ready(function () {

    // Removes all filtered elements initially
    $("#holder li, .played").hide();
    $("#holder.showThis li").show();

    // Counts up occurances of classes and sets number of occurrences in filter list
    $(".filters li").each(function(){
        var $val = $(this).find('input').val();
        var $valcount = $("#holder ."+$val).length;
        $(this).find('span').html($valcount);
        //alert($valcount);
    });
   
   
    // Sets the number in the 'Show all' filter by counting the total amount of entries.
    var $itval = $("#holder li").length;
    $(".filters li input[value*='all']").parent().find('span').html($itval);
    
    
   
   
    // When clicking an item in the filter list, elements will appear or dissappear
    // depending on whether list item is checked or unchecked.
   
    $(".filters li input[type=checkbox]").click(function(){
       
       
        $('a.jqTransformCheckbox').parent().find('input[type=checkbox]').removeAttr('checked');
        $('a.jqTransformChecked').parent().find('input[type=checkbox]').attr('checked','checked');
       
        // next two lines remove the initial page content when a filter is clicked
        $(".entry-made").hide();
        $(".entry-written").hide();
       
        var selection = $(this).val();
        if (selection == "all"){
            //show all items
            if ($(this).is(':checked')){
                $("#holder li img").fadeIn('fast');
                $("#holder li").slideDown('slow');
                $(".filters li input[type=checkbox]").attr('checked','checked');
                $(".filters li").addClass('checked');
                $(".filters li label").css({'color':'#efefef'});
            }else{
                $("#holder li img").fadeOut('slow');
                $("#holder li").slideUp('slow', function() {
                    $(".played").slideDown('fast');
                });
                $(".filters li input[type=checkbox]").removeAttr('checked');
                $(".filters li").removeClass('checked');
                $(".filters li label").css({'color':'#40575F'});
            }
        }else{
            if ($(this).is(':checked')){
                $("#holder li."+selection+" img").fadeIn('slow');
                $("#holder li."+selection).prependTo('#holder').slideDown('fast');
               
                var stringOfClassNames = '';
                var thisClassString = $("#holder li."+selection).attr('class');
                stringOfClassNames = stringOfClassNames +' '+ thisClassString;
               
                var arrayClasses = stringOfClassNames.split(' ');
                $.each(arrayClasses, function() {
                    $('.filters input[value='+this+']').parent('li').addClass('checked');
                    $('.filters input[value='+this+']').parent('li').find('label').css({'color':'#efefef'});
                    $('.filters input[value='+this+']').attr('checked','checked');
                });
               
                $(this).parent('li').addClass('checked');
                $(this).parent().find('label').css({'color':'#efefef'});
               
       
                if ($.browser.webkit) {
                    $('#main #holder li').css({'position':'relative'})
                }
            }else{
           
                $("#holder li."+selection+" img").fadeOut('slow');
                $("#holder li."+selection).slideUp('fast', function() {
               
                    var stringOfClassNames = '';
                    var thisClassString = $("#holder li."+selection).attr('class');
                    stringOfClassNames = stringOfClassNames +' '+ thisClassString;
                   
                    var arrayClasses = stringOfClassNames.split(' ');

                    $.each(arrayClasses, function() {
                        $('.filters input[value='+this+']').parent('li').removeClass('checked');
                        $('.filters input[value='+this+']').parent().find('a.jqTransformCheckbox').removeClass('jqTransformChecked');
                        $('.filters input[value='+this+']').parent('li').find('label').css({'color':'#40575F'});
                        $('.filters input[value='+this+']').removeAttr('checked');
                    });
                   
                    if ($('.filters input:checked').length <= 0){
                        $("#holder li").slideUp('fast');
                        $(".played").slideDown('fast');
                    }
                   
                });
               
                $(this).parent('li').removeClass('checked');
                $(this).parent('li.'+selection+' input[type=checkbox]').removeAttr('checked');
                $(this).parent().find('label').css({'color':'#40575F'});
               
                if ($('#filterIDall').is(':checked')){
                    $('#filterIDall').removeAttr('checked');
                    $('#filterIDall').parent().find('li').removeClass('checked');
                    $('#filterIDall').parent().find('label').css({'color':'#40575F'});
                }
            }
        }
    });
});