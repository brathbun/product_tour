
// remap jQuery to $
(function($){

 





 



})(this.jQuery);



// usage: log('inside coolFunc',this,arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};



// catch all document.write() calls
(function(doc){
  var write = doc.write;
  doc.write = function(q){ 
    log('document.write(): ',arguments); 
    if (/docwriteregexwhitelist/.test(q)) write.apply(doc,arguments);  
  };
})(document);



/*
    AnythingSlider v1.5.3

    By Chris Coyier: http://css-tricks.com
    with major improvements by Doug Neiner: http://pixelgraphics.us/
    based on work by Remy Sharp: http://jqueryfordesigners.com/
    crazy mods by Rob Garrison (aka Mottie)

    To use the navigationFormatter function, you must have a function that
    accepts two paramaters, and returns a string of HTML text.

    index = integer index (1 based);
    panel = jQuery wrapped LI item this tab references
    @return = Must return a string of HTML/Text

    navigationFormatter: function(index, panel){
        return "Panel #" + index; // This would have each tab with the text 'Panel #X' where X = index
    }
*/

(function($) {

    $.anythingSlider = function(el, options) {

        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        // Wraps the ul in the necessary divs and then gives Access to jQuery element
        base.$el = $(el).addClass('anythingBase').wrap('<div class="anythingSlider"><div class="anythingWindow" /></div>');

        // Add a reverse reference to the DOM object
        base.$el.data("AnythingSlider", base);

        base.init = function(){

            base.options = $.extend({}, $.anythingSlider.defaults, options);

            if ($.isFunction(base.options.onBeforeInitialize)) { base.$el.bind('before_initialize', base.options.onBeforeInitialize); }
            base.$el.trigger('before_initialize', base);

            // Cache existing DOM elements for later
            // base.$el = original ul
            // for wrap - get parent() then closest in case the ul has "anythingSlider" class
            base.$wrapper = base.$el.parent().closest('div.anythingSlider').addClass('anythingSlider-' + base.options.theme);
            base.$window = base.$el.closest('div.anythingWindow');
            base.$controls = $('<div class="anythingControls"></div>').appendTo( $(base.options.appendControlsTo).length ? $(base.options.appendControlsTo) : base.$wrapper);
            base.$nav = $('<ul class="thumbNav" />').appendTo(base.$controls);

            // Set up a few defaults & get details
            base.timer   = null;  // slideshow timer (setInterval) container
            base.flag    = false; // event flag to prevent multiple calls (used in control click/focusin)
            base.playing = false; // slideshow state
            base.hovered = false; // actively hovering over the slider
            base.panelSize = [];  // will contain dimensions and left position of each panel
            base.currentPage = base.options.startPanel;
            if (base.options.playRtl) { base.$wrapper.addClass('rtl'); }

            // save some options
            base.original = [ base.options.autoPlay, base.options.buildNavigation, base.options.buildArrows];
            base.updateSlider();

            base.$currentPage = base.$items.eq(base.currentPage);
            base.$lastPage = base.$currentPage;

            // Get index (run time) of this slider on the page
            base.runTimes = $('div.anythingSlider').index(base.$wrapper) + 1;
            base.regex = new RegExp('panel' + base.runTimes + '-(\\d+)', 'i'); // hash tag regex

            // Make sure easing function exists.
            if (!$.isFunction($.easing[base.options.easing])) { base.options.easing = "swing"; }

            // Add theme stylesheet, if it isn't already loaded
            if (base.options.theme != 'default' && !$('link[href*=' + base.options.theme + ']').length){
                $('body').append('<link rel="stylesheet" href="' + base.options.themeDirectory.replace(/\{themeName\}/g, base.options.theme) + '" type="text/css" />');
            }

            // If pauseOnHover then add hover effects
            if (base.options.pauseOnHover) {
                base.$wrapper.hover(function() {
                    if (base.playing) {
                        base.$el.trigger('slideshow_paused', base);
                        base.clearTimer(true);
                    }
                }, function() {
                    if (base.playing) {
                        base.$el.trigger('slideshow_unpaused', base);
                        base.startStop(base.playing, true);
                    }
                });
            }

            // If a hash can not be used to trigger the plugin, then go to start panel
            var startPanel = (base.options.hashTags) ? base.gotoHash() || base.options.startPanel : base.options.startPanel;
            base.setCurrentPage(startPanel, false); // added to trigger events for FX code

            // Hide/Show navigation & play/stop controls
            base.slideControls(false);
            base.$wrapper.hover(function(e){
                base.hovered = (e.type=="mouseenter") ? true : false;
                base.slideControls( base.hovered, false );
            });

            // Add keyboard navigation
            if (base.options.enableKeyboard) {
                $(document).keyup(function(e){
                    if (base.$wrapper.is('.activeSlider')) {
                        switch (e.which) {
                            case 39: // right arrow
                                base.goForward();
                                break;
                            case 37: //left arrow
                                base.goBack();
                                break;
                        }
                    }
                });
            }

            // Binds events
            if ($.isFunction(base.options.onShowPause))   { base.$el.bind('slideshow_paused', base.options.onShowPause); }
            if ($.isFunction(base.options.onShowUnpause)) { base.$el.bind('slideshow_unpaused', base.options.onShowUnpause); }
            if ($.isFunction(base.options.onSlideInit))   { base.$el.bind('slide_init', base.options.onSlideInit); }
            if ($.isFunction(base.options.onSlideBegin))  { base.$el.bind('slide_begin', base.options.onSlideBegin); }
            if ($.isFunction(base.options.onShowStop))    { base.$el.bind('slideshow_stop', base.options.onShowStop); }
            if ($.isFunction(base.options.onShowStart))   { base.$el.bind('slideshow_start', base.options.onShowStart); }
            if ($.isFunction(base.options.onInitialized)) { base.$el.bind('initialized', base.options.onInitialized); }
            if ($.isFunction(base.options.onSlideComplete)){
                // Added setTimeout (zero time) to ensure animation is complete... see this bug report: http://bugs.jquery.com/ticket/7157
                base.$el.bind('slide_complete', function(){
                    setTimeout(function(){ base.options.onSlideComplete(base); }, 0);
                });
            }
            base.$el.trigger('initialized', base);

        };

        // called during initialization & to update the slider if a panel is added or deleted
        base.updateSlider = function(){
            // needed for updating the slider
            base.$el.find('li.cloned').remove();
            base.$nav.empty();

            base.$items = base.$el.find('> li'); 
            base.pages = base.$items.length;

            // Set the dimensions of each panel
            if (base.options.resizeContents) {
                if (base.options.width) { base.$wrapper.add(base.$items).css('width', base.options.width); }
                if (base.options.height) { base.$wrapper.add(base.$items).css('height', base.options.height); }
                if (base.hasEmb){ base.$el.find('object, embed').css({ width : '100%', height: '100%' }); } // this only expands youtube videos
            }

            // Remove navigation & player if there is only one page
            if (base.pages === 1) {
                base.options.autoPlay = false;
                base.options.buildNavigation = false;
                base.options.buildArrows = false;
                base.$controls.hide();
                base.$nav.hide();
                if (base.$forward) { base.$forward.add(base.$back).hide(); }
            } else {
                base.options.autoPlay = base.original[0];
                base.options.buildNavigation = base.original[1];
                base.options.buildArrows = base.original[2];
                base.$controls.show();
                base.$nav.show();
                if (base.$forward) { base.$forward.add(base.$back).show(); }
            }

            // Build navigation tabs
            base.buildNavigation();

            // If autoPlay functionality is included, then initialize the settings
            if (base.options.autoPlay) {
                base.playing = !base.options.startStopped; // Sets the playing variable to false if startStopped is true
                base.buildAutoPlay();
            }

            // Build forwards/backwards buttons
            if (base.options.buildArrows) { base.buildNextBackButtons(); }

            // Top and tail the list with 'visible' number of items, top has the last section, and tail has the first
            // This supports the "infinite" scrolling, also ensures any cloned elements don't duplicate an ID
            base.$el.prepend( base.$items.filter(':last').clone().addClass('cloned').removeAttr('id') );
            base.$el.append( base.$items.filter(':first').clone().addClass('cloned').removeAttr('id') );
            base.$el.find('li.cloned').find('a').each(function(){ // disable all links in the cloned panels
                $(this).replaceWith('<span>' + $(this).text() + '</a>');
            });

            // We just added two items, time to re-cache the list, then get the dimensions of each panel

            base.$items = base.$el.find('> li').addClass('panel');
            base.setDimensions();
            if (!base.options.resizeContents) { $(window).load(function(){ base.setDimensions(); }); } // set dimensions after all images load

            if (base.currentPage > base.pages) {
                base.currentPage = base.pages;
                base.setCurrentPage(base.pages, false);
            }
            base.$nav.find('a').eq(base.currentPage - 1).addClass('cur'); // update current selection

            base.hasEmb = !!base.$items.find('embed[src*=youtube]').length; // embedded youtube objects exist in the slider
            base.hasSwfo = (typeof(swfobject) !== 'undefined' && swfobject.hasOwnProperty('embedSWF') && $.isFunction(swfobject.embedSWF)) ? true : false; // is swfobject loaded?

            // Initialize YouTube javascript api, if YouTube video is present
            if (base.hasEmb && base.hasSwfo) {
                base.$items.find('embed[src*=youtube]').each(function(i){
                    // Older IE doesn't have an object - just make sure we are wrapping the correct element
                    var $tar = ($(this).parent()[0].tagName == "OBJECT") ? $(this).parent() : $(this);
                    $tar.wrap('<div id="ytvideo' + i + '"></div>');
                    // use SWFObject if it exists, it replaces the wrapper with the object/embed
                    swfobject.embedSWF($(this).attr('src') + '&enablejsapi=1&version=3&playerapiid=ytvideo' + i, 'ytvideo' + i, '100%', '100%', '10', null, null,
                        { allowScriptAccess: "always", wmode : base.options.addWmodeToObject }, {});
                });
            }

            // Fix tabbing through the page
            base.$items.find('a').unbind('focus').bind('focus', function(e){
                base.$items.find('.focusedLink').removeClass('focusedLink');
                $(this).addClass('focusedLink');
                var panel = $(this).closest('.panel');
                if (!panel.is('.activePage')) {
                    base.gotoPage(base.$items.index(panel));
                    e.preventDefault();
                }
            });

        };

        // Creates the numbered navigation links
        base.buildNavigation = function() {

            if (base.options.buildNavigation && (base.pages > 1)) {
                base.$items.filter(':not(.cloned)').each(function(i,el) {
                    var index = i + 1,
                        $a = $("<a href='#'></a>").addClass('panel' + index).wrap("<li />");
                    base.$nav.append($a.parent()); // use $a.parent() so IE will add <li> instead of only the <a> to the <ul>

                    // If a formatter function is present, use it
                    if ($.isFunction(base.options.navigationFormatter)) {
                        var tmp = base.options.navigationFormatter(index, $(this));
                        $a.html(tmp);
                        // Add formatting to title attribute if text is hidden
                        if (parseInt($a.css('text-indent'),10) < 0) { $a.addClass(base.options.tooltipClass).attr('title', tmp); }
                    } else {
                        $a.text(index);
                    }

                    $a.bind(base.options.clickControls, function(e) {
                        if (!base.flag && base.options.enableNavigation) {
                            // prevent running functions twice (once for click, second time for focusin)
                            base.flag = true; setTimeout(function(){ base.flag = false; }, 100);
                            base.gotoPage(index);
                            if (base.options.hashTags) { base.setHash(index); }
                        }
                        e.preventDefault();
                    });
                });
            }
        };

        // Creates the Forward/Backward buttons
        base.buildNextBackButtons = function() {
            if (base.$forward) { return; }
            base.$forward = $('<span class="arrow forward"><a href="#">' + base.options.forwardText + '</a></span>');
            base.$back = $('<span class="arrow back"><a href="#">' + base.options.backText + '</a></span>');

            // Bind to the forward and back buttons
            base.$back.bind(base.options.clickArrows, function(e) {
                base.goBack();
                e.preventDefault();
            });
            base.$forward.bind(base.options.clickArrows, function(e) {
                base.goForward();
                e.preventDefault();
            });
            // using tab to get to arrow links will show they have focus (outline is disabled in css)
            base.$back.add(base.$forward).find('a').bind('focusin focusout',function(){
             $(this).toggleClass('hover');
            });

            // Append elements to page
            base.$wrapper.prepend(base.$forward).prepend(base.$back);
            base.$arrowWidth = base.$forward.width();
        };

        // Creates the Start/Stop button
        base.buildAutoPlay = function(){
            if (base.$startStop) { return; }
            base.$startStop = $("<a href='#' class='start-stop'></a>").html(base.playing ? base.options.stopText : base.options.startText);
            base.$controls.prepend(base.$startStop);
            base.$startStop
                .bind(base.options.clickSlideshow, function(e) {
                    if (base.options.enablePlay) {
                        base.startStop(!base.playing);
                        if (base.playing) {
                            if (base.options.playRtl) {
                                base.goBack(true);
                            } else {
                                base.goForward(true);
                            }
                        }
                    }
                    e.preventDefault();
                })
                // show button has focus while tabbing
                .bind('focusin focusout',function(){
                    $(this).toggleClass('hover');
                });

            // Use the same setting, but trigger the start;
            base.startStop(base.playing);
        };

        // Set panel dimensions to either resize content or adjust panel to content
        base.setDimensions = function(){
            var w, h, c, cw, dw, leftEdge = 0, bww = base.$window.width(), winw = $(window).width();
            base.$items.each(function(i){
                c = $(this).children('*');
                if (base.options.resizeContents){
                    // get viewport width & height from options (if set), or css
                    w = parseInt(base.options.width,10) || bww;
                    h = parseInt(base.options.height,10) || base.$window.height();
                    // resize panel
                    $(this).css({ width: w, height: h });
                    // resize panel contents, if solitary (wrapped content or solitary image)
                    if (c.length == 1){ c.css({ width: '100%', height: '100%' }); }
                } else {
                    // get panel width & height and save it
                    w = $(this).width(); // if not defined, it will return the width of the ul parent
                    dw = (w >= winw) ? true : false; // width defined from css?
                    if (c.length == 1 && dw){
                        cw = (c.width() >= winw) ? bww : c.width(); // get width of solitary child
                        $(this).css('width', cw); // set width of panel
                        c.css('max-width', cw);   // set max width for all children
                        w = cw;
                    }
                    w = (dw) ? base.options.width || bww : w;
                    $(this).css('width', w);
                    h = $(this).outerHeight(); // get height after setting width
                    $(this).css('height', h);
                }
                base.panelSize[i] = [w,h,leftEdge];
                leftEdge += w;
            });
            // Set total width of slider, but don't go beyond the set max overall width (limited by Opera)
            base.$el.css('width', (leftEdge < base.options.maxOverallWidth) ? leftEdge : base.options.maxOverallWidth);
        };

        base.gotoPage = function(page, autoplay) {
            if (base.pages === 1) { return; }
            base.$lastPage = base.$items.eq(base.currentPage);
            if (typeof(page) === "undefined" || page === null) {
                page = base.options.startPage;
                base.setCurrentPage(base.options.startPage);
            }

            // pause YouTube videos before scrolling or prevent change if playing
            if (base.hasEmb && base.checkVideo(base.playing)) { return; }

            if (page > base.pages + 1) { page = base.pages; }
            if (page < 0 ) { page = 1; }
            base.$currentPage = base.$items.eq(page);
            base.currentPage = page; // ensure that event has correct target page
            base.$el.trigger('slide_init', base);

            base.slideControls(true, false);

            // When autoplay isn't passed, we stop the timer
            if (autoplay !== true) { autoplay = false; }
            // Stop the slider when we reach the last page, if the option stopAtEnd is set to true
            if (!autoplay || (base.options.stopAtEnd && page == base.pages)) { base.startStop(false); }

            base.$el.trigger('slide_begin', base);

            // resize slider if content size varies
            if (!base.options.resizeContents) {
                // animating the wrapper resize before the window prevents flickering in Firefox
                base.$wrapper.filter(':not(:animated)').animate(
                    { width: base.panelSize[page][0], height: base.panelSize[page][1] },
                    { queue: false, duration: base.options.animationTime, easing: base.options.easing }
                );
            }
            // Animate Slider
            base.$window.filter(':not(:animated)').animate(
                { scrollLeft : base.panelSize[page][2] },
                { queue: false, duration: base.options.animationTime, easing: base.options.easing, complete: function(){ base.endAnimation(page); } }
            );
        };

        base.endAnimation = function(page){
            if (page === 0) {
                base.$window.scrollLeft(base.panelSize[base.pages][2]);
                page = base.pages;
            } else if (page > base.pages) {
                // reset back to start position
                base.$window.scrollLeft(base.panelSize[1][2]);
                page = 1;
            }
            base.setCurrentPage(page, false);
            // Add active panel class
            base.$items.removeClass('activePage').eq(page).addClass('activePage');

            if (!base.hovered) { base.slideControls(false); }

            // continue YouTube video if in current panel
            if (base.hasEmb){
                var emb = base.$currentPage.find('object[id*=ytvideo], embed[id*=ytvideo]');
                // player states: unstarted (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5).
                if (emb.length && $.isFunction(emb[0].getPlayerState) && emb[0].getPlayerState() > 0 && emb[0].getPlayerState() != 5) {
                    emb[0].playVideo();
                }
            }

            base.$el.trigger('slide_complete', base);
        };

        base.setCurrentPage = function(page, move) {
            if (page > base.pages + 1) { page = base.pages; }
            if (page < 0 ) { page = 1; }

            // Set visual
            if (base.options.buildNavigation){
                base.$nav.find('.cur').removeClass('cur');
                base.$nav.find('a').eq(page - 1).addClass('cur');
            }

            // Only change left if move does not equal false
            if (!move) {
                base.$wrapper.css({
                    width: base.panelSize[page][0],
                    height: base.panelSize[page][1]
                });
                base.$wrapper.scrollLeft(0); // reset in case tabbing changed this scrollLeft
                base.$window.scrollLeft( base.panelSize[page][2] );
            }
            // Update local variable
            base.currentPage = page;

            // Set current slider as active so keyboard navigation works properly
            if (!base.$wrapper.is('.activeSlider')){
                $('.activeSlider').removeClass('activeSlider');
                base.$wrapper.addClass('activeSlider');
            }
        };

        base.goForward = function(autoplay) {
            if (autoplay !== true) { autoplay = false; base.startStop(false); }
            base.gotoPage(base.currentPage + 1, autoplay);
        };

        base.goBack = function(autoplay) {
            if (autoplay !== true) { autoplay = false; base.startStop(false); }
            base.gotoPage(base.currentPage - 1, autoplay);
        };

        // This method tries to find a hash that matches panel-X
        // If found, it tries to find a matching item
        // If that is found as well, then that item starts visible
        base.gotoHash = function(){
            var n = window.location.hash.match(base.regex);
            return (n===null) ? '' : parseInt(n[1],10);
        };

        base.setHash = function(n){
            var s = 'panel' + base.runTimes + '-',
                h = window.location.hash;
            if ( typeof h !== 'undefined' ) {
                window.location.hash = (h.indexOf(s) > 0) ? h.replace(base.regex, s + n) : h + "&" + s + n;
            }
        };

        // Slide controls (nav and play/stop button up or down)
        base.slideControls = function(toggle, playing){
            var dir = (toggle) ? 'slideDown' : 'slideUp',
                t1 = (toggle) ? 0 : base.options.animationTime,
                t2 = (toggle) ? base.options.animationTime: 0,
                sign = (toggle) ? 0 : 1; // 0 = visible, 1 = hidden
            if (base.options.toggleControls) {
                base.$controls.stop(true,true).delay(t1)[dir](base.options.animationTime/2).delay(t2); 
            }
            if (base.options.buildArrows && base.options.toggleArrows) {
                if (!base.hovered && base.playing) { sign = 1; }
                base.$forward.stop(true,true).delay(t1).animate({ right: sign * base.$arrowWidth, opacity: t2 }, base.options.animationTime/2);
                base.$back.stop(true,true).delay(t1).animate({ left: sign * base.$arrowWidth, opacity: t2 }, base.options.animationTime/2);
            }
        };

        base.clearTimer = function(paused){
            // Clear the timer only if it is set
            if (base.timer) { 
                window.clearInterval(base.timer); 
                if (!paused) {
                    base.$el.trigger('slideshow_stop', base); 
                }
            }
        };

        // Handles stopping and playing the slideshow
        // Pass startStop(false) to stop and startStop(true) to play
        base.startStop = function(playing, paused) {
            if (playing !== true) { playing = false; } // Default if not supplied is false

            if (playing && !paused) {
                base.$el.trigger('slideshow_start', base);
            }

            // Update variable
            base.playing = playing;

            // Toggle playing and text
            if (base.options.autoPlay) {
                base.$startStop.toggleClass('playing', playing).html( playing ? base.options.stopText : base.options.startText );
                // add button text to title attribute if it is hidden by text-indent
                if (parseInt(base.$startStop.css('text-indent'),10) < 0) {
                    base.$startStop.addClass(base.options.tooltipClass).attr('title', playing ? 'Stop' : 'Start');
                }
            }

            if (playing){
                base.clearTimer(true); // Just in case this was triggered twice in a row
                base.timer = window.setInterval(function() {
                    // prevent autoplay if video is playing
                    if (!(base.hasEmb && base.checkVideo(playing))) {
                        if (base.options.playRtl) {
                            base.goBack(true);
                        } else {
                            base.goForward(true);
                        }
                    }
                }, base.options.delay);
            } else {
                base.clearTimer();
            }
        };

        base.checkVideo = function(playing){
            // pause YouTube videos before scrolling?
            var emb, ps, stopAdvance = false;
            base.$items.find('object[id*=ytvideo], embed[id*=ytvideo]').each(function(){ // include embed for IE; if not using SWFObject, old detach/append code needs "object embed" here
                emb = $(this);
                if (emb.length && $.isFunction(emb[0].getPlayerState)) {
                    // player states: unstarted (-1), ended (0), playing (1), paused (2), buffering (3), video cued (5).
                    ps = emb[0].getPlayerState();
                    // if autoplay, video playing, video is in current panel and resume option are true, then don't advance
                    if (playing && (ps == 1 || ps > 2) && base.$items.index(emb.closest('li.panel')) == base.currentPage && base.options.resumeOnVideoEnd) {
                        stopAdvance = true;
                    } else {
                        // pause video if not autoplaying (if already initialized)
                        if (ps > 0) { emb[0].pauseVideo(); }
                    }
                }
            });
            return stopAdvance;
        };

        // Trigger the initialization
        base.init();
    };

    $.anythingSlider.defaults = {
        // Appearance
        width               : null,      // Override the default CSS width
        height              : null,      // Override the default CSS height
        resizeContents      : true,      // If true, solitary images/objects in the panel will expand to fit the viewport
        tooltipClass        : 'tooltip', // Class added to navigation & start/stop button (text copied to title if it is hidden by a negative text indent)
        theme               : 'default', // Theme name
        themeDirectory      : 'css/theme-{themeName}.css', // Theme directory & filename {themeName} is replaced by the theme value above

        // Navigation
        startPanel          : 1,         // This sets the initial panel
        hashTags            : true,      // Should links change the hashtag in the URL?
        enableKeyboard      : true,      // if false, keyboard arrow keys will not work for the current panel.
        buildArrows         : true,      // If true, builds the forwards and backwards buttons
        toggleArrows        : false,     // If true, side navigation arrows will slide out on hovering & hide @ other times
        buildNavigation     : true,      // If true, builds a list of anchor links to link to each panel
        enableNavigation    : true,      // if false, navigation links will still be visible, but not clickable.
        toggleControls      : false,     // if true, slide in controls (navigation + play/stop button) on hover and slide change, hide @ other times
        appendControlsTo    : null,      // A HTML element (jQuery Object, selector or HTMLNode) to which the controls will be appended if not null
        navigationFormatter : null,      // Details at the top of the file on this use (advanced use)
        forwardText         : "&raquo;", // Link text used to move the slider forward (hidden by CSS, replaced with arrow image)
        backText            : "&laquo;", // Link text used to move the slider back (hidden by CSS, replace with arrow image)

        // Slideshow options
        enablePlay          : true,      // if false, the play/stop button will still be visible, but not clickable.
        autoPlay            : true,      // This turns off the entire slideshow FUNCTIONALY, not just if it starts running or not
        startStopped        : false,     // If autoPlay is on, this can force it to start stopped
        pauseOnHover        : true,      // If true & the slideshow is active, the slideshow will pause on hover
        resumeOnVideoEnd    : true,      // If true & the slideshow is active & a youtube video is playing, it will pause the autoplay until the video is complete
        stopAtEnd           : false,     // If true & the slideshow is active, the slideshow will stop on the last page
        playRtl             : false,     // If true, the slideshow will move right-to-left
        startText           : "Start",   // Start button text
        stopText            : "Stop",    // Stop button text
        delay               : 3000,      // How long between slideshow transitions in AutoPlay mode (in milliseconds)
        animationTime       : 600,       // How long the slideshow transition takes (in milliseconds)
        easing              : "swing",   // Anything other than "linear" or "swing" requires the easing plugin

        // Callbacks
        onBeforeInitialize  : null,      // Callback before the plugin initializes
        onInitialized       : null,      // Callback when the plugin finished initializing
        onShowStart         : null,      // Callback on slideshow start
        onShowStop          : null,      // Callback after slideshow stops
        onShowPause         : null,      // Callback when slideshow pauses
        onShowUnpause       : null,      // Callback when slideshow unpauses - may not trigger properly if user clicks on any controls
        onSlideInit         : null,      // Callback when slide initiates, before control animation
        onSlideBegin        : null,      // Callback before slide animates
        onSlideComplete     : null,      // Callback when slide completes

        // Interactivity
        clickArrows         : "click",         // Event used to activate arrow functionality (e.g. "click" or "mouseenter")
        clickControls       : "click focusin", // Events used to activate navigation control functionality
        clickSlideshow      : "click",         // Event used to activate slideshow play/stop button

        // Misc options
        addWmodeToObject    : "opaque", // If your slider has an embedded object, the script will automatically add a wmode parameter with this setting
        maxOverallWidth     : 32766     // Max width (in pixels) of combined sliders (side-to-side); set to 32766 to prevent problems with Opera
    };

    $.fn.anythingSlider = function(options) {

        return this.each(function(i){
            var anySlide = $(this).data('AnythingSlider');

            // initialize the slider but prevent multiple initializations
            if ((typeof(options)).match('object|undefined')){
                if (!anySlide) {
                    (new $.anythingSlider(this, options));
                } else {
                    anySlide.updateSlider();
                }
            // If options is a number, process as an external link to page #: $(element).anythingSlider(#)
            } else if (/\d/.test(options) && !isNaN(options) && anySlide) {
                var page = (typeof(options) == "number") ? options : parseInt($.trim(options),10); // accepts "  2  "
                // ignore out of bound pages
                if ( page >= 1 && page <= anySlide.pages ) {
                    anySlide.gotoPage(page);
                }
            }
        });
    };

})(jQuery);


(function($){var l={preloadImg:true};var m=false;var n=function(a){a=a.replace(/^url\((.*)\)/,'$1').replace(/^\"(.*)\"$/,'$1');var b=new Image();b.src=a.replace(/\.([a-zA-Z]*)$/,'-hover.$1');var c=new Image();c.src=a.replace(/\.([a-zA-Z]*)$/,'-focus.$1')};var o=function(a){var b=$(a.get(0).form);var c=a.next();if(!c.is('label')){c=a.prev();if(c.is('label')){var d=a.attr('id');if(d){c=b.find('label[for="'+d+'"]')}}}if(c.is('label')){return c.css('cursor','pointer')}return false};var p=function(b){var c=$('.jqTransformSelectWrapper ul:visible');c.each(function(){var a=$(this).parents(".jqTransformSelectWrapper:first").find("select").get(0);if(!(b&&a.oLabel&&a.oLabel.get(0)==b.get(0))){$(this).hide()}})};var q=function(a){if($(a.target).parents('.jqTransformSelectWrapper').length===0){p($(a.target))}};var r=function(){$(document).mousedown(q)};var s=function(f){var a;$('.jqTransformSelectWrapper select',f).each(function(){a=(this.selectedIndex<0)?0:this.selectedIndex;$('ul',$(this).parent()).each(function(){$('a:eq('+a+')',this).click()})});$('a.jqTransformCheckbox, a.jqTransformRadio',f).removeClass('jqTransformChecked');$('input:checkbox, input:radio',f).each(function(){if(this.checked){$('a',$(this).parent()).addClass('jqTransformChecked')}})};$.fn.jqTransInputButton=function(){return this.each(function(){$(this).replaceWith('<button id="'+this.id+'" name="'+this.name+'" type="'+this.type+'" class="'+this.className+' jqTransformButton"><span><span>'+$(this).attr('value')+'</span></span>')})};$.fn.jqTransInputText=function(){return this.each(function(){var a=$.browser.safari;var b=$(this);if(b.hasClass('jqtranformdone')||!b.is('input')){return}b.addClass('jqtranformdone');var c=o($(this));c&&c.bind('click',function(){b.focus()});var d=b.width();if(b.attr('size')){d=b.attr('size')*10;b.css('width',d)}b.addClass("jqTransformInput").wrap('<div class="jqTransformInputWrapper"><div class="jqTransformInputInner"><div></div></div></div>');var e=b.parent().parent().parent();e.css("width",d+10);b.focus(function(){e.addClass("jqTransformInputWrapper_focus")}).blur(function(){e.removeClass("jqTransformInputWrapper_focus")}).hover(function(){e.addClass("jqTransformInputWrapper_hover")},function(){e.removeClass("jqTransformInputWrapper_hover")});a&&e.addClass('jqTransformSafari');a&&b.css('width',e.width()+16);this.wrapper=e})};$.fn.jqTransCheckBox=function(){return this.each(function(){var b=$(this);var c=this;if(b.hasClass('jqTransformHidden')){return}var d=o(b);b.addClass('jqTransformHidden').wrap('<span class="jqTransformCheckboxWrapper"></span>');var e=b.parent();var f=$('<a href="#" class="jqTransformCheckbox"></a>');e.prepend(f);f.click(function(){var a=$(this);if(c.checked===true){c.checked=false;a.removeClass('jqTransformChecked')}else{c.checked=true;a.addClass('jqTransformChecked')}c.onchange&&c.onchange();return false});d&&d.click(function(){f.trigger('click')});this.checked&&f.addClass('jqTransformChecked')})};$.fn.jqTransRadio=function(){return this.each(function(){var b=$(this);var c=this;if(b.hasClass('jqTransformHidden')){return}oLabel=o(b);b.addClass('jqTransformHidden').wrap('<span class="jqTransformRadioWrapper"></span>');var d=b.parent();var e=$('<a href="#" class="jqTransformRadio" rel="'+this.name+'"></a>');d.prepend(e);e.each(function(){this.radioElem=c;$(this).click(function(){var a=$(this).addClass('jqTransformChecked');c.checked=true;$('a.jqTransformRadio[rel="'+a.attr('rel')+'"]',c.form).not(a).each(function(){$(this).removeClass('jqTransformChecked');this.radioElem.checked=false});c.onchange&&c.onchange();return false})});oLabel&&oLabel.click(function(){e.trigger('click')});c.checked&&e.addClass('jqTransformChecked')})};$.fn.jqTransTextarea=function(){return this.each(function(){var a=$(this);if(a.hasClass('jqtransformdone')){return}a.addClass('jqtransformdone');oLabel=o(a);oLabel&&oLabel.click(function(){a.focus()});var b='<table cellspacing="0" cellpadding="0" border="0" class="jqTransformTextarea">';b+='<tr><td id="jqTransformTextarea-tl">&nbsp;</td><td id="jqTransformTextarea-tm">&nbsp;</td><td id="jqTransformTextarea-tr">&nbsp;</td></tr>';b+='<tr><td id="jqTransformTextarea-ml">&nbsp;</td><td id="jqTransformTextarea-mm"><div></div></td><td id="jqTransformTextarea-mr">&nbsp;</td></tr>';b+='<tr><td id="jqTransformTextarea-bl">&nbsp;</td><td id="jqTransformTextarea-bm">&nbsp;</td><td id="jqTransformTextarea-br">&nbsp;</td></tr>';b+='</table>';var c=$(b).insertAfter(a).hover(function(){!c.hasClass('jqTransformTextarea-focus')&&c.addClass('jqTransformTextarea-hover')},function(){c.removeClass('jqTransformTextarea-hover')});a.focus(function(){c.removeClass('jqTransformTextarea-hover').addClass('jqTransformTextarea-focus')}).blur(function(){c.removeClass('jqTransformTextarea-focus')}).appendTo($('#jqTransformTextarea-mm div',c));this.oTable=c;if($.browser.safari){$('#jqTransformTextarea-mm',c).addClass('jqTransformSafariTextarea').find('div').css('height',a.height()).css('width',a.width())}})};$.fn.jqTransSelect=function(){return this.each(function(b){var c=$(this);if(c.hasClass('jqTransformHidden')){return}var d=o(c);c.addClass('jqTransformHidden').wrap('<div class="jqTransformSelectWrapper"></div>');var e=c.parent().css({zIndex:10-b});e.prepend('<div><span></span><a href="#" class="jqTransformSelectOpen"></a></div><ul></ul>');var f=$('ul',e).css('width',c.width());$('option',this).each(function(i){var a=$('<li><a href="#" index="'+i+'">'+$(this).html()+'</a></li>');f.append(a)});f.hide().find('a').click(function(){$('a.selected',e).removeClass('selected');$(this).addClass('selected');if(c[0].selectedIndex!=$(this).attr('index')&&c[0].onchange){c[0].selectedIndex=$(this).attr('index');c[0].onchange()}c[0].selectedIndex=$(this).attr('index');$('span:eq(0)',e).html($(this).html());f.hide();return false});$('a:eq('+this.selectedIndex+')',f).click();$('span:first',e).click(function(){$("a.jqTransformSelectOpen",e).trigger('click')});d&&d.click(function(){$("a.jqTransformSelectOpen",e).trigger('click')});this.oLabel=d;var g=$('a.jqTransformSelectOpen',e).click(function(){if(f.css('display')=='none'){p()}f.slideToggle('normal',function(){var a=($('a.selected',f).offset().top-f.offset().top);f.animate({scrollTop:a})});return false});var h=c.width();var j=$('span:first',e);var k=(h>j.innerWidth())?h+g.outerWidth():e.width();e.css('width',k);f.css('width',k-2);j.css('width',h)})};$.fn.jqTransform=function(h){var i=this;var j=$.browser.safari;var k=$.extend({},l,h);return this.each(function(){var b=$(this);if(b.hasClass('jqtransformdone')){return}b.addClass('jqtransformdone');$('input:submit, input:reset, input[type="button"]',this).jqTransInputButton();$('input:text, input:password',this).jqTransInputText();$('input:checkbox',this).jqTransCheckBox();$('input:radio',this).jqTransRadio();$('textarea',this).jqTransTextarea();if($('select',this).jqTransSelect().length>0){r()}b.bind('reset',function(){var a=function(){s(this)};window.setTimeout(a,10)});if(k.preloadImg&&!m){m=true;var c=$('input:text:first',b);if(c.length>0){var d=c.get(0).wrapper.css('background-image');n(d);var e=$('div.jqTransformInputInner',$(c.get(0).wrapper)).css('background-image');n(e)}var f=$('textarea',b);if(f.length>0){var g=f.get(0).oTable;$('td',g).each(function(){var a=$(this).css('background-image');n(a)})}}})}})(jQuery);

/*
 * jQuery EasIng v1.1.2 - http://gsgd.co.uk/sandbox/jquery.easIng.php
 *
 * Uses the built In easIng capabilities added In jQuery 1.1
 * to offer multiple easIng options
 *
 * Copyright (c) 2007 George Smith
 * Licensed under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 */

// t: current time, b: begInnIng value, c: change In value, d: duration

jQuery.extend( jQuery.easing,
{
    easeInQuad: function (x, t, b, c, d) {
        return c*(t/=d)*t + b;
    },
    easeOutQuad: function (x, t, b, c, d) {
        return -c *(t/=d)*(t-2) + b;
    },
    easeInOutQuad: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b;
        return -c/2 * ((--t)*(t-2) - 1) + b;
    },
    easeInCubic: function (x, t, b, c, d) {
        return c*(t/=d)*t*t + b;
    },
    easeOutCubic: function (x, t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b;
    },
    easeInOutCubic: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    },
    easeInQuart: function (x, t, b, c, d) {
        return c*(t/=d)*t*t*t + b;
    },
    easeOutQuart: function (x, t, b, c, d) {
        return -c * ((t=t/d-1)*t*t*t - 1) + b;
    },
    easeInOutQuart: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
        return -c/2 * ((t-=2)*t*t*t - 2) + b;
    },
    easeInQuint: function (x, t, b, c, d) {
        return c*(t/=d)*t*t*t*t + b;
    },
    easeOutQuint: function (x, t, b, c, d) {
        return c*((t=t/d-1)*t*t*t*t + 1) + b;
    },
    easeInOutQuint: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
        return c/2*((t-=2)*t*t*t*t + 2) + b;
    },
    easeInSine: function (x, t, b, c, d) {
        return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    },
    easeOutSine: function (x, t, b, c, d) {
        return c * Math.sin(t/d * (Math.PI/2)) + b;
    },
    easeInOutSine: function (x, t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    },
    easeInExpo: function (x, t, b, c, d) {
        return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
    },
    easeOutExpo: function (x, t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    },
    easeInOutExpo: function (x, t, b, c, d) {
        if (t==0) return b;
        if (t==d) return b+c;
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    },
    easeInCirc: function (x, t, b, c, d) {
        return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
    },
    easeOutCirc: function (x, t, b, c, d) {
        return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
    },
    easeInOutCirc: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
        return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
    },
    easeInElastic: function (x, t, b, c, d) {
        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
    },
    easeOutElastic: function (x, t, b, c, d) {
        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
    },
    easeInOutElastic: function (x, t, b, c, d) {
        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
    },
    easeInBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*(t/=d)*t*((s+1)*t - s) + b;
    },
    easeOutBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
    },
    easeInOutBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158; 
        if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
        return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
    },
    easeInBounce: function (x, t, b, c, d) {
        return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
    },
    easeOutBounce: function (x, t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
            return c*(7.5625*t*t) + b;
        } else if (t < (2/2.75)) {
            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
        } else if (t < (2.5/2.75)) {
            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
        } else {
            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
        }
    },
    easeInOutBounce: function (x, t, b, c, d) {
        if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
        return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
    }
});









/*!
 * Overscroll v1.3.5
 *  A jQuery Plugin that emulates the iPhone scrolling experience in a browser.
 *  http://azoffdesign.com/overscroll
 *
 * Intended for use with the latest jQuery
 *  http://code.jquery.com/jquery-latest.min.js
 *
 * Copyright 2010, Jonathan Azoff
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *  http://jquery.org/license
 *
 * Date: Thursday, August 26th 2010
 */

/* 
 * Usage:
 * 
 * $(selector).overscroll([options]);
 *  "options" is an optional JavaScript object that you may pass if you would like to customize
 *  the experience of the overscroll element. Below is a list of properties that you may set on
 *  the options object and their respective effect:
 *
 *   - options.showThumbs       {Boolean}   Designates whether or not to show the scroll-bar thumbs
 *                                          on the scrollable container (default true).
 *   - options.openedCursor     {String}    A url pointing at a .cur file to be used as the cursor when
 *                                          hovering over the overscrolled element (default 'opened.cur').
 *   - options.closedCursor     {String}    A url pointing at a .cur file to be used as the cursor when
 *                                          dragging the overscrolled element (default 'closed.cur').
 *   - options.direction        {String}    The scroll direction of the overscrolled element, by default it will
 *                                          auto-detect the available directions. You can also restrict
 *                                          direction by setting this property equal to 'vertical' or  
 *                                          'horizontal'
 *   - options.wheelDirection   {String}    The direction scrolled when the mouse wheel is triggered. Options are
 *                                          'horizontal' for left/right scrolling and 'vertical' as default.
 *   - options.wheelDelta       {Number}    The amount of drift to apply per mouse wheel 'tick', defauts to 20
 *   - options.scrollDelta      {Number}    The amount of drift to apply per drag interval, defauts to 5.7
 *   - options.onDriftEnd       {Function}  A function to be called at the end of every drift, default $.noop
 *
 * Notes:
 * 
 * In order to get the most out of this plugin, make sure to only apply it to parent elements 
 * that are smaller than the collective width and/or height then their children. This way,
 * you can see the actual scroll effect as you pan the element.
 *
 * While you can programatically control whether or not overscroll allows horizontal and/or
 * vertical scroll, it is best practice to size the child elements accordingly (via CSS) and
 * not depend on programatic restrictions.
 *
 * As of 1.3.1, if you would like to add click handlers to links inside of overscroll, you can 
 * dynamially check the state of the overscrolled element via the jQuery.data method. This ability
 * should allow you to exit a click handler if a drag state is detected. For example, an overscrolled 
 * jQuery element "elm" can be checked for drag state via elm.data("dragging").
 *
 * You MUST have two cursors to get the "hand" to show up, open, and close during the panning 
 * process. You can store the cursors wherever you want, just make sure to reference them in 
 * the code below. I have provided initial static linkages to these cursors for your 
 * convenience.        
 *
 * Changelog:
 *
 * 1.3.5
 *   - Added the ability to toggle mouse wheel scroll direction via options.wheelDirection (thanks Volderr)
 *      - http://github.com/azoff/Overscroll/issues/4
 *   - Fixed bug with mouse wheel scroll direction (thanks Volderr)
 *   - Cached the cursor CSS
 * 1.3.4
 *   - Added the ability to call a function at the end of the drift via options.onDriftEnd (thanks Volderr)
 *      - http://github.com/azoff/Overscroll/issues/4
 * 1.3.3
 *   - Added the ability to control the drift delta (drift strength per scroll tick) via options.[wheel|scroll]Delta
 *      - http://github.com/azoff/Overscroll/issues/3
 *   - Made mouse wheel scrolling more efficient via deferred fade out call
 * 1.3.2
 *   - Updated documentation, added README file for Github
 *   - Fixed undefined error on mouse wheel scroll for horizontal scrollers.
 *      - http://github.com/azoff/Overscroll/issues/1
 *   - Added the ability to restrict scroll direction via options.direction
 * 1.3.1
 *   - Made the dragging state externally visible via .data("dragging")
 * 1.3.0
 *   - Merged iThumbs and Overscroll
 *   - Added the ability to pass in options
 *   - Moved all code to GitHub
 *   - Several improvements to the thumb code
 *   - Greased up the scroll a bit more
 *   - Removed the jerky animation on mouse wheel
 *   - Added caching for cursors
 * 1.2.1
 *   - Made "smart" click support "smarter" :)
 *   - Added JSLint validation to the build process
 *   - Removed unused variables and cleaned up code
 * 1.2.0
 *   - Updated license to match the jQuery license (thanks Jesse)
 *   - Added vertical scroll wheel support (thanks Pwakman)
 *   - Added support to ignore proprietary drag events (thanks Raphael)
 *   - Added "smart" click support for clickable elements (thanks Mark)
 * 1.1.2
 *   - Added the correct click handling to the scroll operation (thanks Evilc)
 * 1.1.1
 *   - Made scroll a bit smoother (thanks Nick)
 * 1.1.0
 *   - Optimized scrolling-internals so that it is both smoother and more memory efficient 
 *     (relies entirely on event model now). 
 *   - Added the ability to scroll horizontally (if the overscrolled element has wider children).
 * 1.0.3
 *   - Extended the easing object, as opposed to the $ object (thanks Andre)
 * 1.0.2
 *   - Fixed timer to actually return milliseconds (thanks Don)
 * 1.0.1
 *   - Fixed bug with interactive elements and made scrolling smoother (thanks Paul and Aktar)
 */

/*jslint onevar: true, strict: true */
/*global window, jQuery */
"use strict"; 

(function(w, m, $, o){

    // create overscroll
    o = $.fn.overscroll = function(options) {
        return this.each(function(){
            o.init($(this), options);
        });
    };
    
    $.extend(o, {
        
        // events handled by overscroll
        events: {
            wheel: "mousewheel DOMMouseScroll",
            start: "select mousedown touchstart",
            drag: "mousemove touchmove",
            scroll: "scroll",
            end: "mouseup mouseleave touchend",
            ignored: "dragstart drag"
        },
        
        // to save a couble bits
        div: "<div/>",
        noop: function(){return false;},
        
        // constants used to tune scrollability and thumbs
        constants: {
            scrollDuration: 800,
            timeout: 400,
            captureThreshold: 3,
            wheelDelta: 20,
            scrollDelta: 5.9,
            thumbThickness: 8,
            thumbOpacity: 0.7,
            boundingBox: 1000000
        },
        
        // main initialization function
        init: function(target, options, data) {
            
            data = {
                sizing: o.getSizing(target)
            };
            
            options = $.extend({
                openedCursor: "http://github.com/downloads/azoff/Overscroll/opened.cur",
                closedCursor: "http://github.com/downloads/azoff/Overscroll/closed.cur",
                showThumbs: true,
                wheelDirection: 'vertical',
                wheelDelta: o.constants.wheelDelta,
                scrollDelta: o.constants.scrollDelta,
                direction: 'multi',
                onDriftEnd: $.noop
            }, (options || {}));
            
            options.scrollDelta = m.abs(options.scrollDelta);
            options.wheelDelta = m.abs(options.wheelDelta);
            
            // cache cursors
            options.cache = { openedCursor: new Image(), closedCursor: new Image() };
            options.cache.openedCursor.src = options.openedCursor;
            options.cache.closedCursor.src = options.closedCursor;
            
            // set css
            options.openedCss = {cursor: "url('"+options.openedCursor+"'),default"};
            options.closedCss = {cursor: "url('"+options.closedCursor+"'),default"};
            
            target.css('overflow', 'hidden').css(options.openedCss)
                .bind(o.events.wheel, data, o.wheel)
                .bind(o.events.start, data, o.start)
                .bind(o.events.end, data, o.stop)
                .bind(o.events.ignored, o.noop); // disable proprietary drag handlers
                
            if(options.showThumbs) {
                
                data.thumbs = {};
                                
                if(data.sizing.container.scrollWidth > 0 && options.direction !== 'vertical') {
                    data.thumbs.horizontal = $(o.div).css(o.getThumbCss(data.sizing.thumbs.horizontal)).fadeTo(0, 0);
                    target.prepend(data.thumbs.horizontal); 
                }
                
                if(data.sizing.container.scrollHeight > 0 && options.direction !== 'horizontal') {
                    data.thumbs.vertical = $(o.div).css(o.getThumbCss(data.sizing.thumbs.vertical)).fadeTo(0, 0);
                    target.prepend(data.thumbs.vertical);               
                }
                
                data.sizing.relative = data.thumbs.vertical || data.thumbs.horizontal;
                
                if(data.sizing.relative) {
                    data.sizing.relative.oldOffset = data.sizing.relative.offset();
                    target.scrollTop(o.constants.boundingBox).scrollLeft(o.constants.boundingBox);
                    data.sizing.relative.remove().prependTo(target);
                    data.sizing.relative.newOffset = data.sizing.relative.offset();
                    data.sizing.relative = 
                        data.sizing.relative.oldOffset.left != data.sizing.relative.newOffset.left ||
                        data.sizing.relative.oldOffset.top != data.sizing.relative.newOffset.top;
                    target.scrollTop(0).scrollLeft(0);
                    target.bind(o.events.scroll, data, o.scroll);
                }

            }
            
            data.target = target;
            data.options = options;
                
        },
        
        // toggles the drag mode of the target
        toggleDragMode: function(data, dragging) {
            if(dragging) {
                data.target.css(data.options.closedCss);
            } else {
                data.target.css(data.options.openedCss);
            }
            if(data.thumbs) {
                if(dragging) {
                    if(data.thumbs.vertical) {
                        data.thumbs.vertical.stop(true, true).fadeTo("fast", o.constants.thumbOpacity);
                    }
                    if(data.thumbs.horizontal) {
                        data.thumbs.horizontal.stop(true, true).fadeTo("fast", o.constants.thumbOpacity);
                    }
                } else {
                    if(data.thumbs.vertical) {
                        data.thumbs.vertical.fadeTo("fast", 0);
                    }
                    if(data.thumbs.horizontal) {
                        data.thumbs.horizontal.fadeTo("fast", 0);
                    }
                }
            }
        },
        
        // sets a position object
        setPosition: function(event, position, index) {
            position.x = event.pageX;
            position.y = event.pageY;
            position.index = index;
            return position;
        },
        
        // handles mouse wheel scroll events
        wheel: function(event, delta) {
            
            if ( event.wheelDelta ) { 
                delta = event.wheelDelta/ (w.opera ? -120 : 120);
            }
            
            if ( event.detail ) { 
                delta = -event.detail/3; 
            }
            
            if(!event.data.wheelCapture) {
                event.data.wheelCapture = { timeout: null };
                o.toggleDragMode(event.data, true);
                event.data.target.stop(true, true).data('dragging', true);
            }
            
            delta *= event.data.options.wheelDelta;
            
            if(event.data.options.wheelDirection === 'horizontal') {
                this.scrollLeft -= delta;
            } else {
                this.scrollTop -= delta;
            }
            
            if(event.data.wheelCapture.timeout) {
                clearTimeout(event.data.wheelCapture.timeout);
            }
            
            event.data.wheelCapture.timeout = setTimeout(function(d){
                event.data.wheelCapture = undefined;
                o.toggleDragMode(event.data, false);
                event.data.target.data('dragging', false);
                event.data.options.onDriftEnd.call(event.data.target, event.data);
            }, o.constants.timeout);
        
            return false;
            
        },
        
        // handles a scroll event
        scroll: function(event, thumbs, sizing, left, top, ml, mt) {
            
            thumbs = event.data.thumbs;
            sizing = event.data.sizing;
            left = this.scrollLeft;
            top = this.scrollTop;
            
            if (thumbs.horizontal) {
                ml = left * sizing.container.width / sizing.container.scrollWidth;
                mt = sizing.thumbs.horizontal.top;
                if(sizing.relative) { ml += left; mt += top; }
                thumbs.horizontal.css("margin", mt + "px 0 0 " + ml + "px");    
            }

            if (thumbs.vertical) {
                ml = sizing.thumbs.vertical.left;
                mt = top * sizing.container.height / sizing.container.scrollHeight;
                if(sizing.relative) { ml += left; mt += top; }
                thumbs.vertical.css("margin", mt + "px 0 0 " + ml + "px");
            }
        
        },
        
        // starts the drag operation and binds the mouse move handler
        start: function(event) {

            event.data.target.bind(o.events.drag, event.data, o.drag).stop(true, true).data('dragging', false);
            o.toggleDragMode(event.data, true);
            event.data.position = o.setPosition(event, {});
            event.data.capture = o.setPosition(event, {}, 2);
            
            return false;
            
        },
        
        // updates the current scroll location during a mouse move
        drag: function(event, ml, mt, left, top) {

            if(event.data.options.direction !== 'vertical') {
               this.scrollLeft -= (event.pageX - event.data.position.x);
            }
            if(event.data.options.direction !== 'horizontal') {
               this.scrollTop -= (event.pageY - event.data.position.y);
            }
            
            o.setPosition(event, event.data.position);
            
            if (--event.data.capture.index <= 0 ) {
                event.data.target.data('dragging', true);
                o.setPosition(event, event.data.capture, o.constants.captureThreshold);
            }

            return true;
        
        },
        
        // ends the drag operation and unbinds the mouse move handler
        stop: function(event, dx, dy, d) {

            if(event.data.position) {

                event.data.target.unbind(o.events.drag, o.drag);
                
                if(event.data.target.data('dragging')) {
                 
                    dx = event.data.options.scrollDelta * (event.pageX - event.data.capture.x);
                    dy = event.data.options.scrollDelta * (event.pageY - event.data.capture.y);
                    d = {};

                    if(event.data.options.direction !== 'vertical') {
                        d.scrollLeft = this.scrollLeft - dx;
                    }

                    if(event.data.options.direction !== 'horizontal') {
                        d.scrollTop = this.scrollTop - dy;
                    }

                    event.data.target.animate(d, {  
                        duration: o.constants.scrollDuration, 
                        easing: 'cubicEaseOut',
                        complete: function() {
                            event.data.target.data('dragging', false);
                            event.data.options.onDriftEnd.call(event.data.target, event.data);
                            o.toggleDragMode(event.data, false);
                        }
                    });
                    
                } else {
                     o.toggleDragMode(event.data, false);
                }
                
                event.data.capture = event.data.position = undefined;
                
            }
            
            return !event.data.target.data('dragging');
        },
        
        // gets sizing for the container and thumbs
        getSizing: function(container, sizing) {
        
            sizing = { };
            
            sizing.container = {
                width: container.width(),
                height: container.height()
            };
            
            container.scrollLeft(o.constants.boundingBox).scrollTop(o.constants.boundingBox);
            sizing.container.scrollWidth = container.scrollLeft();
            sizing.container.scrollHeight = container.scrollTop();                          
            container.scrollTop(0).scrollLeft(0);
                    
            sizing.thumbs = {
                horizontal: {
                    width: sizing.container.width * sizing.container.width / sizing.container.scrollWidth,
                    height: o.constants.thumbThickness,
                    corner: o.constants.thumbThickness / 2,
                    left: 0,
                    top: sizing.container.height - o.constants.thumbThickness
                },
                vertical: {
                    width: o.constants.thumbThickness,
                    height: sizing.container.height * sizing.container.height / sizing.container.scrollHeight,
                    corner: o.constants.thumbThickness / 2,
                    left: sizing.container.width - o.constants.thumbThickness,
                    top: 0
                }
            };
            
            sizing.container.width -= sizing.thumbs.horizontal.width;
            sizing.container.height -= sizing.thumbs.vertical.height;
            
            return sizing;
            
        },
        
        // gets the CSS object for a thumb
        getThumbCss: function(size) {
        
            return {
                position: "absolute",
                "background-color": "black",
                width: size.width + "px",
                height: size.height + "px",
                "margin": size.top + "px 0 0 " + size.left + "px",
                "-moz-border-radius": size.corner + "px",
                "-webkit-border-radius":  size.corner + "px", 
                "border-radius":  size.corner + "px"
            };
            
        }
        
    });

    // jQuery adapted Penner animation
    //    created by Jamie Lemon
    $.extend($.easing, {
        
        cubicEaseOut: function(p, n, firstNum, diff) {
            var c = firstNum + diff;
            return c*((p=p/1-1)*p*p + 1) + firstNum;
        }
        
    });

})(window, Math, jQuery);




























var imgSizer = {
    Config : {
        imgCache : []
        ,spacer : "/path/to/your/spacer.gif"
    }

    ,collate : function(aScope) {
        var isOldIE = (document.all && !window.opera && !window.XDomainRequest) ? 1 : 0;
        if (isOldIE && document.getElementsByTagName) {
            var c = imgSizer;
            var imgCache = c.Config.imgCache;

            var images = (aScope && aScope.length) ? aScope : document.getElementsByTagName("img");
            for (var i = 0; i < images.length; i++) {
                images[i].origWidth = images[i].offsetWidth;
                images[i].origHeight = images[i].offsetHeight;

                imgCache.push(images[i]);
                c.ieAlpha(images[i]);
                images[i].style.width = "100%";
            }

            if (imgCache.length) {
                c.resize(function() {
                    for (var i = 0; i < imgCache.length; i++) {
                        var ratio = (imgCache[i].offsetWidth / imgCache[i].origWidth);
                        imgCache[i].style.height = (imgCache[i].origHeight * ratio) + "px";
                    }
                });
            }
        }
    }

    ,ieAlpha : function(img) {
        var c = imgSizer;
        if (img.oldSrc) {
            img.src = img.oldSrc;
        }
        var src = img.src;
        img.style.width = img.offsetWidth + "px";
        img.style.height = img.offsetHeight + "px";
        img.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "', sizingMethod='scale')"
        img.oldSrc = src;
        img.src = c.Config.spacer;
    }

    // Ghettomodified version of Simon Willison's addLoadEvent() -- http://simonwillison.net/2004/May/26/addLoadEvent/
    ,resize : function(func) {
        var oldonresize = window.onresize;
        if (typeof window.onresize != 'function') {
            window.onresize = func;
        } else {
            window.onresize = function() {
                if (oldonresize) {
                    oldonresize();
                }
                func();
            }
        }
    }
}