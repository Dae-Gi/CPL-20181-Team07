/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import RandomSwitchRule from './RandomSwitchRule.js';
import AbandonRequestsRule from './AbandonRequestsRule';
import BolaRule from './BolaRule';
import BolaAbandonRule from './BolaAbandonRule';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import MetricsModel from '../../models/MetricsModel';
import DashMetrics from '../../../dash/DashMetrics';
import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest.js';
import WebSockController from '../../../sock/WebSockController.js';

const QUALITY_SWITCH_RULES = 'qualitySwitchRules';
const ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';

function ABRRulesCollection() {

    let context = this.context;

    let instance,
        qualitySwitchRules,
        abandonFragmentRules,
        webSockController,
        qualityQueue,
        abrCallback,
        abrIdx;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];
        qualityQueue = {};
        webSockController = WebSockController(context).getInstance();
        webSockController.setCallback(event => {
            let msg = JSON.parse(event.data);
            console.log(msg);
            const switchRequest = SwitchRequest(context).create();
            switchRequest.reason = msg.reason;
            switchRequest.value = msg.quality;
            switchCallback(msg.rule, msg.idx, switchRequest);
        });
        abrIdx = 0;

        console.log('Websock Module Test : socket list', webSockController);

        let metricsModel = MetricsModel(context).getInstance();
        let dashMetrics = DashMetrics(context).getInstance();
        let mediaPlayerModel = MediaPlayerModel(context).getInstance();

        if (mediaPlayerModel.getBufferOccupancyABREnabled()) {
            qualitySwitchRules.push(
                BolaRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                })
            );
            abandonFragmentRules.push(
                BolaAbandonRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                })
            );
        } else {
            qualitySwitchRules.push(RandomSwitchRule(context).create({
                webSockConnection: webSockController.getConnection(),
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            }));
            abandonFragmentRules.push(AbandonRequestsRule(context).create());
        }
    }

    function setABRCallback(callback) {
        abrCallback = callback;
    }

    function getRules (type) {
        switch (type) {
            case QUALITY_SWITCH_RULES:
                return qualitySwitchRules;
            case ABANDON_FRAGMENT_RULES:
                return abandonFragmentRules;
            default:
                return null;
        }
    }

    function getActiveRules(srArray) {
        return srArray.filter(sr => sr.value > SwitchRequest.NO_CHANGE);
    }

    function getMinSwitchRequest(srArray) {
        if (srArray.length === 0) {
            return;
        }
        return srArray.reduce((a, b) => { return a.value < b.value ? a : b; });
    }

    function getMaxQuality(rulesContext, streamProcessor) {
        abrIdx = abrIdx + 1;
        qualityQueue[abrIdx] = { 'streamProcessor': streamProcessor };
        qualitySwitchRules.map(rule => {qualityQueue[abrIdx][rule.name] = false; rule.getMaxIndex(rulesContext, abrIdx, switchCallback);});
    }

    function switchCallback(rule, idx, quality) {
        qualityQueue[idx][rule] = quality;
        console.log('switch callback (quality)', quality);
        let results = [];
        for (let key in qualityQueue[idx]) {
            if (qualityQueue[idx][key] === false) return;
            results.push(qualityQueue[idx][key]);
        }
        let streamProcessor = qualityQueue[idx].streamProcessor;
        delete qualityQueue[idx];

        console.log('switch callback (results)', results);
        let activeRules = getActiveRules(results);
        let maxQuality = getMinSwitchRequest(activeRules);
        console.log('switch callback (maxQuality)', maxQuality);
        abrCallback(maxQuality || SwitchRequest(context).create(), streamProcessor);
    }

    function shouldAbandonFragment(rulesContext) {
        let abandonRequestArray = abandonFragmentRules.map(rule => rule.shouldAbandon(rulesContext));
        let activeRules = getActiveRules(abandonRequestArray);
        let shouldAbandon = getMinSwitchRequest(activeRules);

        return shouldAbandon || SwitchRequest(context).create();
    }

    instance = {
        initialize: initialize,
        getRules: getRules,
        getMaxQuality: getMaxQuality,
        shouldAbandonFragment: shouldAbandonFragment,
        setABRCallback: setABRCallback
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
let factory =  FactoryMaker.getSingletonFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
export default factory;
