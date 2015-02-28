// Main plotting library - Creates the Plotly object and Plotly.Plots
(function(root, factory){
    if (typeof exports == 'object') {
        // CommonJS
        module.exports = factory(root, require('./plotly'));
    } else {
        // Browser globals
        if (!root.Plotly) { root.Plotly = {}; }
        factory(root, root.Plotly);
    }
}(this, function(exports, Plotly){
    // `exports` is `window`
    // `Plotly` is `window.Plotly`

    'use strict';
    /* jshint camelcase: false */

    // ---Plotly global modules
    /* global SceneFrame:false, Examples:false, ENV:false */

    // ---global functions not yet namespaced
    /* global setFileAndCommentsSize:false */

    // ---external global dependencies
    /* global Promise:false, d3:false */

    var plots = {};

    // Most of the generic plotting functions get put into Plotly.Plots,
    // but some - the ones we want 3rd-party developers to use - go directly
    // into Plotly. These are:
    //   plot
    //   restyle
    //   relayout

    plots.isScatter = function(type) {
        return !type || type==='scatter';
    };

    var BARTYPES = ['bar','histogram'];
    plots.isBar = function(type) {
        return BARTYPES.indexOf(type)!==-1;
    };

    plots.isBox = function(type) {
        return type === 'box';
    };

    var HEATMAPTYPES = ['heatmap','histogram2d','contour','histogram2dcontour'];
    plots.isHeatmap = function(type) {
        return HEATMAPTYPES.indexOf(type) !== -1;
    };

    var CONTOURTYPES = ['contour','histogram2dcontour'];
    plots.isContour = function(type) {
        return CONTOURTYPES.indexOf(type) !== -1;
    };

    var HIST2DTYPES = ['histogram2d','histogram2dcontour'];
    plots.isHist2D = function(type) {
        return HIST2DTYPES.indexOf(type) !== -1;
    };

    var CARTESIANTYPES = ['scatter', 'box'].concat(BARTYPES, HEATMAPTYPES);
    plots.isCartesian = function(type) {
        return CARTESIANTYPES.indexOf(type) !== -1;
    };

    var GL3DTYPES = ['scatter3d', 'surface'];
    plots.isGL3D = function(type) {
        return GL3DTYPES.indexOf(type) !== -1;
    };

    plots.isScatter3D = function(type) {
        return type === 'scatter3d';
    };

    plots.isScatterAny = function(type) {
        return plots.isScatter(type) || plots.isScatter3D(type);
    };

    plots.isSurface = function(type) {
        return type === 'surface';
    };

    // ALLTYPES and getModule are used for the graph_reference app

    plots.ALLTYPES = CARTESIANTYPES.concat(GL3DTYPES);

    plots.getModule = function getModule(trace) {
        var type = trace.type;

        if('r' in trace) {
            console.log('Oops, tried to put a polar trace of type ' +
                type + ' on an incompatible graph of cartesian ' +
                'data. Ignoring this dataset.'
            );
            return;
        }
        if (plots.isScatter(type)) return Plotly.Scatter;
        if (plots.isBar(type)) return Plotly.Bars;
        if (plots.isContour(type)) return Plotly.Contour;
        if (plots.isHeatmap(type)) return Plotly.Heatmap;
        if (plots.isScatter3D(type)) return Plotly.Scatter3D;
        if (plots.isSurface(type)) return Plotly.Surface;
        if (plots.isBox(type)) return Plotly.Boxes;

        console.log('Unrecognized plot type ' + type +
            '. Ignoring this dataset.'
        );
    };

    // new workspace tab. Perhaps this goes elsewhere, a workspace-only file???
    plots.newTab = function(divid, layout) {
        Plotly.ToolPanel.makeMenu(document.getElementById(divid));
        var config = {
            workspace: true,
            editable: true,
            autosizable: true,
            scrollZoom: true,
            showTips: false,
            showLink: false
        };
        return Plotly.plot(divid, [], layout, config);
    };

    // in some cases the browser doesn't seem to know how big
    // the text is at first, so it needs to draw it,
    // then wait a little, then draw it again
    plots.redrawText = function(divid) {
        var gd = (typeof divid === 'string') ?
            document.getElementById(divid) : divid;

        // doesn't work presently (and not needed) for polar or 3d
        if(gd._fullLayout._hasGL3D || (gd.data && gd.data[0] && gd.data[0].r)) {
            return;
        }

        setTimeout(function(){
            Plotly.Annotations.drawAll(gd);
            Plotly.Legend.draw(gd, gd._fullLayout.showlegend);
            (gd.calcdata||[]).forEach(function(d){
                if(d[0]&&d[0].t&&d[0].t.cb) d[0].t.cb();
            });
        },300);
    };

    // this will be transfered over to gd and overridden by
    // config args to Plotly.plot
    // the defaults are the appropriate settings for plotly.js,
    // so we get the right experience without any config argument
    plots.defaultConfig = {
        staticPlot: false, // no interactivity, for export or image generation
        workspace: false, // we're in the workspace, so need toolbar etc TODO describe functionality instead?
        editable: false, // we can edit titles, move annotations, etc
        autosizable: false, // plot will respect layout.autosize=true and infer its container size
        fillFrame: false, // if we DO autosize, do we fill the container or the screen?
        scrollZoom: false, // mousewheel or two-finger scroll zooms the plot
        showTips: true, // new users see some hints about interactivity
        showLink: true, // link to open this plot in plotly
        sendData: true, // if we show a link, does it contain data or just link to a plotly file?
        displayModeBar: 'hover', // display the modebar (true, false, or 'hover')
        displaylogo: true // add the plotly logo on the end of the modebar
    };

    function setPlotContext(gd, config) {
        if(!gd._context) gd._context = $.extend({}, plots.defaultConfig);
        var context = gd._context;

        if(config) {
            Object.keys(config).forEach(function(key) {
                if(key in context) context[key] = config[key];
            });

            // cause a remake of the modebar any time we change context
            if(gd._fullLayout && gd._fullLayout._modebar) {
                delete gd._fullLayout._modebar;
            }
        }

        // TODO: get rid of this - don't use gd.<attribute>, only gd._context.<attribute>
        Object.keys(plots.defaultConfig).forEach( function (key) {
            if (config && key in config) gd[key] = config[key];
            else gd[key] = plots.defaultConfig[key];
        });

        //staticPlot forces a bunch of others:
        if(context.staticPlot) {
            context.workspace = false;
            context.editable = false;
            context.autosizable = false;
            context.scrollZoom = false;
            context.showTips = false;
            context.showLink = false;
            context.displayModeBar = false;
        }
    }

    // the 'view in plotly' and source links - note that now plot() calls this
    // so it can regenerate whenever it replots
    plots.addLinks = function(gd) {
        var fullLayout = gd._fullLayout;
        var linkContainer = fullLayout._paper.selectAll('text.js-plot-link-container').data([0]);

        linkContainer.enter().append('text')
            .classed('js-plot-link-container',true)
            .style({
                'font-family':'"Open Sans",Arial,sans-serif',
                'font-size':'12px',
                'fill':'#444'
            })
            .each(function(){
                var links = d3.select(this);
                links.append('tspan').classed('js-link-to-tool',true);
                links.append('tspan').classed('js-link-spacer',true);
                links.append('tspan').classed('js-sourcelinks',true);
            });

        // The text node inside svg
        var text = Array.isArray(linkContainer[0]) ? linkContainer[0][0] : null,
            attrs = {
                y: fullLayout._paper.attr('height') - 9
            };

        // If text's width is bigger than the layout
        if (text && text.getComputedTextLength() >= (fullLayout.width - 20)) {
            // Align the text at the left
            attrs['text-anchor'] = 'start';
            attrs['x'] = 5;
        } else {
            // Align the text at the right
            attrs['text-anchor'] = 'end';
            attrs['x'] = fullLayout._paper.attr('width') - 7;
        }

        linkContainer.attr(attrs);


        var toolspan = linkContainer.select('.js-link-to-tool'),
            spacespan = linkContainer.select('.js-link-spacer'),
            sourcespan = linkContainer.select('.js-sourcelinks');

        // data source links
        Plotly.Lib.showSources(gd);

        // 'view in plotly' link for embedded plots
        if(gd._context.showLink) positionPlayWithData(gd,toolspan);

        // separator if we have both sources and tool link
        spacespan.text((toolspan.text() && sourcespan.text()) ? ' - ' : '');
    };

    /**
     * Add or modify a margin requst object by name. Margins in pixels.
     *
     * This allows us to have multiple modules request space in the plot without
     * conflicts. For example:
     *
     * adjustReservedMargins(gd, 'themeBar', {left: 200})
     *
     * ... will idempotent-ly set the left margin to 200 for themeBar.
     *
     * @param gd
     * @param {String} marginName
     * @param {Object} margins
     * @returns {Object}
     */
    plots.adjustReservedMargins = function (gd, marginName, margins) {
        var margin;
        gd._boundingBoxMargins = gd._boundingBoxMargins || {};
        gd._boundingBoxMargins[marginName] = {};
        ['left', 'right', 'top', 'bottom'].forEach(function(key) {
            margin = margins[key] || 0;
            gd._boundingBoxMargins[marginName][key] = margin;
        });
        return gd._boundingBoxMargins;
    };

    // note that now this function is only adding the brand in
    // iframes and 3rd-party apps
    function positionPlayWithData(gd,container){
        container.text('');
        var link = container.append('a')
            .attr({
                'xlink:xlink:href': '#',
                'class': 'link--impt link--embedview',
                'font-weight':'bold'
            })
            .text((Plotly.LINKTEXT || 'Play with this data!') +
                  ' ' + String.fromCharCode(187));

        if(gd._context.sendData) {
            link.on('click',function(){
                $(gd).trigger('plotly_beforeexport');

                var hiddenform = $(
                    '<div id="hiddenform" style="display:none;">' +
                    '<form action="https://plot.ly/external" ' +
                        'method="post" target="_blank">'+
                    '<input type="text" name="data" /></form></div>'
                ).appendTo(gd);

                hiddenform.find('input').val(plots.graphJson(gd,false,'keepdata'));
                hiddenform.find('form').submit();
                hiddenform.remove();

                $(gd).trigger('plotly_afterexport');
                return false;
            });
        }
        else {
            var path=window.location.pathname.split('/');
            link.attr({
                'xlink:xlink:show': 'new',
                'xlink:xlink:href': '/'+path[1]+'/'+path[2].split('.')[0]
            });
        }
    }

    // ----------------------------------------------------
    // Main plot-creation function. Note: will call makePlotFramework
    // if necessary to create the framework
    // ----------------------------------------------------
    // inputs:
    //      gd - the id or DOM element of the graph container div
    //      data - array of traces, containing the data and display
    //          information for each trace
    //      layout - object describing the overall display of the plot,
    //          all the stuff that doesn't pertain to any individual trace
    Plotly.plot = function(gd, data, layout, config) {
        Plotly.Lib.markTime('in plot');

        // Get the container div: we store all variables for this plot as
        // properties of this div
        // some callers send this in by dom element, others by id (string)
        if(typeof gd === 'string') gd = document.getElementById(gd);

        var okToPlot = $(gd).triggerHandler('plotly_beforeplot', [data, layout, config]);
        if(okToPlot===false) return;

        // if there's no data or layout, and this isn't yet a plotly plot
        // container, log a warning to help plotly.js users debug
        if(!data && !layout && !d3.select(gd).classed('js-plotly-plot')) {
            console.log('Warning: calling Plotly.plot as if redrawing ' +
                'but this container doesn\'t yet have a plot.', gd);
        }

        // transfer configuration options to gd until we move over to
        // a more OO like model
        setPlotContext(gd, config);

        if(!layout) layout = {};

        // hook class for plots main container (in case of plotly.js
        // this won't be #embedded-graph or .js-tab-contents)
        d3.select(gd).classed('js-plotly-plot',true);

        // off-screen getBoundingClientRect testing space,
        // in #js-plotly-tester (and stored as gd._tester)
        // so we can share cached text across tabs
        Plotly.Drawing.makeTester(gd);

        // collect promises for any async actions during plotting
        // any part of the plotting code can push to gd._promises, then
        // before we move to the next step, we check that they're all
        // complete, and empty out the promise list again.
        gd._promises = [];

        // if there is already data on the graph, append the new data
        // if you only want to redraw, pass a non-array for data
        var graphwasempty = ((gd.data||[]).length===0 && $.isArray(data));
        if($.isArray(data)) {
            cleanData(data, gd.data);

            if(graphwasempty) gd.data=data;
            else gd.data.push.apply(gd.data,data);

            // for routines outside graph_obj that want a clean tab
            // (rather than appending to an existing one) gd.empty
            // is used to determine whether to make a new tab
            gd.empty=false;
        }

        if(!gd.layout || graphwasempty) gd.layout = cleanLayout(layout);

        // if the user is trying to drag the axes, allow new data and layout
        // to come in but don't allow a replot.
        if(gd._dragging) {
            // signal to drag handler that after everything else is done
            // we need to replot, because something has changed
            gd._replotPending = true;
            return;
        } else {
            // we're going ahead with a replot now
            gd._replotPending = false;
        }

        plots.supplyDefaults(gd);

        // Polar plots
        if(data && data[0] && data[0].r) return plotPolar(gd, data, layout);

        if(gd._context.editable) Plotly.ToolPanel.tweakMenu(gd);

        // so we don't try to re-call Plotly.plot from inside
        // legend and colorbar, if margins changed
        gd._replotting = true;
        var hasData = gd._fullData.length>0;

        // Make or remake the framework (ie container and axes) if we need to
        // note: if they container already exists and has data,
        //  the new layout gets ignored (as it should)
        //  but if there's no data there yet, it's just a placeholder...
        //  then it should destroy and remake the plot
        if (hasData) {
            var subplots = Plotly.Axes.getSubplots(gd).join(''),
                oldSubplots = Object.keys(gd._fullLayout._plots || {}).join('');

            if(gd.framework!==makePlotFramework || graphwasempty || (oldSubplots!==subplots)) {
                gd.framework = makePlotFramework;
                makePlotFramework(gd);
            }
        }
        else if(graphwasempty) makePlotFramework(gd);

        // enable or disable formatting buttons
        $(gd).find('.data-only').attr('disabled', !hasData);

        var fullLayout = gd._fullLayout;

        // prepare the data and find the autorange

        // generate calcdata, if we need to
        // to force redoing calcdata, just delete it before calling Plotly.plot
        var recalc = !gd.calcdata || gd.calcdata.length!==(gd.data||[]).length;
        if(recalc) doCalcdata(gd);

        // in case it has changed, attach fullData traces to calcdata
        gd.calcdata.forEach(function(cd, i) {
            cd[0].trace = gd._fullData[i];
        });

        /*
         * start async-friendly code - now we're actually drawing things
         */

        var oldmargins = JSON.stringify(fullLayout._size);

        // draw anything that can affect margins.
        // currently this is legend and colorbars
        function marginPushers() {
            Plotly.Legend.draw(gd, fullLayout.showlegend ||
                (gd.calcdata.length>1 && fullLayout.showlegend!==false));
            gd.calcdata.forEach(function(cd) {
                var trace = cd[0].trace;
                if(trace.visible !== true || !trace._module.colorbar) {
                    plots.autoMargin(gd,'cb'+trace.uid);
                }
                else trace._module.colorbar(gd,cd);
            });
            doAutoMargin(gd);
            return plots.previousPromises(gd);
        }

        function marginPushersAgain(){
            // in case the margins changed, draw margin pushers again
            var seq = JSON.stringify(fullLayout._size)===oldmargins ?
                [] : [marginPushers];
            return Plotly.Lib.syncOrAsync(seq.concat(Plotly.Fx.init),gd);
        }

        function positionAndAutorange(){
            if(recalc) {
                // position and range calculations for traces that
                // depend on each other ie bars (stacked or grouped)
                // and boxes (grouped) push each other out of the way
                Plotly.Axes.getSubplots(gd).forEach(function(subplot) {
                    var plotinfo = gd._fullLayout._plots[subplot];
                    gd._modules.forEach(function(module) {
                        if(module.setPositions) {
                            module.setPositions(gd,plotinfo);
                        }
                    });
                });

                Plotly.Lib.markTime('done with bar/box adjustments');

                // calc and autorange for errorbars
                Plotly.ErrorBars.calc(gd);
                Plotly.Lib.markTime('done Plotly.ErrorBars.calc');

                // TODO: autosize extra for text markers
                return Plotly.Lib.syncOrAsync([
                    Plotly.Shapes.calcAutorange,
                    Plotly.Annotations.calcAutorange,
                    doAutoRange
                ], gd);
            }
        }

        function doAutoRange(){
            Plotly.Axes.list(gd, '', true).forEach(function(ax) {
                Plotly.Axes.doAutoRange(ax);
                if(!$.isNumeric(ax._m) || !$.isNumeric(ax._b)) {
                    Plotly.Lib.notifier(
                        'Something went wrong with axis scaling',
                        'long');
                    gd._replotting = false;
                    throw new Error('axis scaling');
                }
            });
        }

        function drawAxes(){
            // draw ticks, titles, and calculate axis scaling (._b, ._m)
            return Plotly.Axes.doTicks(gd, 'redraw');
        }

        function drawData(){
            // Now plot the data

            // clean up old scenes that no longer have associated data
            // will this be a performance hit?
            if (gd._fullLayout._hasGL3D) plot3D(gd);

            // in case of traces that were heatmaps or contour maps
            // previously, remove them and their colorbars explicitly
            gd.calcdata.forEach(function(cd) {
                var trace = cd[0].trace;
                if(trace.visible !== true || !trace._module.colorbar) {
                    var uid = trace.uid;
                    fullLayout._paper.selectAll('.hm'+uid+',.contour'+uid+',.cb'+uid)
                        .remove();
                }
            });

            Plotly.Axes.getSubplots(gd).forEach(function(subplot) {
                var plotinfo = gd._fullLayout._plots[subplot],
                    cdSubplot = gd.calcdata.filter(function(cd) {
                        var trace = cd[0].trace;
                        return trace.xaxis + trace.yaxis === subplot;
                    }),
                    cdError = [];

                // remove old traces, then redraw everything
                // TODO: use enter/exit appropriately in the plot functions
                // so we don't need this - should sometimes be a big speedup
                plotinfo.plot.selectAll('g.trace').remove();

                gd._modules.forEach(function(module) {
                    if(!module.plot) return;
                    // plot all traces of this type on this subplot at once
                    var cdmod = cdSubplot.filter(function(cd){
                        var trace = cd[0].trace;
                        return trace._module === module && trace.visible === true;
                    });
                    module.plot(gd,plotinfo,cdmod);
                    Plotly.Lib.markTime('done ' + (cdmod[0] && cdmod[0][0].trace.type));

                    // collect the traces that may have error bars
                    if(module.errorBarsOK) cdError = cdError.concat(cdmod);
                });
                // finally do all error bars at once
                Plotly.ErrorBars.plot(gd,plotinfo,cdError);
                Plotly.Lib.markTime('done ErrorBars');
            });

            //styling separate from drawing
            applyStyle(gd);
            Plotly.Lib.markTime('done applyStyle');

            // show annotations and shapes
            Plotly.Shapes.drawAll(gd);
            Plotly.Annotations.drawAll(gd);

            // source links
            plots.addLinks(gd);

            return plots.previousPromises(gd);
        }

        function cleanUp(){
            // now we're REALLY TRULY done plotting...
            // so mark it as done and let other procedures call a replot
            gd._replotting = false;
            Plotly.Lib.markTime('done plot');
            $(gd).trigger('plotly_afterplot');
        }

        var donePlotting = Plotly.Lib.syncOrAsync([
            plots.previousPromises,
            marginPushers,
            layoutStyles,
            marginPushersAgain,
            positionAndAutorange,
            drawAxes,
            drawData
        ], gd, cleanUp);

        // even if everything we did was synchronous, return a promise
        // so that the caller doesn't care which route we took
        return (donePlotting && donePlotting.then) ?
            donePlotting : Promise.resolve() ;
    };

    function plot3D(gd) {
        var fullLayout = gd._fullLayout,
            fullData = gd._fullData;

        /*
         * Once Webgl plays well with other things we can remove this.
         * Unset examples, they misbehave with 3d plots
         */
        var $examplesContainer = $(gd).find('.examples-container');
        if ($examplesContainer.css('display') === 'block') {
            Examples.set();
        }

        fullLayout._paperdiv.style({
            width: fullLayout.width+'px',
            height: fullLayout.height+'px',
            background: fullLayout.paper_bgcolor
        });

        // Get traces attached to a scene
        function getSceneData(data, sceneKey) {
            var i_trace = 0,
                trace = null,
                sceneData = [];
            for (i_trace; i_trace < data.length; ++i_trace) {
                trace = data[i_trace];
                if (trace.scene === sceneKey) sceneData.push(trace);
            }
            return sceneData;
        }

        // Get list of scenes from fullLayout
        var sceneKeys = Plotly.Lib.getSceneKeys(fullLayout),
            i_sceneKey = 0;

        // Loop through scenes
        for (i_sceneKey; i_sceneKey < sceneKeys.length; ++i_sceneKey) {
            var sceneKey = sceneKeys[i_sceneKey],
                sceneData = getSceneData(fullData, sceneKey),
                sceneLayout = fullLayout[sceneKey],
                scene = sceneLayout._scene;  // ref. to corresp. Scene instance

            // If Scene is not instantiated, create one!
            if (!(scene)) {
                var sceneFrameOptions = {
                    Plotly: Plotly,
                    container: gd.querySelector('.svg-container'),
                    sceneKey: sceneKey,
                    sceneData: sceneData,
                    sceneLayout: sceneLayout,
                    fullLayout: fullLayout,
                    baseurl: ENV.BASE_URL,
                    glOptions: {preserveDrawingBuffer: gd._context.staticPlot}
                };
                scene = SceneFrame.createScene(sceneFrameOptions);
                sceneLayout._scene = scene;  // set ref to Scene instance
            }

            scene.plot(sceneData, sceneLayout);  // takes care of business
        }
    }

    function plotPolar(gd, data, layout, config) {
        // build or reuse the container skeleton
        var plotContainer = d3.select(gd).selectAll('.plot-container')
            .data([0]);
        plotContainer.enter()
            .insert('div', ':first-child')
            .classed('plot-container plotly', true);
        var paperDiv = plotContainer.selectAll('.svg-container')
            .data([0]);
        paperDiv.enter().append('div')
            .classed('svg-container',true)
            .style('position','relative');

        // empty it everytime for now
        paperDiv.html('');

        // fulfill gd requirements
        if(data) gd.data = data;
        gd._fullLayout = layout;
        gd._fullLayout._container = plotContainer;
        gd._fullLayout._paperdiv = paperDiv;
        if(gd._fullLayout.autosize === 'initial' && gd._context.autosizable) {
            plotAutoSize(gd,{});
            gd._fullLayout.autosize = gd.layout.autosize = true;
        }
        // resize canvas
        paperDiv.style({
            width: (layout.width || 800) + 'px',
            height: (layout.height || 600) + 'px',
            background: (layout.paper_bgcolor || 'white')
        });

        // instantiate framework
        gd.framework = Plotly.micropolar.manager.framework();
        //get rid of gd.layout stashed nodes
        layout = Plotly.micropolar.util.deepExtend({}, gd._fullLayout);
        delete layout._container;
        delete layout._paperdiv;
        delete layout.autosize;
        delete layout._paper;

        // plot
        gd.framework({data: gd.data, layout: layout}, paperDiv.node());

        // set undo point
        gd.framework.setUndoPoint();

        // get the resulting svg for extending it
        var polarPlotSVG = gd.framework.svg();

        // editable title
        var opacity = 1;
        var txt = gd._fullLayout.title;
        if(txt === '' || !txt) opacity = 0;
        var placeholderText = 'Click to enter title';

        var titleLayout = function(){
            this.call(Plotly.util.convertToTspans);
            //TODO: html/mathjax
            //TODO: center title
        };

        var title = polarPlotSVG.select('.title-group text')
            .call(titleLayout);

        if(gd._context.editable){
            title.attr({'data-unformatted': txt});
            if(!txt || txt === placeholderText){
                opacity = 0.2;
                title.attr({'data-unformatted': placeholderText})
                    .text(placeholderText)
                    .style({opacity: opacity})
                    .on('mouseover.opacity',function(){
                        d3.select(this).transition().duration(100)
                            .style('opacity',1);
                    })
                    .on('mouseout.opacity',function(){
                        d3.select(this).transition().duration(1000)
                            .style('opacity',0);
                    });
            }

            var setContenteditable = function(){
                this.call(Plotly.util.makeEditable)
                    .on('edit', function(text){
                        gd.framework({layout: {title: text}});
                        this.attr({'data-unformatted': text})
                            .text(text)
                            .call(titleLayout);
                        this.call(setContenteditable);
                    })
                    .on('cancel', function(){
                        var txt = this.attr('data-unformatted');
                        this.text(txt).call(titleLayout);
                    });
            };
            title.call(setContenteditable);

            gd._fullLayout._paperdiv = paperDiv;

            Plotly.ToolPanel.tweakMenu(gd);
        }

        // fulfill more gd requirements
        gd._fullLayout._paper = polarPlotSVG;
        plots.addLinks(gd);

        return Promise.resolve();
    }

    function cleanLayout(layout) {
        // make a few changes to the layout right away
        // before it gets used for anything
        // backward compatibility and cleanup of nonstandard options
        var i;

        if(!layout) layout = {};

        // cannot have (x|y)axis1, numbering goes axis, axis2, axis3...
        if(layout.xaxis1) {
            if(!layout.xaxis) layout.xaxis = layout.xaxis1;
            delete layout.xaxis1;
        }
        if(layout.yaxis1) {
            if(!layout.yaxis) layout.yaxis = layout.yaxis1;
            delete layout.yaxis1;
        }

        var axList = Plotly.Axes.list({_fullLayout:layout});
        for(i = 0; i < axList.length; i++) {
            var ax = axList[i];
            if(ax.anchor && ax.anchor !== 'free') {
                ax.anchor = Plotly.Axes.cleanId(ax.anchor);
            }
            if(ax.overlaying) ax.overlaying = Plotly.Axes.cleanId(ax.overlaying);

            // old method of axis type - isdate and islog (before category existed)
            if(!ax.type) {
                if(ax.isdate) ax.type='date';
                else if(ax.islog) ax.type='log';
                else if(ax.isdate===false && ax.islog===false) ax.type='linear';
            }
            if(ax.autorange==='withzero' || ax.autorange==='tozero') {
                ax.autorange = true;
                ax.rangemode = 'tozero';
            }
            delete ax.islog;
            delete ax.isdate;
            delete ax.categories; // replaced by _categories

            // prune empty domain arrays made before the new nestedProperty
            if(emptyContainer(ax, 'domain')) delete ax.domain;
        }

        if(layout.annotations !== undefined && !Array.isArray(layout.annotations)) {
            console.log('annotations must be an array');
            delete layout.annotations;
        }
        var annotationsLen = (layout.annotations || []).length;
        for(i = 0; i < annotationsLen; i++) {
            var ann = layout.annotations[i];
            if(ann.ref) {
                if(ann.ref==='paper') {
                    ann.xref = 'paper';
                    ann.yref = 'paper';
                }
                else if(ann.ref==='data') {
                    ann.xref = 'x';
                    ann.yref = 'y';
                }
                delete ann.ref;
            }
            cleanAxRef(ann, 'xref');
            cleanAxRef(ann, 'yref');
        }

        if(layout.shapes !== undefined && !Array.isArray(layout.shapes)) {
            console.log('shapes must be an array');
            delete layout.shapes;
        }
        var shapesLen = (layout.shapes||[]).length;
        for(i = 0; i < shapesLen; i++) {
            var shape = layout.shapes[i];
            cleanAxRef(shape, 'xref');
            cleanAxRef(shape, 'yref');
        }

        // cannot have scene1, numbering goes scene, scene2, scene3...
        if(layout.scene1) {
            if(!layout.scene) layout.scene = layout.scene1;
            delete layout.scene1;
        }

        var sceneKeys = Plotly.Lib.getSceneKeys(layout);
        for(i = 0; i < sceneKeys.length; i++) {
            var sceneLayout = layout[sceneKeys[i]];
            // fix for saved float32-arrays
            var camp = sceneLayout.cameraposition;
            if (Array.isArray(camp) && $.isPlainObject(camp[0])) {
                camp[0] = [camp[0][0], camp[0][1], camp[0][2], camp[0][3]];
                camp[1] = [camp[1][0], camp[1][1], camp[1][2]];
            }
        }

        var legend = layout.legend;
        if(legend) {
            // check for old-style legend positioning (x or y is +/- 100)
            if(legend.x > 3) {
                legend.x = 1.02;
                legend.xanchor = 'left';
            }
            else if(legend.x < -2) {
                legend.x = -0.02;
                legend.xanchor = 'right';
            }

            if(legend.y > 3) {
                legend.y = 1.02;
                legend.yanchor = 'bottom';
            }
            else if(legend.y < -2) {
                legend.y = -0.02;
                legend.yanchor = 'top';
            }
        }

        return layout;
    }

    function cleanAxRef(container, attr) {
        var valIn = container[attr],
            axLetter = attr.charAt(0);
        if(valIn && valIn !== 'paper') {
            container[attr] = Plotly.Axes.cleanId(valIn, axLetter);
        }
    }

    function cleanData(data, existingData) {
        // make a few changes to the data right away
        // before it gets used for anything

        /*
         * Enforce unique IDs
         */
        var suids = [], // seen uids --- so we can weed out incoming repeats
            uids = data.concat($.isArray(existingData) ? existingData : [])
                   .filter( function(trace) { return 'uid' in trace; } )
                   .map( function(trace) { return trace.uid; });

        for(var tracei = 0; tracei < data.length; tracei++) {
            var trace = data[tracei];
            // assign uids to each trace and detect collisions.
            if (!('uid' in trace) || suids.indexOf(trace.uid) !== -1) {
                var newUid, i;
                for(i=0; i<100; i++) {
                    newUid = Plotly.Lib.randstr(uids);
                    if(suids.indexOf(newUid)===-1) break;
                }
                trace.uid = Plotly.Lib.randstr(uids);
                uids.push(trace.uid);
            }
            // keep track of already seen uids, so that if there are
            // doubles we force the trace with a repeat uid to
            // acquire a new one
            suids.push(trace.uid);

            // BACKWARD COMPATIBILITY FIXES

            // use xbins to bin data in x, and ybins to bin data in y
            if(trace.type==='histogramy' && 'xbins' in trace && !('ybins' in trace)) {
                trace.ybins = trace.xbins;
                delete trace.xbins;
            }

            // error_y.opacity is obsolete - merge into color
            if(trace.error_y && 'opacity' in trace.error_y) {
                var dc = Plotly.Color.defaults,
                    yeColor = trace.error_y.color ||
                    (plots.isBar(trace.type) ? '#444' : dc[tracei % dc.length]);
                trace.error_y.color = Plotly.Color.addOpacity(
                    Plotly.Color.rgb(yeColor),
                    Plotly.Color.opacity(yeColor) * trace.error_y.opacity);
                delete trace.error_y.opacity;
            }

            // convert bardir to orientation, and put the data into
            // the axes it's eventually going to be used with
            if('bardir' in trace) {
                if(trace.bardir==='h' && (plots.isBar(trace.type) ||
                         trace.type.substr(0,9)==='histogram')) {
                    trace.orientation = 'h';
                    swapXYData(trace);
                }
                delete trace.bardir;
            }

            // now we have only one 1D histogram type, and whether
            // it uses x or y data depends on trace.orientation
            if(trace.type==='histogramy') swapXYData(trace);
            if(trace.type==='histogramx' || trace.type==='histogramy') {
                trace.type = 'histogram';
            }

            // scl->scale, reversescl->reversescale
            if('scl' in trace) {
                trace.colorscale = trace.scl;
                delete trace.scl;
            }
            if('reversescl' in trace) {
                trace.reversescale = trace.reversescl;
                delete trace.reversescl;
            }

            // axis ids x1 -> x, y1-> y
            if(trace.xaxis) trace.xaxis = Plotly.Axes.cleanId(trace.xaxis, 'x');
            if(trace.yaxis) trace.yaxis = Plotly.Axes.cleanId(trace.yaxis, 'y');

            // scene ids scene1 -> scene
            if (trace.scene) {
                trace.scene = Plotly.Gl3dLayout.cleanId(trace.scene);
            }

            if(Array.isArray(trace.textposition)) {
                trace.textposition = trace.textposition.map(cleanTextPosition);
            }
            else if(trace.textposition) {
                trace.textposition = cleanTextPosition(trace.textposition);
            }

            // prune empty containers made before the new nestedProperty
            if(emptyContainer(trace, 'line')) delete trace.line;
            if('marker' in trace) {
                if(emptyContainer(trace.marker, 'line')) delete trace.marker.line;
                if(emptyContainer(trace, 'marker')) delete trace.marker;
            }
        }
    }

    // textposition - support partial attributes (ie just 'top')
    // and incorrect use of middle / center etc.
    function cleanTextPosition(textposition) {
        var posY = 'middle',
            posX = 'center';
        if(textposition.indexOf('top')!==-1) posY = 'top';
        else if(textposition.indexOf('bottom')!==-1) posY = 'bottom';

        if(textposition.indexOf('left')!==-1) posX = 'left';
        else if(textposition.indexOf('right')!==-1) posX = 'right';

        return posY + ' ' + posX;
    }

    function emptyContainer(outer, innerStr) {
        return (innerStr in outer) &&
            (typeof outer[innerStr] === 'object') &&
            (Object.keys(outer[innerStr]).length === 0);
    }

    // for use in Plotly.Lib.syncOrAsync, check if there are any
    // pending promises in this plot and wait for them
    plots.previousPromises = function(gd){
        if((gd._promises||[]).length) {
            return Promise.all(gd._promises)
                .then(function(){ gd._promises=[]; });
        }
    };

    // convenience function to force a full redraw, mostly for use by plotly.js
    Plotly.redraw = function(divid) {
        var gd = (typeof divid === 'string') ?
            document.getElementById(divid) : divid;
        if(!d3.select(gd).classed('js-plotly-plot')) {
            console.log('This element is not a Plotly Plot', divid, gd);
            return;
        }
        gd.calcdata = undefined;
        Plotly.plot(gd).then(function () {
            $(gd).trigger('plotly_redraw');
        });
    };

    /**
     * Convenience function to make idempotent plot option obvious to users.
     *
     * @param gd
     * @param {Object[]} data
     * @param {Object} layout
     * @param {Object} config
     */
    Plotly.newPlot = function (gd, data, layout, config) {
        Plotly.Plots.purge(gd);
        Plotly.plot(gd, data, layout, config);
    };

    plots.attributes = {
        type: {
            type: 'enumerated',
            values: plots.ALLTYPES,
            dflt: 'scatter'
        },
        visible: {
            type: 'enumerated',
            values: [true, false, 'legendonly'],
            dflt: true
        },
        scene: {
            // TODO should not be available in 2d layouts
            type: 'sceneid',
            dflt: 'scene'
        },
        showlegend: {
            type: 'boolean',
            dflt: true
        },
        opacity: {
            type: 'number',
            min: 0,
            max: 1,
            dflt: 1
        },
        name: {
            type: 'string'
        },
        xaxis: {
            // TODO should not be available in 3d layouts
            type: 'axisid',
            dflt: 'x'
        },
        yaxis: {
            // TODO should not be available in 3d layouts
            type: 'axisid',
            dflt: 'y'
        },
        uid: {
            type: 'string',
            dflt: ''
        },
        hoverinfo: {
            type: 'flaglist',
            flags: ['x', 'y', 'z', 'text', 'name'],
            extras: ['all', 'none'],
            dflt: 'all'
        }
    };

    plots.supplyDefaults = function(gd) {
        // fill in default values:
        // gd.data, gd.layout are precisely what the user specified
        // gd._fullData, gd._fullLayout are complete descriptions
        //      of how to draw the plot
        var oldFullLayout = gd._fullLayout || {},
            newFullLayout = gd._fullLayout = {},
            i,
            modulei;

        // first fill in what we can of layout without looking at data
        // because fullData needs a few things from layout
        plots.supplyLayoutGlobalDefaults(gd.layout||{}, newFullLayout);

        // then do the data
        var oldFullData = gd._fullData || [],
            newData = gd.data || [];
        gd._modules = [];
        gd._fullData = newData.map(function(trace, i) {
            var fullTrace = plots.supplyDataDefaults(trace, i, newFullLayout),
                module = fullTrace._module;

            if(module && gd._modules.indexOf(module)===-1) gd._modules.push(module);

            return fullTrace;
        });

        // special cases that introduce interactions between traces
        for(i = 0; i < gd._modules.length; i++) {
            modulei = gd._modules[i];
            if(modulei.cleanData) modulei.cleanData(gd._fullData);
        }

        // DETECT 3D, Cartesian, and Polar
        gd._fullData.forEach(function(d, i) {
            if(plots.isGL3D(d.type)) newFullLayout._hasGL3D = true;
            if(plots.isCartesian(d.type)) {
                if('r' in d) newFullLayout._hasPolar = true;
                else newFullLayout._hasCartesian = true;
            }
            if(oldFullData.length === newData.length) {
                relinkPrivateKeys(d, oldFullData[i]);
            }
        });

        // finally, fill in the pieces of layout that may need to look at data
        plots.supplyLayoutModuleDefaults(gd.layout||{}, newFullLayout, gd._fullData);

        cleanScenes(newFullLayout, oldFullLayout);

        // IN THE CASE OF 3D the underscore modules are Mikola's webgl contexts.
        // There will be all sorts of pain if we deep copy active webgl scopes.
        // Since we discard oldFullLayout, lets just copy the references over.
        relinkPrivateKeys(newFullLayout, oldFullLayout);

        doAutoMargin(gd);

        var axList = Plotly.Axes.list(gd);
        axList.forEach(function(ax) {
            // can't quite figure out how to get rid of this... each axis needs
            // a reference back to the DOM object for just a few purposes
            ax._td = gd;

            ax.setScale();
        });

        // update object references in calcdata
        if((gd.calcdata||[]).length===gd._fullData.length) {
            gd._fullData.forEach(function(trace, i) {
                (gd.calcdata[i][0]||{}).trace = trace;
            });
        }
    };

    function cleanScenes(newFullLayout, oldFullLayout) {
        var oldSceneKeys = Plotly.Lib.getSceneKeys(oldFullLayout);

        oldSceneKeys.forEach(function(oldSceneKey) {
            if(!newFullLayout[oldSceneKey] && !!oldFullLayout[oldSceneKey]._scene) {
                oldFullLayout[oldSceneKey]._scene.destroy();
            }
        });
    }

    // relink private _keys and keys with a function value from one layout
    // (usually cached) to the new fullLayout.
    // relink means copying if object is pass-by-value and adding a reference
    // if object is pass-by-ref. This prevents deepCopying massive structures like
    // a webgl context.
    function relinkPrivateKeys(toLayout, fromLayout) {

        var keys = Object.keys(fromLayout),
            j;

        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i];
            if(k.charAt(0)==='_' || typeof fromLayout[k]==='function') {
                // if it already exists at this point, it's something
                // that we recreate each time around, so ignore it
                if(k in toLayout) continue;

                toLayout[k] = fromLayout[k];
            }
            else if (Array.isArray(fromLayout[k]) &&
                     Array.isArray(toLayout[k]) &&
                     fromLayout[k].length &&
                     $.isPlainObject(fromLayout[k][0])) {
                if(fromLayout[k].length !== toLayout[k].length) {
                    // this should be handled elsewhere, it causes
                    // ambiguity if we try to deal with it here.
                    throw new Error('relinkPrivateKeys needs equal ' +
                                    'length arrays');
                }

                for(j = 0; j < fromLayout[k].length; j++) {
                    relinkPrivateKeys(toLayout[k][j], fromLayout[k][j]);
                }
            }
            else if ($.isPlainObject(fromLayout[k]) &&
                     $.isPlainObject(toLayout[k])) {
                // recurse into objects, but only if they still exist
                relinkPrivateKeys(toLayout[k], fromLayout[k]);
                if (!Object.keys(toLayout[k]).length) delete toLayout[k];
            }
        }
    }

    plots.supplyDataDefaults = function(traceIn, i, layout) {
        var traceOut = {},
            defaultColor = Plotly.Color.defaults[i % Plotly.Color.defaults.length];

        function coerce(attr, dflt) {
            return Plotly.Lib.coerce(traceIn, traceOut, plots.attributes, attr, dflt);
        }

        // module-independent attributes
        traceOut.index = i;
        var type = coerce('type'),
            visible = coerce('visible'),
            scene,
            module;

        coerce('uid');

        // this is necessary otherwise we lose references to scene objects when
        // the traces of a scene are invisible. Also we handle visible/unvisible
        // differently for 3D cases.
        if (plots.isGL3D(type)) scene = coerce('scene');

        // module-specific attributes --- note: we need to send a trace into
        // the 3D modules to have it removed from the webgl context.
        if (visible || scene) {
            module = plots.getModule(traceOut);
            traceOut._module = module;
        }

        if (module && visible) module.supplyDefaults(traceIn, traceOut, defaultColor, layout);

        if(visible) {
            coerce('name', 'trace '+i);

            coerce('hoverinfo');

            if(!plots.isScatter3D(type)) coerce('opacity');

            if(plots.isCartesian(type)) {
                coerce('xaxis');
                coerce('yaxis');
            }

            if(!plots.isHeatmap(type) && !plots.isSurface(type)) {
                coerce('showlegend');
            }
        }

        // NOTE: I didn't include fit info at all... for now I think it can stay
        // just in gd.data, as this info isn't involved in creating plots at all,
        // only in pulling back up the fit popover

        // reference back to the input object for convenience
        traceOut._input = traceIn;

        return traceOut;
    };

    plots.layoutAttributes = {
        font: {
            type: 'font',
            dflt: {
                family: '"Open sans", verdana, arial, sans-serif',
                size: 12,
                color: '#444'
            }
        },
        title: {
            type: 'string',
            dflt: 'Click to enter Plot title'
        },
        titlefont: {type: 'font'},
        autosize: {
            type: 'enumerated',
            // TODO: better handling of 'initial'
            values: [true, false, 'initial']
        },
        width: {
            type: 'number',
            min: 10,
            dflt: 700
        },
        height: {
            type: 'number',
            min: 10,
            dflt: 450
        },
        margin: {
            l: {
                type: 'number',
                min: 0,
                dflt: 80
            },
            r: {
                type: 'number',
                min: 0,
                dflt: 80
            },
            t: {
                type: 'number',
                min: 0,
                dflt: 100
            },
            b: {
                type: 'number',
                min: 0,
                dflt: 80
            },
            pad: {
                type: 'number',
                min: 0,
                dflt: 0
            },
            autoexpand: {
                type: 'boolean',
                dflt: true
            }
        },
        paper_bgcolor: {
            type: 'color',
            dflt: '#fff'
        },
        plot_bgcolor: {
            // defined here, but set in Axes.supplyLayoutDefaults
            // because it needs to know if there are (2D) axes or not
            type: 'color',
            dflt: '#fff'
        },
        separators: {
            type: 'string',
            dflt: '.,'
        },
        hidesources: {
            type: 'boolean',
            dflt: false
        },
        smith: {
            // will become a boolean if/when we implement this
            type: 'enumerated',
            values: [false],
            dflt: false
        },
        showlegend: {
            // handled in legend.supplyLayoutDefaults
            // but included here because it's not in the legend object
            type: 'boolean'
        },
        _hasCartesian: {
            type: 'boolean',
            dflt: false
        },
        _hasGL3D: {
            type: 'boolean',
            dflt: false
        }
    };

    plots.supplyLayoutGlobalDefaults = function(layoutIn, layoutOut) {
        function coerce(attr, dflt) {
            return Plotly.Lib.coerce(layoutIn, layoutOut, plots.layoutAttributes, attr, dflt);
        }

        var globalFont = coerce('font');
        coerce('title');
        coerce('titlefont', {
            family: globalFont.family,
            size: Math.round(globalFont.size * 1.4),
            color: globalFont.color
        });

        coerce('autosize', (layoutIn.width && layoutIn.height) ? false : 'initial');
        coerce('width');
        coerce('height');

        // TODO: sanity check that margins leave room for the plot
        // but this requires fulfilling autosize first
        coerce('margin.l');
        coerce('margin.r');
        coerce('margin.t');
        coerce('margin.b');
        coerce('margin.pad');
        coerce('margin.autoexpand');

        coerce('paper_bgcolor');

        coerce('separators');
        coerce('hidesources');
        coerce('smith');
        coerce('_hasCartesian');
        coerce('_hasGL3D');
    };

    plots.supplyLayoutModuleDefaults = function(layoutIn, layoutOut, fullData) {

        var moduleLayoutDefaults = ['Axes', 'Legend', 'Annotations', 'Shapes', 'Fx',
                                    'Bars', 'Boxes', 'Gl3dLayout'];

        // don't add a check for 'function in module' as it is better to error out and
        // secure the module API then not apply the default function.
        moduleLayoutDefaults.forEach( function (module) {
            if (Plotly[module]) Plotly[module].supplyLayoutDefaults(layoutIn, layoutOut, fullData);
        });
    };

    plots.purge = function(gd) {
        // remove all plotly attributes from a div so it can be replotted fresh
        // TODO: these really need to be encapsulated into a much smaller set...

        // note: we DO NOT remove _context because it doesn't change when we insert
        // a new plot, and may have been set outside of our scope.

        // data and layout
        delete gd.data;
        delete gd.layout;
        delete gd._fullData;
        delete gd._fullLayout;
        delete gd.calcdata;
        delete gd.framework;
        delete gd.empty;

        delete gd.fid;

        delete gd.undoqueue; // action queue
        delete gd.undonum;
        delete gd.autoplay; // are we doing an action that doesn't go in undo queue?
        delete gd.changed;

        // these get recreated on Plotly.plot anyway, but just to be safe
        // (and to have a record of them...)
        delete gd._modules;
        delete gd._tester;
        delete gd._testref;
        delete gd._promises;
        delete gd._redrawTimer;
        delete gd._replotting;
        delete gd.firstscatter;
        delete gd.hmlumcount;
        delete gd.hmpixcount;
        delete gd.numboxes;
        delete gd._hoverTimer;
        delete gd._lastHoverTime;
    };

    function doCalcdata(gd) {
        gd.calcdata = [];

        // extra helper variables
        // firstscatter: fill-to-next on the first trace goes to zero
        gd.firstscatter = true;

        // how many box plots do we have (in case they're grouped)
        gd.numboxes = 0;

        // for calculating avg luminosity of heatmaps
        gd._hmpixcount = 0;
        gd._hmlumcount = 0;

        // delete category list, if there is one, so we start over
        // to be filled in later by ax.d2c
        Plotly.Axes.list(gd).forEach(function(ax){ ax._categories = []; });

        gd.calcdata = gd._fullData.map(function(trace, i) {
            var module = trace._module,
                cd = [];

            if(module && trace.visible === true) {
                if(module.calc) cd = module.calc(gd,trace);
            }

            // make sure there is a first point
            // this ensures there is a calcdata item for every trace,
            // even if cartesian logic doesn't handle it
            if(!$.isArray(cd) || !cd[0]) cd = [{x: false, y: false}];

            // add the trace-wide properties to the first point,
            // per point properties to every point
            // t is the holder for trace-wide properties
            if(!cd[0].t) cd[0].t = {};
            cd[0].trace = trace;

            // this is a kludge to put the array attributes into
            // calcdata the way Scatter.plot does, so that legends and
            // popovers know what to do with them.
            if(plots.isScatter3D(trace.type)) {
                Plotly.Scatter.arraysToCalcdata(cd);
            }

            Plotly.Lib.markTime('done with calcdata for '+i);
            return cd;
        });
    }

    function applyStyle(gd) {
        var fullLayout = gd._fullLayout;

        Plotly.Axes.getSubplots(gd).forEach(function(subplot) {
            var gp = fullLayout._plots[subplot].plot;

            gd._modules.concat(Plotly.ErrorBars).forEach(function(module) {
                if(module.style) module.style(gp, fullLayout);
            });
        });
    }

    /**
     * Wrap negative indicies to their positive counterparts.
     *
     * @param {Number[]} indices An array of indices
     * @param {Number} maxIndex The maximum index allowable (arr.length - 1)
     */
    function positivifyIndices(indices, maxIndex) {
        var parentLength = maxIndex + 1,
            positiveIndices = [],
            i,
            index;

        for (i = 0; i < indices.length; i++) {
            index = indices[i];
            if (index < 0) {
                positiveIndices.push(parentLength + index);
            } else {
                positiveIndices.push(index);
            }
        }
        return positiveIndices;
    }

    /**
     * Ensures that an index array for manipulating gd.data is valid.
     *
     * Intended for use with addTraces, deleteTraces, and moveTraces.
     *
     * @param gd
     * @param indices
     * @param arrayName
     */
    function validateIndexArray(gd, indices, arrayName) {
        var i,
            index;

        for (i = 0; i < indices.length; i++) {
            index = indices[i];

            // validate that indices are indeed integers
            if (index !== parseInt(index, 10)) {
                throw new Error('all values in ' + arrayName + ' must be integers');
            }

            // check that all indices are in bounds for given gd.data array length
            if (index >= gd.data.length || index < -gd.data.length) {
                throw new Error(arrayName + ' must be valid indices for gd.data.');
            }

            // check that indices aren't repeated
            if (indices.indexOf(index, i + 1) > -1 ||
                    index >= 0 && indices.indexOf(-gd.data.length + index) > -1 ||
                    index < 0 && indices.indexOf(gd.data.length + index) > -1) {
                throw new Error('each index in ' + arrayName + ' must be unique.');
            }
        }
    }

    /**
     * Private function used by Plotly.moveTraces to check input args
     *
     * @param gd
     * @param currentIndices
     * @param newIndices
     */
    function checkMoveTracesArgs(gd, currentIndices, newIndices) {

        // check that gd has attribute 'data' and 'data' is array
        if (!Array.isArray(gd.data)) {
            throw new Error('gd.data must be an array.');
        }

        // validate currentIndices array
        if (typeof currentIndices === 'undefined') {
            throw new Error('currentIndices is a required argument.');
        } else if (!Array.isArray(currentIndices)) {
            currentIndices = [currentIndices];
        }
        validateIndexArray(gd, currentIndices, 'currentIndices');

        // validate newIndices array if it exists
        if (typeof newIndices !== 'undefined' && !Array.isArray(newIndices)) {
            newIndices = [newIndices];
        }
        if (typeof newIndices !== 'undefined') {
            validateIndexArray(gd, newIndices, 'newIndices');
        }

        // check currentIndices and newIndices are the same length if newIdices exists
        if (typeof newIndices !== 'undefined' && currentIndices.length !== newIndices.length) {
            throw new Error('current and new indices must be of equal length.');
        }

    }
    /**
     * A private function to reduce the type checking clutter in addTraces.
     *
     * @param gd
     * @param traces
     * @param newIndices
     */
    function checkAddTracesArgs(gd, traces, newIndices) {
        var i,
            value;

        // check that gd has attribute 'data' and 'data' is array
        if (!Array.isArray(gd.data)) {
            throw new Error('gd.data must be an array.');
        }

        // make sure traces exists
        if (typeof traces === 'undefined') {
            throw new Error('traces must be defined.');
        }

        // make sure traces is an array
        if (!Array.isArray(traces)) {
            traces = [traces];
        }

        // make sure each value in traces is an object
        for (i = 0; i < traces.length; i++) {
            value = traces[i];
            if (typeof value !== 'object' || (Array.isArray(value) || value === null)) {
                throw new Error('all values in traces array must be non-array objects');
            }
        }

        // make sure we have an index for each trace
        if (typeof newIndices !== 'undefined' && !Array.isArray(newIndices)) {
            newIndices = [newIndices];
        }
        if (typeof newIndices !== 'undefined' && newIndices.length !== traces.length) {
            throw new Error(
                'if indices is specified, traces.length must equal indices.length'
            );
        }
    }

    /**
     * Add data traces to an existing graph div.
     *
     * @param {Object|HTMLDivElement} gd The graph div
     * @param {Object[]} gd.data The array of traces we're adding to
     * @param {Object[]|Object} traces The object or array of objects to add
     * @param {Number[]|Number} [newIndices=[gd.data.length]] Locations to add traces
     *
     */
    Plotly.addTraces = function addTraces (gd, traces, newIndices) {
        var currentIndices = [],
            undoFunc = Plotly.deleteTraces,
            redoFunc = addTraces,
            undoArgs = [gd, currentIndices],
            redoArgs = [gd, traces],  // no newIndices here
            i;

        // all validation is done elsewhere to remove clutter here
        checkAddTracesArgs(gd, traces, newIndices);

        // make sure traces is an array
        if (!Array.isArray(traces)) {
            traces = [traces];
        }

        // add the traces to gd.data (no redrawing yet!)
        for (i = 0; i < traces.length; i += 1) {
            gd.data.push(traces[i]);
        }

        // to continue, we need to call moveTraces which requires currentIndices
        for (i = 0; i < traces.length; i++) {
            currentIndices.push(-traces.length + i);
        }

        // if the user didn't define newIndices, they just want the traces appended
        // i.e., we can simply redraw and be done
        if (typeof newIndices === 'undefined') {
            Plotly.redraw(gd);
            if (Plotly.Queue) Plotly.Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
            return;
        }

        // make sure indices is property defined
        if (!Array.isArray(newIndices)) {
            newIndices = [newIndices];
        }

        try {

            // this is redundant, but necessary to not catch later possible errors!
            checkMoveTracesArgs(gd, currentIndices, newIndices);
        }
        catch(error) {

            // something went wrong, reset gd to be safe and rethrow error
            gd.data.splice(gd.data.length - traces.length, traces.length);
            throw error;
        }

        // if we're here, the user has defined specific places to place the new traces
        // this requires some extra work that moveTraces will do
        if (Plotly.Queue) Plotly.Queue.startSequence(gd);
        if (Plotly.Queue) Plotly.Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
        Plotly.moveTraces(gd, currentIndices, newIndices);
        if (Plotly.Queue) Plotly.Queue.stopSequence(gd);
    };

    /**
     * Delete traces at `indices` from gd.data array.
     *
     * @param {Object|HTMLDivElement} gd The graph div
     * @param {Object[]} gd.data The array of traces we're removing from
     * @param {Number|Number[]} indices The indices
     */
    Plotly.deleteTraces = function deleteTraces (gd, indices) {
        var traces = [],
            undoFunc = Plotly.addTraces,
            redoFunc = deleteTraces,
            undoArgs = [gd, traces, indices],
            redoArgs = [gd, indices],
            i,
            deletedTrace;

        // make sure indices are defined
        if (typeof indices === 'undefined') {
            throw new Error('indices must be an integer or array of integers.');
        } else if (!Array.isArray(indices)) {
            indices = [indices];
        }
        validateIndexArray(gd, indices, 'indices');

        // convert negative indices to positive indices
        indices = positivifyIndices(indices, gd.data.length - 1);

        // we want descending here so that splicing later doesn't affect indexing
        indices.sort().reverse();
        for (i = 0; i < indices.length; i += 1) {
            deletedTrace = gd.data.splice(indices[i], 1)[0];
            traces.push(deletedTrace);
        }

        Plotly.redraw(gd);

        if (Plotly.Queue) Plotly.Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
    };

    /**
     * Move traces at currentIndices array to locations in newIndices array.
     *
     * If newIndices is omitted, currentIndices will be moved to the end. E.g.,
     * these are equivalent:
     *
     * Plotly.moveTraces(gd, [1, 2, 3], [-3, -2, -1])
     * Plotly.moveTraces(gd, [1, 2, 3])
     *
     * @param {Object|HTMLDivElement} gd The graph div
     * @param {Object[]} gd.data The array of traces we're removing from
     * @param {Number|Number[]} currentIndices The locations of traces to be moved
     * @param {Number|Number[]} [newIndices] The locations to move traces to
     *
     * Example calls:
     *
     *      // move trace i to location x
     *      Plotly.moveTraces(gd, i, x)
     *
     *      // move trace i to end of array
     *      Plotly.moveTraces(gd, i)
     *
     *      // move traces i, j, k to end of array (i != j != k)
     *      Plotly.moveTraces(gd, [i, j, k])
     *
     *      // move traces [i, j, k] to [x, y, z] (i != j != k) (x != y != z)
     *      Plotly.moveTraces(gd, [i, j, k], [x, y, z])
     *
     *      // reorder all traces (assume there are 5--a, b, c, d, e)
     *      Plotly.moveTraces(gd, [b, d, e, a, c])  // same as 'move to end'
     */
    Plotly.moveTraces = function moveTraces (gd, currentIndices, newIndices) {
        var newData = [],
            movingTraceMap = [],
            undoFunc = moveTraces,
            redoFunc = moveTraces,
            undoArgs = [gd, newIndices, currentIndices],
            redoArgs = [gd, currentIndices, newIndices],
            i;

        // to reduce complexity here, check args elsewhere
        // this throws errors where appropriate
        checkMoveTracesArgs(gd, currentIndices, newIndices);

        // make sure currentIndices is an array
        currentIndices = Array.isArray(currentIndices) ? currentIndices : [currentIndices];

        // if undefined, define newIndices to point to the end of gd.data array
        if (typeof newIndices === 'undefined') {
            newIndices = [];
            for (i = 0; i < currentIndices.length; i++) {
                newIndices.push(-currentIndices.length + i);
            }
        }

        // make sure newIndices is an array if it's user-defined
        newIndices = Array.isArray(newIndices) ? newIndices : [newIndices];

        // convert negative indices to positive indices (they're the same length)
        currentIndices = positivifyIndices(currentIndices, gd.data.length - 1);
        newIndices = positivifyIndices(newIndices, gd.data.length - 1);

        // at this point, we've coerced the index arrays into predictable forms

        // get the traces that aren't being moved around
        for (i = 0; i < gd.data.length; i++) {

            // if index isn't in currentIndices, include it in ignored!
            if (currentIndices.indexOf(i) === -1) {
                newData.push(gd.data[i]);
            }
        }

        // get a mapping of indices to moving traces
        for (i = 0; i < currentIndices.length; i++) {
            movingTraceMap.push({newIndex: newIndices[i], trace: gd.data[currentIndices[i]]});
        }

        // reorder this mapping by newIndex, ascending
        movingTraceMap.sort(function (a, b) {
            return a.newIndex - b.newIndex;
        });

        // now, add the moving traces back in, in order!
        for (i = 0; i < movingTraceMap.length; i += 1) {
            newData.splice(movingTraceMap[i].newIndex, 0, movingTraceMap[i].trace);
        }

        gd.data = newData;

        Plotly.redraw(gd);

        if (Plotly.Queue) Plotly.Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
    };

    // -----------------------------------------------------
    // restyle and relayout: these two control all redrawing
    // for data (restyle) and everything else (relayout)
    // -----------------------------------------------------

    // restyle: change styling of an existing plot
    // can be called two ways:
    // restyle(gd,astr,val[,traces])
    //      gd - graph div (dom element)
    //      astr - attribute string (like 'marker.symbol')
    //      val - value to give this attribute
    //      traces - integer or array of integers for the traces
    //          to alter (all if omitted)
    // relayout(gd,aobj[,traces])
    //      aobj - {astr1:val1, astr2:val2...} allows setting
    //          multiple attributes simultaneously
    // val (or val1, val2... in the object form) can be an array,
    //  to apply different values to each trace
    // if the array is too short, it will wrap around (useful for
    //  style files that want to specify cyclical default values)
    Plotly.restyle = function restyle (gd,astr,val,traces) {
        if(typeof gd === 'string') gd = document.getElementById(gd);

        var i, fullLayout = gd._fullLayout,
            aobj = {};
        if(typeof astr === 'string') aobj[astr] = val;
        else if($.isPlainObject(astr)) {
            aobj = astr;
            if(traces===undefined) traces = val; // the 3-arg form
        }
        else {
            console.log('restyle fail',astr,val,traces);
            return;
        }

        if(Object.keys(aobj).length) gd.changed = true;

        if($.isNumeric(traces)) traces=[traces];
        else if(!$.isArray(traces) || !traces.length) {
            traces=gd._fullData.map(function(v,i){ return i; });
        }

        // recalcAttrs attributes need a full regeneration of calcdata
        // as well as a replot, because the right objects may not exist,
        // or autorange may need recalculating
        // in principle we generally shouldn't need to redo ALL traces... that's
        // harder though.
        var recalcAttrs = [
            'mode','visible','type','orientation','fill',
            'histfunc','histnorm','text',
            'x', 'y', 'z',
            'xtype','x0','dx','ytype','y0','dy','xaxis','yaxis',
            'line.width','showscale','zauto','connectgaps',
            'autobinx','nbinsx','xbins.start','xbins.end','xbins.size',
            'autobiny','nbinsy','ybins.start','ybins.end','ybins.size',
            'autocontour','ncontours','contours.coloring',
            'error_y.visible','error_y.value','error_y.type',
            'error_y.traceref','error_y.array','error_y.symmetric',
            'error_y.arrayminus','error_y.valueminus','error_y.tracerefminus',
            'error_x.visible','error_x.value','error_x.type',
            'error_x.traceref','error_x.array','error_x.symmetric',
            'error_x.arrayminus','error_x.valueminus','error_x.tracerefminus',
            'swapxy','swapxyaxes','orientationaxes'
        ];
        var hasBoxes = traces.some(function(v) {
            return Plotly.Plots.isBox(gd._fullData[v].type);
        });
        if(hasBoxes) recalcAttrs.push('name');

        // autorangeAttrs attributes need a full redo of calcdata
        // only if an axis is autoranged,
        // because .calc() is where the autorange gets determined
        // TODO: could we break this out as well?
        var autorangeAttrs = [
            'marker.size','textfont.size','textposition',
            'boxpoints','jitter','pointpos','whiskerwidth','boxmean'
        ];
        // replotAttrs attributes need a replot (because different
        // objects need to be made) but not a recalc
        var replotAttrs = [
            'zmin','zmax','zauto','mincolor','maxcolor',
            'colorscale','reversescale','zsmooth',
            'contours.start','contours.end','contours.size',
            'contours.showlines',
            'line.smoothing','line.shape',
            'error_y.width','error_x.width','error_x.copy_ystyle',
            'marker.maxdisplayed'
        ];
        // these ones show up in restyle because they make more sense
        // in the style box, but they're graph-wide attributes, so set
        // in gd.layout also axis scales and range show up here because
        // we may need to undo them. These all trigger a recalc
        var layoutAttrs = [
            'barmode', 'barnorm','bargap', 'bargroupgap',
            'boxmode', 'boxgap', 'boxgroupgap',
            '?axis.autorange', '?axis.range', '?axis.rangemode'
        ];
        // these ones may alter the axis type
        // (at least if the first trace is involved)
        var axtypeAttrs = [
            'type','x','y','x0','y0','orientation','xaxis','yaxis'
        ];

        // flags for which kind of update we need to do
        var docalc = false,
            docalcAutorange = false,
            doplot = false,
            dolayout = false,
            doapplystyle = false,
            docolorbars = false;
        // copies of the change (and previous values of anything affected)
        // for the undo / redo queue
        var redoit = {},
            undoit = {},
            axlist;

        // for now, if we detect 3D stuff, just re-do the plot
        if (fullLayout._hasGL3D) doplot = true;

        // make a new empty vals array for undoit
        function a0(){ return traces.map(function(){ return undefined; }); }

        // for autoranging multiple axes
        function addToAxlist(axid) {
            var axName = Plotly.Axes.id2name(axid);
            if(axlist.indexOf(axName)===-1) { axlist.push(axName); }
        }
        function autorangeAttr(axName) { return axName+'.autorange'; }
        function rangeAttr(axName) { return axName+'.range'; }

        // for attrs that interact (like scales & autoscales), save the
        // old vals before making the change
        // val=undefined will not set a value, just record what the value was.
        // attr can be an array to set several at once (all to the same val)
        function doextra(cont,attr,val,i) {
            if($.isArray(attr)) {
                attr.forEach(function(a){ doextra(cont,a,val,i); });
                return;
            }
            // quit if explicitly setting this elsewhere
            if(attr in aobj) { return; }
            var extraparam = Plotly.Lib.nestedProperty(cont,attr);
            if(!(attr in undoit)) {
                undoit[attr] = a0();
            }
            if(undoit[attr][i]===undefined) {
                undoit[attr][i]=extraparam.get();
            }
            if(val!==undefined) {
                extraparam.set(val);
            }
        }
        var zscl = ['zmin', 'zmax'],
            xbins = ['xbins.start', 'xbins.end', 'xbins.size'],
            ybins = ['ybins.start', 'ybins.end', 'ybins.size'],
            contourAttrs = ['contours.start', 'contours.end', 'contours.size'];

        // now make the changes to gd.data (and occasionally gd.layout)
        // and figure out what kind of graphics update we need to do
        for(var ai in aobj) {
            var vi = aobj[ai],
                cont,
                contFull,
                param;
            redoit[ai] = vi;

            if(layoutAttrs.indexOf(ai.replace(/[xyz]axis[0-9]*/g, '?axis'))!==-1){
                param = Plotly.Lib.nestedProperty(gd.layout, ai);
                undoit[ai] = [param.get()];
                // since we're allowing val to be an array, allow it here too,
                // even though that's meaningless
                param.set($.isArray(vi) ? vi[0] : vi);
                // ironically, the layout attrs in restyle only require replot,
                // not relayout
                docalc = true;
                continue;
            }

            // set attribute in gd.data
            undoit[ai] = a0();
            for(i=0; i<traces.length; i++) {
                cont = gd.data[traces[i]];
                contFull = gd._fullData[traces[i]];
                param = Plotly.Lib.nestedProperty(cont,ai);

                // setting bin or z settings should turn off auto
                // and setting auto should save bin or z settings
                if(zscl.indexOf(ai)!==-1) {
                    doextra(cont,'zauto',false,i);
                }
                else if(ai==='zauto') {
                    doextra(cont,zscl,undefined,i);
                }
                else if(xbins.indexOf(ai)!==-1) {
                    doextra(cont,'autobinx',false,i);
                }
                else if(ai==='autobinx') {
                    doextra(cont,xbins,undefined,i);
                }
                else if(ybins.indexOf(ai)!==-1) {
                    doextra(cont,'autobiny',false,i);
                }
                else if(ai==='autobiny') {
                    doextra(cont,ybins,undefined,i);
                }
                else if(contourAttrs.indexOf(ai)!==-1) {
                    doextra(cont, 'autocontour', false, i);
                }
                else if(ai==='autocontour') {
                    doextra(cont, contourAttrs, undefined, i);
                }
                // heatmaps: setting x0 or dx, y0 or dy,
                // should turn xtype/ytype to 'scaled' if 'array'
                else if(['x0','dx'].indexOf(ai)!==-1 &&
                        contFull.x && contFull.xtype!=='scaled') {
                    doextra(cont,'xtype','scaled',i);
                }
                else if(['y0','dy'].indexOf(ai)!==-1 &&
                        contFull.y && contFull.ytype!=='scaled') {
                    doextra(cont,'ytype','scaled',i);
                }
                // changing colorbar size modes,
                // make the resulting size not change
                // note that colorbar fractional sizing is based on the
                // original plot size, before anything (like a colorbar)
                // increases the margins
                else if(ai==='colorbar.thicknessmode' && param.get()!==vi &&
                            ['fraction','pixels'].indexOf(vi)!==-1 &&
                            contFull.colorbar) {
                    var thicknorm =
                        ['top','bottom'].indexOf(contFull.colorbar.orient)!==-1 ?
                            (fullLayout.height - fullLayout.margin.t - fullLayout.margin.b) :
                            (fullLayout.width - fullLayout.margin.l - fullLayout.margin.r);
                    doextra(cont,'colorbar.thickness', contFull.colorbar.thickness *
                        (vi==='fraction' ? 1/thicknorm : thicknorm), i);
                }
                else if(ai==='colorbar.lenmode' && param.get()!==vi &&
                            ['fraction','pixels'].indexOf(vi)!==-1 &&
                            contFull.colorbar) {
                    var lennorm =
                        ['top','bottom'].indexOf(contFull.colorbar.orient)!==-1 ?
                            (fullLayout.width - fullLayout.margin.l - fullLayout.margin.r) :
                            (fullLayout.height - fullLayout.margin.t - fullLayout.margin.b);
                    doextra(cont,'colorbar.len', contFull.colorbar.len *
                        (vi==='fraction' ? 1/lennorm : lennorm), i);
                }

                // save the old value
                undoit[ai][i] = param.get();
                // set the new value - if val is an array, it's one el per trace
                // first check for attributes that get more complex alterations
                var swapAttrs = [
                    'swapxy','swapxyaxes','orientation','orientationaxes'
                ];
                if(swapAttrs.indexOf(ai)!==-1) {
                    // setting an orientation: make sure it's changing
                    // before we swap everything else
                    if(ai==='orientation') {
                        param.set($.isArray(vi) ? vi[i%vi.length] : vi);
                        if(param.get()===undoit[ai][i]) continue;
                    }
                    // orientationaxes has no value,
                    // it flips everything and the axes
                    else if(ai==='orientationaxes') {
                        cont.orientation =
                            {v:'h', h:'v'}[contFull.orientation];
                    }
                    swapXYData(cont);
                }
                // all the other ones, just modify that one attribute
                else param.set($.isArray(vi) ? vi[i%vi.length] : vi);

            }

            // swap the data attributes of the relevant x and y axes?
            if(['swapxyaxes','orientationaxes'].indexOf(ai)!==-1) {
                Plotly.Axes.swap(gd, traces);
            }

            // swap hovermode if set to "compare x/y data"
            if (ai === 'orientationaxes') {
                var hovermode = Plotly.Lib.nestedProperty(gd.layout, 'hovermode');
                if (hovermode.get() === 'x') {
                    hovermode.set('y');
                } else if (hovermode.get() === 'y') {
                    hovermode.set('x');
                }
            }

            // check if we need to call axis type
            if((traces.indexOf(0)!==-1) && (axtypeAttrs.indexOf(ai)!==-1)) {
                Plotly.Axes.clearTypes(gd,traces);
                docalc = true;
            }

            // switching from auto to manual binning or z scaling doesn't
            // actually do anything but change what you see in the styling
            // box. everything else at least needs to apply styles
            if((['autobinx','autobiny','zauto'].indexOf(ai)===-1) ||
                    vi!==false) {
                doapplystyle = true;
            }
            if(['colorbar','line'].indexOf(param.parts[0])!==-1) {
                docolorbars = true;
            }

            if(recalcAttrs.indexOf(ai)!==-1) {
                // major enough changes deserve autoscale, autobin, and
                // non-reversed axes so people don't get confused
                if(['orientation','type'].indexOf(ai)!==-1) {
                    axlist = [];
                    for(i=0; i<traces.length; i++) {
                        var trace = gd.data[traces[i]];
                        addToAxlist(trace.xaxis||'x');
                        addToAxlist(trace.yaxis||'y');

                        if(astr==='type') {
                            doextra(gd.data[traces[i]],
                                ['autobinx','autobiny'],true,i);
                        }
                    }

                    doextra(gd.layout, axlist.map(autorangeAttr), true, 0);
                    doextra(gd.layout, axlist.map(rangeAttr), [0, 1], 0);
                }
                docalc = true;
            }
            else if(replotAttrs.indexOf(ai)!==-1) doplot = true;
            else if(autorangeAttrs.indexOf(ai)!==-1) docalcAutorange = true;
        }
        // now all attribute mods are done, as are redo and undo
        // so we can save them
        if(Plotly.Queue) {
            Plotly.Queue.add(gd, restyle, [gd, undoit, traces], restyle, [gd, redoit, traces]);
        }

        // do we need to force a recalc?
        var autorangeOn = false;
        Plotly.Axes.list(gd).forEach(function(ax){
            if(ax.autorange) autorangeOn = true;
        });
        if(docalc || dolayout || (docalcAutorange && autorangeOn)) {
            gd.calcdata = undefined;
        }

        // now update the graphics
        // a complete layout redraw takes care of plot and
        var seq;
        if(dolayout) {
            seq = [function changeLayout(){
                var copyLayout = gd.layout;
                gd.layout = undefined;
                return Plotly.plot(gd, '', copyLayout);
            }];
        }
        else if(docalc || doplot || docalcAutorange) {
            seq = [Plotly.plot];
        }
        else {
            plots.supplyDefaults(gd);
            seq = [plots.previousPromises];
            if(doapplystyle) {
                seq.push(function doApplyStyle(){
                    applyStyle(gd);
                    if(fullLayout.showlegend) Plotly.Legend.draw(gd);
                    return plots.previousPromises(gd);
                });
            }
            if(docolorbars) {
                seq.push(function doColorBars(){
                    gd.calcdata.forEach(function(cd) {
                        if((cd[0].t||{}).cb) {
                            var trace = cd[0].trace,
                                cb = cd[0].t.cb;
                            if(plots.isContour(trace.type)) {
                                cb.line({
                                    width: trace.contours.showlines!==false ?
                                        trace.line.width : 0,
                                    dash: trace.line.dash,
                                    color: trace.contours.coloring==='line' ?
                                        cb._opts.line.color : trace.line.color
                                });
                            }
                            cb.options(trace.colorbar)();
                        }
                    });
                    return plots.previousPromises(gd);
                });
            }
        }

        var plotDone = Plotly.Lib.syncOrAsync(seq, gd);

        if(!plotDone || !plotDone.then) plotDone = Promise.resolve();
        return plotDone.then(function(){
            $(gd).trigger('plotly_restyle',
                          $.extend(true, [], [redoit, traces]));
        });
    };

    // swap all the data and data attributes associated with x and y
    function swapXYData(trace) {
        var i;
        Plotly.Lib.swapXYAttrs(trace, ['?', '?0', 'd?', '?bins', 'nbins?', 'autobin?', '?src', 'error_?']);
        if($.isArray(trace.z) && $.isArray(trace.z[0])) {
            if(trace.transpose) delete trace.transpose;
            else trace.transpose = true;
        }
        if(trace.error_x && trace.error_y) {
            var errorY = trace.error_y,
                copyYstyle = ('copy_ystyle' in errorY) ? errorY.copy_ystyle :
                    !(errorY.color || errorY.thickness || errorY.width);
            Plotly.Lib.swapXYAttrs(trace, ['error_?.copy_ystyle']);
            if(copyYstyle) {
                Plotly.Lib.swapXYAttrs(trace, ['error_?.color', 'error_?.thickness', 'error_?.width']);
            }
        }
        if(trace.hoverinfo) {
            var hoverInfoParts = trace.hoverinfo.split('+');
            for(i=0; i<hoverInfoParts.length; i++) {
                if(hoverInfoParts[i]==='x') hoverInfoParts[i] = 'y';
                else if(hoverInfoParts[i]==='y') hoverInfoParts[i] = 'x';
            }
            trace.hoverinfo = hoverInfoParts.join('+');
        }
    }

    // relayout: change layout in an existing plot
    // can be called two ways:
    // relayout(gd,astr,val)
    //      gd - graph div (dom element)
    //      astr - attribute string (like 'xaxis.range[0]')
    //      val - value to give this attribute
    // relayout(gd,aobj)
    //      aobj - {astr1:val1, astr2:val2...}
    //          allows setting multiple attributes simultaneously
    Plotly.relayout = function relayout (gd, astr, val) {
        if(gd.framework && gd.framework.isPolar) return;
        if(typeof gd === 'string') gd = document.getElementById(gd);

        var layout = gd.layout,
            aobj = {},
            dolegend = false,
            doticks = false,
            dolayoutstyle = false,
            doplot = false,
            docalc = false,
            domodebar = false,
            newkey, axes, keys, xyref, scene, axisAttr;


        // for now, if we detect 3D stuff, just re-do the plot
        // if (gl._hasGL3D) doplot = true;

        if(typeof astr === 'string') aobj[astr] = val;
        else if($.isPlainObject(astr)) aobj = astr;
        else {
            console.log('relayout fail',astr,val);
            return;
        }

        if(Object.keys(aobj).length) gd.changed = true;

        keys = Object.keys(aobj);
        axes = Plotly.Axes.list(gd);

        for(var i=0; i<keys.length; i++) {
            // look for 'allaxes', split out into all axes
            if(keys[i].indexOf('allaxes')===0) {
                for(var j=0; j<axes.length; j++) {
                    // in case of 3D the axis are nested within a scene which is held in _id
                    scene = axes[j]._id.substr(1);
                    axisAttr = (scene.indexOf('scene') !== -1) ? (scene + '.') : '';
                    newkey = keys[i].replace('allaxes', axisAttr + axes[j]._name);
                    if(!aobj[newkey]) { aobj[newkey] = aobj[keys[i]]; }
                }
                delete aobj[keys[i]];
            }
            // split annotation.ref into xref and yref
            if(keys[i].match(/^annotations\[[0-9-]+\].ref$/)) {
                xyref = aobj[keys[i]].split('y');
                aobj[keys[i].replace('ref','xref')] = xyref[0];
                aobj[keys[i].replace('ref','yref')] = xyref.length===2 ?
                    ('y'+xyref[1]) : 'paper';
                delete aobj[keys[i]];
            }
        }

        // copies of the change (and previous values of anything affected)
        // for the undo / redo queue
        var redoit = {},
            undoit = {};

        // for attrs that interact (like scales & autoscales), save the
        // old vals before making the change
        // val=undefined will not set a value, just record what the value was.
        // attr can be an array to set several at once (all to the same val)
        function doextra(attr,val) {
            if($.isArray(attr)) {
                attr.forEach(function(a) { doextra(a,val); });
                return;
            }
            // quit if explicitly setting this elsewhere
            if(attr in aobj) return;

            var p = Plotly.Lib.nestedProperty(layout,attr);
            if(!(attr in undoit)) undoit[attr] = p.get();
            if(val!==undefined) p.set(val);
        }

        // for editing annotations or shapes - is it on autoscaled axes?
        function refAutorange(obj, axletter) {
            var axName = Plotly.Axes.id2name(obj[axletter+'ref']||axletter);
            return (gd._fullLayout[axName]||{}).autorange;
        }

        var hw = ['height','width'];

        // alter gd.layout
        for(var ai in aobj) {
            var p = Plotly.Lib.nestedProperty(layout,ai),
                vi = aobj[ai],
                plen = p.parts.length,
                // p.parts may end with an index integer if the property is an array
                pend = typeof p.parts[plen-1] === 'string' ? (plen-1) : (plen-2),
                // last property in chain (leaf node)
                pleaf = p.parts[pend],
                // leaf plus immediate parent
                pleafPlus = p.parts[pend - 1] + '.' + pleaf,
                // trunk nodes (everything except the leaf)
                ptrunk = p.parts.slice(0, pend).join('.'),
                parentIn = Plotly.Lib.nestedProperty(gd.layout, ptrunk).get(),
                parentFull = Plotly.Lib.nestedProperty(gd._fullLayout, ptrunk).get();

            redoit[ai] = aobj[ai];

            // axis reverse is special - it is its own inverse
            // op and has no flag.
            undoit[ai] = (pleaf === 'reverse') ? aobj[ai] : p.get();

            // check autosize or autorange vs size and range
            if(hw.indexOf(ai)!==-1) { doextra('autosize', false); }
            else if(ai==='autosize') { doextra(hw, undefined); }
            else if(pleafPlus.match(/^[xyz]axis[0-9]*\.range(\[[0|1]\])?$/)) {
                doextra(ptrunk+'.autorange', false);
            }
            else if(pleafPlus.match(/^[xyz]axis[0-9]*\.autorange$/)) {
                doextra([ptrunk + '.range[0]',ptrunk + '.range[1]'],
                    undefined);
            }

            // toggling log without autorange: need to also recalculate ranges
            // logical XOR (ie are we toggling log)
            if(pleaf==='type' && ((parentFull.type === 'log') !== (vi === 'log'))) {
                var ax = parentIn;
                if (!ax || !ax.range) {
                    doextra(ptrunk+'.autorange', true);
                }
                else if(!parentFull.autorange) {
                    var r0 = ax.range[0],
                        r1 = ax.range[1];
                    if(vi === 'log') {
                        // if both limits are negative, autorange
                        if(r0 <= 0 && r1 <= 0) {
                            doextra(ptrunk+'.autorange', true);
                        }
                        // if one is negative, set it 6 orders below the other.
                        // TODO: find the smallest positive val?
                        if(r0 <= 0) r0 = r1/1e6;
                        else if(r1 <= 0) r1 = r0/1e6;
                        // now set the range values as appropriate
                        doextra(ptrunk+'.range[0]', Math.log(r0) / Math.LN10);
                        doextra(ptrunk+'.range[1]', Math.log(r1) / Math.LN10);
                    }
                    else {
                        doextra(ptrunk+'.range[0]', Math.pow(10, r0));
                        doextra(ptrunk+'.range[1]', Math.pow(10, r1));
                    }
                }
                else if(vi === 'log') {
                    // just make sure the range is positive and in the right
                    // order, it'll get recalculated later
                    ax.range = (ax.range[1] > ax.range[0]) ? [1, 2] : [2, 1];
                }
            }

            // handle axis reversal explicitly, as there's no 'reverse' flag
            if(pleaf ==='reverse') {
                if(parentIn.range) parentIn.range.reverse();
                else {
                    doextra(ptrunk+'.autorange', true);
                    parentIn.range = [1, 0];
                }

                if(parentFull.autorange) docalc = true;
                else doplot = true;
            }
            // send annotation and shape mods one-by-one through Annotations.draw(),
            // don't set via nestedProperty
            // that's because add and remove are special
            else if(p.parts[0] === 'annotations' || p.parts[0] === 'shapes') {
                var objNum = p.parts[1],
                    objType = p.parts[0],
                    objList = layout[objType] || [],
                    objModule = Plotly[Plotly.Lib.titleCase(objType)],
                    obji = objList[objNum] || {};
                // if p.parts is just an annotation number, and val is either
                // 'add' or an entire annotation to add, the undo is 'remove'
                // if val is 'remove' then undo is the whole annotation object
                if(p.parts.length === 2) {
                    if(aobj[ai] === 'add' || $.isPlainObject(aobj[ai])) {
                        undoit[ai] = 'remove';
                    }
                    else if(aobj[ai] === 'remove') {
                        if(objNum === -1) {
                            undoit[objType] = objList;
                            delete undoit[ai];
                        }
                        else undoit[ai] = obji;
                    }
                    else console.log('???', aobj);
                }
                if((refAutorange(obji, 'x') || refAutorange(obji, 'y')) &&
                        !Plotly.Lib.containsAny(ai, ['color', 'opacity', 'align', 'dash'])) {
                    docalc = true;
                }
                // TODO: combine all edits to a given annotation / shape into one call
                // as it is we get separate calls for x and y (or ax and ay) on move
                objModule.draw(gd, objNum, p.parts.slice(2).join('.'), aobj[ai]);
                delete aobj[ai];
            }
            // alter gd.layout
            else {
                // check whether we can short-circuit a full redraw
                // 3d at this point just needs to redraw.
                if (p.parts[0].indexOf('scene') === 0) doplot = true;
                else if(p.parts[0].indexOf('legend')!==-1) dolegend = true;
                else if(ai.indexOf('title')!==-1) doticks = true;
                else if(p.parts[0].indexOf('bgcolor')!==-1) dolayoutstyle = true;
                else if(p.parts.length>1 &&
                        Plotly.Lib.containsAny(p.parts[1], ['tick', 'exponent', 'grid', 'zeroline'])) {
                    doticks = true;
                }
                else if(ai.indexOf('.linewidth')!==-1 &&
                        ai.indexOf('axis')!==-1) {
                    doticks = dolayoutstyle = true;
                }
                else if(p.parts.length>1 && p.parts[1].indexOf('line')!==-1) {
                    dolayoutstyle = true;
                }
                else if(p.parts.length>1 && p.parts[1]==='mirror') {
                    doticks = dolayoutstyle = true;
                }
                else if(ai==='margin.pad') {
                    doticks = dolayoutstyle = true;
                }
                else if(p.parts[0]==='margin' ||
                        p.parts[1]==='autorange' ||
                        p.parts[1]==='rangemode' ||
                        p.parts[1]==='type' ||
                        p.parts[1]==='domain' ||
                        ai.match(/^(bar|box|font)/)) {
                    docalc = true;
                }
                // hovermode and dragmode don't need any redrawing,
                // since they just
                // affect reaction to user input. everything else,
                // assume full replot.
                // height, width, autosize get dealt with below
                else if(ai==='hovermode') domodebar = true;
                else if(['hovermode','dragmode','height',
                        'width','autosize'].indexOf(ai)===-1) {
                    doplot = true;
                }
                p.set(vi);
            }
        }
        // now all attribute mods are done, as are
        // redo and undo so we can save them
        if(Plotly.Queue) {
            Plotly.Queue.add(gd, relayout, [gd, undoit], relayout, [gd, redoit]);
        }

        // calculate autosizing - if size hasn't changed,
        // will remove h&w so we don't need to redraw
        if(aobj.autosize) aobj = plotAutoSize(gd,aobj);

        if(aobj.height || aobj.width || aobj.autosize) docalc = true;

        // redraw
        // first check if there's still anything to do
        var ak = Object.keys(aobj),
            seq = [plots.previousPromises];
        if(doplot||docalc) {
            seq.push(function layoutReplot(){
                // force plot() to redo the layout
                gd.layout = undefined;
                // force it to redo calcdata?
                if(docalc) gd.calcdata = undefined;
                // replot with the modified layout
                return Plotly.plot(gd,'',layout);
            });
        }
        else if(ak.length) {
            // if we didn't need to redraw entirely, just do the needed parts
            plots.supplyDefaults(gd);
            if(dolegend) {
                seq.push(function doLegend(){
                    Plotly.Legend.draw(gd, gd._fullLayout.showlegend);
                    return plots.previousPromises(gd);
                });
            }

            if(dolayoutstyle) seq.push(layoutStyles);

            if(doticks) {
                seq.push(function(){
                    Plotly.Axes.doTicks(gd,'redraw');
                    plots.titles(gd,'gtitle');
                    return plots.previousPromises(gd);
                });
            }
            // this is decoupled enough it doesn't need async regardless
            if(domodebar) Plotly.Fx.modeBar(gd);
        }

        var plotDone = Plotly.Lib.syncOrAsync(seq, gd);

        if(!plotDone || !plotDone.then) plotDone = Promise.resolve();
        return plotDone.then(function(){
            $(gd).trigger('plotly_relayout', $.extend(true, {}, redoit));
        });
    };

    function setGraphContainerScroll(gd) {
        if(!gd || !gd._context || !gd._context.workspace ||
                !gd._fullLayout || gd.tabtype!=='plot' ||
                $(gd).css('display')==='none') {
            return;
        }

        var $graphContainer = $(gd).find('.plot-container'),
            isGraphWiderThanContainer =
                gd._fullLayout.width > parseInt($graphContainer.css('width'),10);

        if (gd._fullLayout.autosize || !isGraphWiderThanContainer) {
            $graphContainer.removeClass('is-fixed-size');
        }
        else if (isGraphWiderThanContainer) {
            $graphContainer.addClass('is-fixed-size');
        }
    }

    /**
     * Reduce all reserved margin objects to a single required margin reservation.
     *
     * @param {Object} margins
     * @returns {{left: number, right: number, bottom: number, top: number}}
     */
    function calculateReservedMargins(margins) {
        var resultingMargin = {left: 0, right: 0, bottom: 0, top: 0},
            marginName;

        if (margins) {
            for (marginName in margins) {
                if (margins.hasOwnProperty(marginName)) {
                    resultingMargin.left += margins[marginName].left || 0;
                    resultingMargin.right += margins[marginName].right || 0;
                    resultingMargin.bottom += margins[marginName].bottom || 0;
                    resultingMargin.top += margins[marginName].top || 0;
                }
            }
        }
        return resultingMargin;
    }

    function plotAutoSize(gd, aobj) {
        var fullLayout = gd._fullLayout,
            reservedMargins = calculateReservedMargins(gd._boundingBoxMargins),
            reservedHeight,
            reservedWidth,
            newheight,
            newwidth;
        if(gd._context.workspace){
            setFileAndCommentsSize(gd);
            var gdBB = fullLayout._container.node().getBoundingClientRect();

            // autosized plot on main site: 5% border on all sides
            reservedWidth = reservedMargins.left + reservedMargins.right;
            reservedHeight = reservedMargins.bottom + reservedMargins.top;
            newwidth = Math.round((gdBB.width - reservedWidth)*0.9);
            newheight = Math.round((gdBB.height - reservedHeight)*0.9);
        }
        else if(gd._context.fillFrame) {
            // embedded in an iframe - just take the full iframe size
            // if we get to this point, with no aspect ratio restrictions
            newwidth = $(window).width();
            newheight = $(window).height();

            // somehow we get a few extra px height sometimes...
            // just hide it
            $('body').css('overflow','hidden');
        }
        else {
            // plotly.js - let the developers do what they want, either
            // provide height and width for the container div,
            // specify size in layout, or take the defaults,
            // but don't enforce any ratio restrictions
            newheight = $(gd).height() || fullLayout.height;
            newwidth = $(gd).width() || fullLayout.width;
        }

        if(Math.abs(fullLayout.width - newwidth) > 1 ||
                Math.abs(fullLayout.height - newheight) > 1) {
            fullLayout.height = gd.layout.height = newheight;
            fullLayout.width = gd.layout.width = newwidth;
        }
        // if there's no size change, update layout but
        // delete the autosize attr so we don't redraw
        // but can't call layoutStyles for initial autosize
        else if(fullLayout.autosize !== 'initial') {
            delete(aobj.autosize);
            fullLayout.autosize = gd.layout.autosize = true;
        }
        return aobj;
    }

    // check whether to resize a tab (if it's a plot) to the container
    plots.resize = function(gd) {
        if(typeof gd === 'string') gd = document.getElementById(gd);

        if(gd._context.workspace) setFileAndCommentsSize(gd);

        if(gd && $(gd).css('display')!=='none') {
            if(gd._redrawTimer) clearTimeout(gd._redrawTimer);
            gd._redrawTimer = setTimeout(function(){
                if ((gd._fullLayout||{}).autosize) {
                    // autosizing doesn't count as a change that needs saving
                    var oldchanged = gd.changed;
                    // nor should it be included in the undo queue
                    gd.autoplay = true;
                    Plotly.relayout(gd, {autosize: true});
                    gd.changed = oldchanged;
                }
            }, 100);
        }

        setGraphContainerScroll(gd);
    };

    // -------------------------------------------------------
    // makePlotFramework: Create the plot container and axes
    // -------------------------------------------------------
    function makePlotFramework(gd) {
        var gd3 = d3.select(gd),
            subplots = Plotly.Axes.getSubplots(gd),
            fullLayout = gd._fullLayout;

        if(fullLayout._hasGL3D) Plotly.Gl3dAxes.initAxes(gd);

        var outerContainer = fullLayout._fileandcomments =
                gd3.selectAll('.file-and-comments');
        // for embeds and cloneGraphOffscreen
        if(!outerContainer.node()) outerContainer = gd3;

        // Plot container
        fullLayout._container = outerContainer.selectAll('.plot-container').data([0]);
        fullLayout._container.enter().insert('div', ':first-child')
            .classed('plot-container',true)
            .classed('plotly',true)
            .classed('workspace-plot', gd._context.workspace);

        // Make the svg container
        fullLayout._paperdiv = fullLayout._container.selectAll('.svg-container').data([0]);
        fullLayout._paperdiv.enter().append('div')
            .classed('svg-container',true)
            .style('position','relative');

        // Initial autosize
        if(fullLayout.autosize === 'initial') {
            if(gd._context.workspace) setFileAndCommentsSize(gd);
            plotAutoSize(gd,{});
            fullLayout.autosize = true;
            gd.layout.autosize = true;
        }
        // Make the graph containers
        // start fresh each time we get here, so we know the order comes out
        // right, rather than enter/exit which can muck up the order
        fullLayout._paperdiv.selectAll('svg').remove();

        if(!fullLayout._uid) {
            var otherUids = [];
            d3.selectAll('defs').each(function() {
                if(this.id) otherUids.push(this.id.split('-')[1]);
            });
            fullLayout._uid = Plotly.Lib.randstr(otherUids);
        }

        fullLayout._paper = fullLayout._paperdiv.append('svg')
            .attr({
                xmlns: 'http://www.w3.org/2000/svg',
                // odd d3 quirk - need namespace twice??
                'xmlns:xmlns:xlink': 'http://www.w3.org/1999/xlink',
                'xml:xml:space': 'preserve'
            });

        fullLayout._defs = fullLayout._paper.append('defs')
            .attr('id', 'defs-' + fullLayout._uid);

        // Layers to keep plot types in the right order.
        // from back to front:
        // 1. heatmaps, 2D histos and contour maps
        // 2. bars / 1D histos
        // 3. errorbars for bars and scatter
        // 4. scatter
        // 5. box plots
        function plotLayers(svg) {
            svg.append('g').classed('maplayer', true);
            svg.append('g').classed('barlayer', true);
            svg.append('g').classed('errorlayer', true);
            svg.append('g').classed('boxlayer', true);
            svg.append('g').classed('scatterlayer', true);
        }

        // create all the layers in order, so we know they'll stay in order
        var overlays = [];
        fullLayout._plots = {};
        fullLayout._paper.selectAll('g.subplot').data(subplots)
          .enter().append('g')
            .classed('subplot',true)
            .each(function(subplot){
                var plotinfo = fullLayout._plots[subplot] = {},
                    plotgroup = d3.select(this).classed(subplot,true);
                plotinfo.id = subplot;
                // references to the axis objects controlling this subplot
                plotinfo.x = function() {
                    return Plotly.Axes.getFromId(gd,subplot,'x');
                };
                plotinfo.y = function() {
                    return Plotly.Axes.getFromId(gd,subplot,'y');
                };
                var xa = plotinfo.x(),
                    ya = plotinfo.y();
                // references to any subplots overlaid on this one
                plotinfo.overlays = [];

                // is this subplot overlaid on another?
                // ax.overlaying is the id of another axis of the same
                // dimension that this one overlays to be an overlaid subplot,
                // the main plot must exist make sure we're not trying to
                // overlay on an axis that's already overlaying another
                var xa2 = Plotly.Axes.getFromId(gd, xa.overlaying) || xa;
                if(xa2 !== xa && xa2.overlaying) {
                    xa2 = xa;
                    xa.overlaying = false;
                }

                var ya2 = Plotly.Axes.getFromId(gd, ya.overlaying) || ya;
                if(ya2 !== ya && ya2.overlaying) {
                    ya2 = ya;
                    ya.overlaying = false;
                }

                var mainplot = xa2._id+ya2._id;
                if(mainplot!==subplot && subplots.indexOf(mainplot)!==-1) {
                    plotinfo.mainplot = mainplot;
                    overlays.push(plotinfo);

                    // for now force overlays to overlay completely... so they
                    // can drag together correctly and share backgrounds.
                    // Later perhaps we make separate axis domain and
                    // tick/line domain or something, so they can still share
                    // the (possibly larger) dragger and background but don't
                    // have to both be drawn over that whole domain
                    xa.domain = xa2.domain.slice();
                    ya.domain = ya2.domain.slice();
                }
                else {
                    // main subplot - make the components of
                    // the plot and containers for overlays
                    plotinfo.bg = plotgroup.append('rect')
                        .style('stroke-width',0);
                    plotinfo.gridlayer = plotgroup.append('g');
                    plotinfo.overgrid = plotgroup.append('g');
                    plotinfo.zerolinelayer = plotgroup.append('g');
                    plotinfo.overzero = plotgroup.append('g');
                    plotinfo.plot = plotgroup.append('svg').call(plotLayers);
                    plotinfo.overplot = plotgroup.append('g');
                    plotinfo.xlines = plotgroup.append('path');
                    plotinfo.ylines = plotgroup.append('path');
                    plotinfo.overlines = plotgroup.append('g');
                    plotinfo.xaxislayer = plotgroup.append('g');
                    plotinfo.yaxislayer = plotgroup.append('g');
                    plotinfo.overaxes = plotgroup.append('g');

                    // make separate drag layers for each subplot,
                    // but append them to paper rather than the plot groups,
                    // so they end up on top of the rest
                }
                plotinfo.draglayer = fullLayout._paper.append('g');
            });

        // now make the components of overlaid subplots
        // overlays don't have backgrounds, and append all
        // their other components to the corresponding
        // extra groups of their main plots.
        overlays.forEach(function(plotinfo) {
            var mainplot = fullLayout._plots[plotinfo.mainplot];
            mainplot.overlays.push(plotinfo);

            plotinfo.gridlayer = mainplot.overgrid.append('g');
            plotinfo.zerolinelayer = mainplot.overzero.append('g');
            plotinfo.plot = mainplot.overplot.append('svg').call(plotLayers);
            plotinfo.xlines = mainplot.overlines.append('path');
            plotinfo.ylines = mainplot.overlines.append('path');
            plotinfo.xaxislayer = mainplot.overaxes.append('g');
            plotinfo.yaxislayer = mainplot.overaxes.append('g');
        });

        // common attributes for all subplots, overlays or not
        subplots.forEach(function(subplot) {
            var plotinfo = fullLayout._plots[subplot];
            plotinfo.plot
                .attr('preserveAspectRatio', 'none')
                .style('fill', 'none');
            plotinfo.xlines
                .style('fill', 'none')
                .classed('crisp', true);
            plotinfo.ylines
                .style('fill', 'none')
                .classed('crisp', true);
        });

        // single shape, info (legend, annotations) and hover layers for the whole plot
        // pointer-events:none means we don't have to worry about mousing over
        // the hover text itself
        // shapelayer gets no pointer events for now, later if we support
        // clicking or dragging on shapes we can change this.
        fullLayout._shapelayer = fullLayout._paper.append('g')
                                                  .classed('shapelayer', true)
                                                  .style('pointer-events', 'none');
        fullLayout._infolayer = fullLayout._paper.append('g').classed('infolayer', true);
        fullLayout._hoverlayer = fullLayout._paper.append('g')
                                                  .classed('hoverlayer', true)
                                                  .style('pointer-events', 'none');

        // position and style the containers, make main title
        var frameWorkDone = Plotly.Lib.syncOrAsync([
            layoutStyles,
            function goAxes(){ return Plotly.Axes.doTicks(gd,'redraw'); },
            Plotly.Fx.init
        ], gd);
        if(frameWorkDone && frameWorkDone.then) {
            gd._promises.push(frameWorkDone);
        }
        return frameWorkDone;
    }

    // called by legend and colorbar routines to see if we need to
    // expand the margins to show them
    // o is {x,l,r,y,t,b} where x and y are plot fractions,
    // the rest are pixels in each direction
    // or leave o out to delete this entry (like if it's hidden)
    plots.autoMargin = function(gd,id,o) {
        var fullLayout = gd._fullLayout;
        if(!fullLayout._pushmargin) fullLayout._pushmargin = {};
        if(fullLayout.margin.autoexpand!==false) {
            if(!o) delete fullLayout._pushmargin[id];
            else {
                var pad = o.pad||12;

                // if the item is too big, just give it enough automargin to
                // make sure you can still grab it and bring it back
                if(o.l+o.r > fullLayout.width*0.5) o.l = o.r = 0;
                if(o.b+o.t > fullLayout.height*0.5) o.b = o.t = 0;

                fullLayout._pushmargin[id] = {
                    l: {val:o.x, size: o.l+pad},
                    r: {val:o.x, size: o.r+pad},
                    b: {val:o.y, size: o.b+pad},
                    t: {val:o.y, size: o.t+pad}
                };
            }

            if(!gd._replotting) doAutoMargin(gd);
        }
    };

    function doAutoMargin(gd) {
        var fullLayout = gd._fullLayout;
        if(!fullLayout._size) fullLayout._size = {};
        if(!fullLayout._pushmargin) fullLayout._pushmargin = {};
        var gs = fullLayout._size,
            oldmargins = JSON.stringify(gs);

        // adjust margins for outside legends and colorbars
        // fullLayout.margin is the requested margin,
        // fullLayout._size has margins and plotsize after adjustment
        var ml = Math.max(fullLayout.margin.l||0,0),
            mr = Math.max(fullLayout.margin.r||0,0),
            mt = Math.max(fullLayout.margin.t||0,0),
            mb = Math.max(fullLayout.margin.b||0,0),
            pm = fullLayout._pushmargin;
        if(fullLayout.margin.autoexpand!==false) {
            // fill in the requested margins
            pm.base = {
                l:{val:0, size:ml},
                r:{val:1, size:mr},
                t:{val:1, size:mt},
                b:{val:0, size:mb}
            };
            // now cycle through all the combinations of l and r
            // (and t and b) to find the required margins
            Object.keys(pm).forEach(function(k1) {
                var pushleft = pm[k1].l||{},
                    pushbottom = pm[k1].b||{},
                    fl = pushleft.val,
                    pl = pushleft.size,
                    fb = pushbottom.val,
                    pb = pushbottom.size;
                Object.keys(pm).forEach(function(k2) {
                    if($.isNumeric(pl) && pm[k2].r) {
                        var fr = pm[k2].r.val,
                            pr = pm[k2].r.size;
                        if(fr>fl) {
                            var newl = (pl*fr +
                                    (pr-fullLayout.width)*fl) / (fr-fl),
                                newr = (pr*(1-fl) +
                                    (pl-fullLayout.width)*(1-fr)) / (fr-fl);
                            if(newl>=0 && newr>=0 && newl+newr>ml+mr) {
                                ml = newl;
                                mr = newr;
                            }
                        }
                    }
                    if($.isNumeric(pb) && pm[k2].t) {
                        var ft = pm[k2].t.val,
                            pt = pm[k2].t.size;
                        if(ft>fb) {
                            var newb = (pb*ft +
                                    (pt-fullLayout.height)*fb) / (ft-fb),
                                newt = (pt*(1-fb) +
                                    (pb-fullLayout.height)*(1-ft)) / (ft-fb);
                            if(newb>=0 && newt>=0 && newb+newt>mb+mt) {
                                mb = newb;
                                mt = newt;
                            }
                        }
                    }
                });
            });
        }

        gs.l = Math.round(ml);
        gs.r = Math.round(mr);
        gs.t = Math.round(mt);
        gs.b = Math.round(mb);
        gs.p = Math.round(fullLayout.margin.pad);
        gs.w = Math.round(fullLayout.width)-gs.l-gs.r;
        gs.h = Math.round(fullLayout.height)-gs.t-gs.b;

        // if things changed and we're not already redrawing, trigger a redraw
        if(!gd._replotting && oldmargins!=='{}' &&
                oldmargins!==JSON.stringify(fullLayout._size)) {
            return Plotly.plot(gd);
        }
    }

    // layoutStyles: styling for plot layout elements
    function layoutStyles(gd) {
        return Plotly.Lib.syncOrAsync([doAutoMargin, lsInner], gd);
    }

    function lsInner(gd) {
        var fullLayout = gd._fullLayout,
            gs = fullLayout._size;

        // clear axis line positions, to be set in the subplot loop below
        Plotly.Axes.list(gd).forEach(function(ax){ ax._linepositions = {}; });
        fullLayout._paperdiv.style({
            width: fullLayout.width+'px',
            height: fullLayout.height+'px',
            background: fullLayout.paper_bgcolor
        });
        fullLayout._paper.call(Plotly.Drawing.setSize, fullLayout.width, fullLayout.height);

        var freefinished = [];
        fullLayout._paper.selectAll('g.subplot').each(function(subplot) {
            var plotinfo = fullLayout._plots[subplot],
                xa = Plotly.Axes.getFromId(gd, subplot, 'x'),
                ya = Plotly.Axes.getFromId(gd, subplot, 'y');
            xa.setScale(); // this may already be done... not sure
            ya.setScale();

            if(plotinfo.bg) {
                plotinfo.bg
                    .call(Plotly.Drawing.setRect,
                        xa._offset-gs.p, ya._offset-gs.p,
                        xa._length+2*gs.p, ya._length+2*gs.p)
                    .call(Plotly.Color.fill, fullLayout.plot_bgcolor);
            }
            plotinfo.plot
                .call(Plotly.Drawing.setRect,
                    xa._offset, ya._offset, xa._length, ya._length);

            var xlw = Plotly.Drawing.crispRound(gd, xa.linewidth, 1),
                ylw = Plotly.Drawing.crispRound(gd, ya.linewidth, 1),
                xp = gs.p+ylw,
                xpathPrefix = 'M'+(-xp)+',',
                xpathSuffix = 'h'+(xa._length+2*xp),
                showfreex = xa.anchor==='free' &&
                    freefinished.indexOf(xa._id)===-1,
                freeposx = gs.h*(1-(xa.position||0))+((xlw/2)%1),
                showbottom =
                    (xa.anchor===ya._id && (xa.mirror||xa.side!=='top')) ||
                    xa.mirror==='all' || xa.mirror==='allticks' ||
                    (xa.mirrors && xa.mirrors[ya._id+'bottom']),
                bottompos = ya._length+gs.p+xlw/2,
                showtop =
                    (xa.anchor===ya._id && (xa.mirror||xa.side==='top')) ||
                    xa.mirror==='all' || xa.mirror==='allticks' ||
                    (xa.mirrors && xa.mirrors[ya._id+'top']),
                toppos = -gs.p-xlw/2,

                // shorten y axis lines so they don't overlap x axis lines
                yp = gs.p,
                // except where there's no x line
                // TODO: this gets more complicated with multiple x and y axes
                ypbottom = showbottom ? 0 : xlw,
                yptop = showtop ? 0 : xlw,
                ypathSuffix = ','+(-yp-yptop)+
                    'v'+(ya._length+2*yp+yptop+ypbottom),
                showfreey = ya.anchor==='free' &&
                    freefinished.indexOf(ya._id)===-1,
                freeposy = gs.w*(ya.position||0)+((ylw/2)%1),
                showleft =
                    (ya.anchor===xa._id && (ya.mirror||ya.side!=='right')) ||
                    ya.mirror==='all' || ya.mirror==='allticks' ||
                    (ya.mirrors && ya.mirrors[xa._id+'left']),
                leftpos = -gs.p-ylw/2,
                showright =
                    (ya.anchor===xa._id && (ya.mirror||ya.side==='right')) ||
                    ya.mirror==='all' || ya.mirror==='allticks' ||
                    (ya.mirrors && ya.mirrors[xa._id+'right']),
                rightpos = xa._length+gs.p+ylw/2;

            // save axis line positions for ticks, draggers, etc to reference
            // each subplot gets an entry:
            //    [left or bottom, right or top, free, main]
            // main is the position at which to draw labels and draggers, if any
            xa._linepositions[subplot] = [
                showbottom ? bottompos : undefined,
                showtop ? toppos : undefined,
                showfreex ? freeposx : undefined
            ];
            if(xa.anchor===ya._id) {
                xa._linepositions[subplot][3] = xa.side==='top' ?
                    toppos : bottompos;
            }
            else if(showfreex) {
                xa._linepositions[subplot][3] = freeposx;
            }

            ya._linepositions[subplot] = [
                showleft ? leftpos : undefined,
                showright ? rightpos : undefined,
                showfreey ? freeposy : undefined
            ];
            if(ya.anchor===xa._id) {
                ya._linepositions[subplot][3] = ya.side==='right' ?
                    rightpos : leftpos;
            }
            else if(showfreey) {
                ya._linepositions[subplot][3] = freeposy;
            }

            // translate all the extra stuff to have the
            // same origin as the plot area or axes
            var origin = 'translate('+xa._offset+','+ya._offset+')',
                originx = origin,
                originy = origin;
            if(showfreex) {
                originx = 'translate('+xa._offset+','+gs.t+')';
                toppos += ya._offset - gs.t;
                bottompos += ya._offset - gs.t;
            }
            if(showfreey) {
                originy = 'translate('+gs.l+','+ya._offset+')';
                leftpos += xa._offset - gs.l;
                rightpos += xa._offset - gs.l;
            }


            plotinfo.xlines
                .attr('transform', originx)
                .attr('d',(
                    (showbottom ? (xpathPrefix+bottompos+xpathSuffix) : '') +
                    (showtop ? (xpathPrefix+toppos+xpathSuffix) : '') +
                    (showfreex ? (xpathPrefix+freeposx+xpathSuffix) : '')) ||
                    // so it doesn't barf with no lines shown
                    'M0,0')
                .style('stroke-width',xlw+'px')
                .call(Plotly.Color.stroke, xa.showline ?
                    xa.linecolor : 'rgba(0,0,0,0)');
            plotinfo.ylines
                .attr('transform', originy)
                .attr('d',(
                    (showleft ? ('M'+leftpos+ypathSuffix) : '') +
                    (showright ? ('M'+rightpos+ypathSuffix) : '') +
                    (showfreey ? ('M'+freeposy+ypathSuffix) : '')) ||
                    'M0,0')
                .attr('stroke-width',ylw+'px')
                .call(Plotly.Color.stroke,ya.showline ?
                    ya.linecolor : 'rgba(0,0,0,0)');

            plotinfo.xaxislayer.attr('transform',originx);
            plotinfo.yaxislayer.attr('transform',originy);
            plotinfo.gridlayer.attr('transform',origin);
            plotinfo.zerolinelayer.attr('transform',origin);
            plotinfo.draglayer.attr('transform',origin);

            // mark free axes as displayed, so we don't draw them again
            if(showfreex) { freefinished.push(xa._id); }
            if(showfreey) { freefinished.push(ya._id); }
        });

        Plotly.Axes.makeClipPaths(gd);

        plots.titles(gd,'gtitle');

        Plotly.Fx.modeBar(gd);

        setGraphContainerScroll(gd);

        return gd._promises.length && Promise.all(gd._promises);
    }

    // titles - (re)draw titles on the axes and plot
    // title can be 'xtitle', 'ytitle', 'gtitle',
    //  or empty to draw all
    plots.titles = function(gd,title) {
        var options;
        if(typeof gd === 'string') gd = document.getElementById(gd);
        if(!title) {
            Plotly.Axes.listIds(gd).forEach(function(axId) {
                plots.titles(gd, axId+'title');
            });
            plots.titles(gd,'gtitle');
            return;
        }

        var fullLayout = gd._fullLayout,
            gs = fullLayout._size,
            axletter = title.charAt(0),
            colorbar = title.substr(1,2)==='cb',
            cbnum, cont;

        if(colorbar) {
            var uid = title.substr(3).replace('title','');
            gd._fullData.some(function(trace, i) {
                if(trace.uid===uid) {
                    cbnum = i;
                    cont = gd.calcdata[i][0].t.cb.axis;
                    return true;
                }
            });
        }
        else cont = fullLayout[Plotly.Axes.id2name(title.replace('title',''))] || fullLayout;

        var prop = cont===fullLayout ? 'title' : cont._name+'.title',
            name = colorbar ? 'colorscale' :
                ((cont._id||axletter).toUpperCase()+' axis'),
            font = cont.titlefont.family,
            fontSize = cont.titlefont.size,
            fontColor = cont.titlefont.color,
            x,
            y,
            transform='',
            attr = {},
            xa,
            ya,
            avoid = {
                selection:d3.select(gd).selectAll('g.'+cont._id+'tick'),
                side:cont.side
            },
            // multiples of fontsize to offset label from axis
            offsetBase = colorbar ? 0 : 1.5,
            avoidTransform;

        // find the transform applied to the parents of the avoid selection
        // which doesn't get picked up by Plotly.Drawing.bBox
        if(colorbar) {
            avoid.offsetLeft = gs.l;
            avoid.offsetTop = gs.t;
        }
        else if(avoid.selection.size()) {
            avoidTransform = d3.select(avoid.selection.node().parentNode)
                .attr('transform')
                .match(/translate\(([-\.\d]+),([-\.\d]+)\)/);
            if(avoidTransform) {
                avoid.offsetLeft = +avoidTransform[1];
                avoid.offsetTop = +avoidTransform[2];
            }
        }

        if(colorbar && cont.titleside) {
            // argh, we only make it here if the title is on top or bottom,
            // not right
            x = gs.l+cont.titlex*gs.w;
            y = gs.t+(1-cont.titley)*gs.h + ((cont.titleside==='top') ?
                    3+fontSize*0.75 : - 3-fontSize*0.25);
            options = {x: x, y: y, 'text-anchor':'start'};
            avoid = {};

            // convertToTspans rotates any 'y...' by 90 degrees...
            // TODO: need a better solution than this hack
            title = 'h'+title;
        }
        else if(axletter==='x'){
            xa = cont;
            ya = (xa.anchor==='free') ?
                {_offset:gs.t+(1-(xa.position||0))*gs.h, _length:0} :
                Plotly.Axes.getFromId(gd, xa.anchor);
            x = xa._offset+xa._length/2;
            y = ya._offset + ((xa.side==='top') ?
                -10 - fontSize*(offsetBase + (xa.showticklabels ? 1 : 0)) :
                ya._length + 10 +
                    fontSize*(offsetBase + (xa.showticklabels ? 1.5 : 0.5)));
            options = {x: x, y: y, 'text-anchor': 'middle'};
            if(!avoid.side) { avoid.side = 'bottom'; }
        }
        else if(axletter==='y'){
            ya = cont;
            xa = (ya.anchor==='free') ?
                {_offset:gs.l+(ya.position||0)*gs.w, _length:0} :
                Plotly.Axes.getFromId(gd, ya.anchor);
            y = ya._offset+ya._length/2;
            x = xa._offset + ((ya.side==='right') ?
                xa._length + 10 +
                    fontSize*(offsetBase + (ya.showticklabels ? 1 : 0.5)) :
                -10 - fontSize*(offsetBase + (ya.showticklabels ? 0.5 : 0)));
            attr = {center: 0};
            options = {x: x, y: y, 'text-anchor': 'middle'};
            transform = {rotate: '-90', offset: 0};
            if(!avoid.side) { avoid.side = 'left'; }
        }
        else{
            // plot title
            name = 'Plot';
            fontSize = fullLayout.titlefont.size;
            x = fullLayout.width/2;
            y = fullLayout._size.t/2;
            options = {x: x, y: y, 'text-anchor': 'middle'};
            avoid = {};
        }

        var opacity = 1,
            isplaceholder = false,
            txt = cont.title.trim();
        if(txt === '') { opacity = 0; }
        if(txt.match(/Click to enter .+ title/)) {
            opacity = 0.2;
            isplaceholder = true;
        }

        var group;
        if(colorbar) {
            group = d3.select(gd)
                .selectAll('.'+cont._id.substr(1)+' .cbtitle');
            // this class-to-rotate thing with convertToTspans is
            // getting hackier and hackier... delete groups with the
            // wrong class
            var otherClass = title.charAt(0)==='h' ?
                title.substr(1) : ('h'+title);
            group.selectAll('.'+otherClass+',.'+otherClass+'-math-group')
                .remove();
        }
        else {
            group = fullLayout._infolayer.selectAll('.g-'+title)
                .data([0]);
            group.enter().append('g')
                .classed('g-'+title, true);
        }

        var el = group.selectAll('text')
            .data([0]);
        el.enter().append('text');
        el.text(txt)
            // this is hacky, but convertToTspans uses the class
            // to determine whether to rotate mathJax...
            // so we need to clear out any old class and put the
            // correct one (only relevant for colorbars, at least
            // for now) - ie don't use .classed
            .attr('class', title);

        function titleLayout(titleEl){
            Plotly.Lib.syncOrAsync([drawTitle,scootTitle], titleEl);
        }

        function drawTitle(titleEl) {
            titleEl.attr('transform', transform ?
                'rotate(' + [transform.rotate, options.x, options.y] +
                    ') translate(0, '+transform.offset+')' :
                null);
            titleEl.style({
                    'font-family': font,
                    'font-size': d3.round(fontSize,2)+'px',
                    fill: Plotly.Color.rgb(fontColor),
                    opacity: opacity*Plotly.Color.opacity(fontColor)
                })
                .attr(options)
                .call(Plotly.util.convertToTspans)
                .attr(options);
            titleEl.selectAll('tspan.line')
                .attr(options);
            return plots.previousPromises(gd);
        }

        function scootTitle(titleElIn) {
            var titleGroup = d3.select(titleElIn.node().parentNode);

            if(avoid && avoid.selection && avoid.side && txt){
                titleGroup.attr('transform',null);

                // move toward avoid.side (= left, right, top, bottom) if needed
                // can include pad (pixels, default 2)
                var shift = 0,
                    backside = {
                        left: 'right',
                        right: 'left',
                        top: 'bottom',
                        bottom: 'top'
                    }[avoid.side],
                    shiftSign = (['left','top'].indexOf(avoid.side)!==-1) ?
                        -1 : 1,
                    pad = $.isNumeric(avoid.pad) ? avoid.pad : 2,
                    titlebb = Plotly.Drawing.bBox(titleGroup.node()),
                    paperbb = {
                        left: 0,
                        top: 0,
                        right: fullLayout.width,
                        bottom: fullLayout.height
                    },
                    maxshift = colorbar ? fullLayout.width:
                        (paperbb[avoid.side]-titlebb[avoid.side]) *
                        ((avoid.side==='left' || avoid.side==='top') ? -1 : 1);
                // Prevent the title going off the paper
                if(maxshift<0) shift = maxshift;
                else {
                    // so we don't have to offset each avoided element,
                    // give the title the opposite offset
                    titlebb.left -= avoid.offsetLeft;
                    titlebb.right -= avoid.offsetLeft;
                    titlebb.top -= avoid.offsetTop;
                    titlebb.bottom -= avoid.offsetTop;

                    // iterate over a set of elements (avoid.selection)
                    // to avoid collisions with
                    avoid.selection.each(function(){
                        var avoidbb = Plotly.Drawing.bBox(this);

                        if(Plotly.Lib.bBoxIntersect(titlebb,avoidbb,pad)) {
                            shift = Math.max(shift, shiftSign * (
                                avoidbb[avoid.side] - titlebb[backside]) + pad);
                        }
                    });
                    shift = Math.min(maxshift, shift);
                }
                if(shift>0 || maxshift<0) {
                    var shiftTemplate = {
                        left: [-shift, 0],
                        right: [shift, 0],
                        top: [0, -shift],
                        bottom: [0, shift]
                    }[avoid.side];
                    titleGroup.attr('transform',
                        'translate(' + shiftTemplate + ')');
                }
            }
        }

        el.attr({'data-unformatted': txt})
            .call(titleLayout);

        var placeholderText = 'Click to enter '+name.replace(/\d+/,'')+' title';

        function setPlaceholder(){
            opacity = 0;
            isplaceholder = true;
            txt = placeholderText;
            fullLayout._infolayer.select('.'+title)
                .attr({'data-unformatted': txt})
                .text(txt)
                .on('mouseover.opacity',function(){
                    d3.select(this).transition()
                        .duration(100).style('opacity',1);
                })
                .on('mouseout.opacity',function(){
                    d3.select(this).transition()
                        .duration(1000).style('opacity',0);
                });
        }

        if(gd._context.editable){
            if(!txt) setPlaceholder();

            el.call(Plotly.util.makeEditable)
                .on('edit', function(text){
                    if(colorbar) Plotly.restyle(gd,'colorbar.title',text,cbnum);
                    else Plotly.relayout(gd,prop,text);
                })
                .on('cancel', function(){
                    this.text(this.attr('data-unformatted'))
                        .call(titleLayout);
                })
                .on('input', function(d){
                    this.text(d || ' ').attr(options)
                        .selectAll('tspan.line')
                            .attr(options);
                });
        }
        else if(!txt || txt.match(/Click to enter .+ title/)) {
            el.remove();
        }
        el.classed('js-placeholder',isplaceholder);
    };

    // ----------------------------------------------------
    // Utility functions
    // ----------------------------------------------------

    /**
     * JSONify the graph data and layout
     *
     * This function needs to recurse because some src can be inside
     * sub-objects.
     *
     * It also strips out functions and private (starts with _) elements.
     * Therefore, we can add temporary things to data and layout that don't
     * get saved.
     *
     * @param gd The graphDiv
     * @param {Boolean} dataonly If true, don't return layout.
     * @param {'keepref'|'keepdata'|'keepall'} [mode='keepref'] Filter what's kept
     *      keepref: remove data for which there's a src present
     *          eg if there's xsrc present (and xsrc is well-formed,
     *          ie has : and some chars before it), strip out x
     *      keepdata: remove all src tags, don't remove the data itself
     *      keepall: keep data and src
     * @param {String} output If you specify 'object', the result will not be stringified
     * @param {Boolean} useDefaults If truthy, use _fullLayout and _fullData
     * @returns {Object|String}
     */
    plots.graphJson = function(gd, dataonly, mode, output, useDefaults){

        if(typeof gd === 'string') { gd = document.getElementById(gd); }

        // if the defaults aren't supplied yet, we need to do that...
        if ((useDefaults && dataonly && !gd._fullData) ||
                (useDefaults && !dataonly && !gd._fullLayout)) {
            plots.supplyDefaults(gd);
        }

        var data = (useDefaults) ? gd._fullData : gd.data,
            layout = (useDefaults) ? gd._fullLayout : gd.layout;

        function stripObj(d) {
            if(typeof d === 'function') {
                return null;
            }

            if($.isPlainObject(d)) {
                var o={}, v;
                for(v in d) {
                    // remove private elements and functions
                    // _ is for private, [ is a mistake ie [object Object]
                    if(typeof d[v]==='function' ||
                            ['_','['].indexOf(v.charAt(0))!==-1) {
                        continue;
                    }

                    // look for src/data matches and remove the appropriate one
                    if(mode==='keepdata') {
                        // keepdata: remove all ...src tags
                        if(v.substr(v.length-3)==='src') {
                            continue;
                        }
                    }
                    else if(mode!=='keepall') {
                        // keepref: remove sourced data but only
                        // if the source tag is well-formed
                        var src = d[v+'src'];
                        if(typeof src==='string' && src.indexOf(':')>0) {
                            continue;
                        }
                    }

                    // OK, we're including this... recurse into it
                    o[v] = stripObj(d[v]);
                }
                return o;
            }

            if($.isArray(d)) {
                return d.map(stripObj);
            }

            // convert native dates to date strings...
            // mostly for external users exporting to plotly
            if(d && d.getTime) {
                return Plotly.Lib.ms2DateTime(d);
            }

            return d;
        }

        var obj = {
            data:(data||[]).map(function(v){
                var d = stripObj(v);
                // fit has some little arrays in it that don't contain data,
                // just fit params and meta
                if(dataonly) { delete d.fit; }
                return d;
            })
        };
        if(!dataonly) { obj.layout = stripObj(layout); }

        if(gd.framework && gd.framework.isPolar) obj = gd.framework.getConfig();

        return (output==='object') ? obj : JSON.stringify(obj);
    };

    return plots;

}));