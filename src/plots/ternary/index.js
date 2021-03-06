/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var Ternary = require('./ternary');

var Plots = require('../../plots/plots');
var counterRegex = require('../../lib').counterRegex;
var TERNARY = 'ternary';

exports.name = TERNARY;

exports.attr = 'subplot';

exports.idRoot = TERNARY;

exports.idRegex = exports.attrRegex = counterRegex(TERNARY);

exports.attributes = require('./layout/attributes');

exports.layoutAttributes = require('./layout/layout_attributes');

exports.supplyLayoutDefaults = require('./layout/defaults');

exports.plot = function plotTernary(gd) {
    var fullLayout = gd._fullLayout,
        calcData = gd.calcdata,
        ternaryIds = Plots.getSubplotIds(fullLayout, TERNARY);

    for(var i = 0; i < ternaryIds.length; i++) {
        var ternaryId = ternaryIds[i],
            ternaryCalcData = Plots.getSubplotCalcData(calcData, TERNARY, ternaryId),
            ternary = fullLayout[ternaryId]._subplot;

        // If ternary is not instantiated, create one!
        if(!ternary) {
            ternary = new Ternary({
                id: ternaryId,
                graphDiv: gd,
                container: fullLayout._ternarylayer.node()
            },
                fullLayout
            );

            fullLayout[ternaryId]._subplot = ternary;
        }

        ternary.plot(ternaryCalcData, fullLayout, gd._promises);
    }
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var oldTernaryKeys = Plots.getSubplotIds(oldFullLayout, TERNARY);

    for(var i = 0; i < oldTernaryKeys.length; i++) {
        var oldTernaryKey = oldTernaryKeys[i];
        var oldTernary = oldFullLayout[oldTernaryKey]._subplot;

        if(!newFullLayout[oldTernaryKey] && !!oldTernary) {
            oldTernary.plotContainer.remove();
            oldTernary.clipDef.remove();
            oldTernary.clipDefRelative.remove();
        }
    }
};
