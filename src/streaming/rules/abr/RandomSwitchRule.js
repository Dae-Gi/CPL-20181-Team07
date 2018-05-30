import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest.js';
import DashMetrics from '../../../dash/DashMetrics';
import MetricsModel from '../../models/MetricsModel';
import Debug from '../../../core/Debug';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import { HTTPRequest } from '../../vo/metrics/HTTPRequest';
import BufferController from '../../controllers/BufferController';
import AbrController from '../../controllers/AbrController';


function RandomSwitchRule(config) {
    const context = this.context;
    const name = 'AIswitchrule';
    let webSockConnection;
    const MAX_MEASUREMENTS_TO_KEEP = 20;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    const AVERAGE_LATENCY_SAMPLES = AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
    const CACHE_LOAD_THRESHOLD_VIDEO = 50;
    const CACHE_LOAD_THRESHOLD_AUDIO = 5;
    const CACHE_LOAD_THRESHOLD_LATENCY = 50;
    const THROUGHPUT_DECREASE_SCALE = 1.3;
    const THROUGHPUT_INCREASE_SCALE = 1.3;
    const log = Debug(context).getInstance().log;
    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;

    let throughputArray,
        latencyArray,
        mediaPlayerModel;

    var generateRandom = function (min, max) {
        var ranNum = Math.floor(Math.random() * (max - min + 1)) + min;
        return ranNum;
    };

    function setup() {
        throughputArray = [];
        latencyArray = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        webSockConnection = config.webSockConnection;
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function storeLatency(mediaType, latency) {
        if (!latencyArray[mediaType]) {
            latencyArray[mediaType] = [];
        }
        latencyArray[mediaType].push(latency);

        if (latencyArray[mediaType].length > AVERAGE_LATENCY_SAMPLES) {
            return latencyArray[mediaType].shift();
        }

        return undefined;
    }

    function getAverageLatency(mediaType) {
        let average;
        if (latencyArray[mediaType] && latencyArray[mediaType].length > 0) {
            average = latencyArray[mediaType].reduce((a, b) => { return a + b; }) / latencyArray[mediaType].length;
        }

        return average;
    }

    function getSample(type, isDynamic) {
        let size = Math.min(throughputArray[type].length, isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD);
        const sampleArray = throughputArray[type].slice(size * -1, throughputArray[type].length);
        if (sampleArray.length > 1) {
            sampleArray.reduce((a, b) => {
                if (a * THROUGHPUT_INCREASE_SCALE <= b || a >= b * THROUGHPUT_DECREASE_SCALE) {
                    size++;
                }
                return b;
            });
        }
        size = Math.min(throughputArray[type].length, size);
        return throughputArray[type].slice(size * -1, throughputArray[type].length);
    }

    function getAverageThroughput(type, isDynamic) {
        const sample = getSample(type, isDynamic);
        let averageThroughput = 0;
        if (sample.length > 0) {
            const totalSampledValue = sample.reduce((a, b) => a + b, 0);
            averageThroughput = totalSampledValue / sample.length;
        }
        if (throughputArray[type].length >= MAX_MEASUREMENTS_TO_KEEP) {
            throughputArray[type].shift();
        }
        return (averageThroughput / 1000) * mediaPlayerModel.getBandwidthSafetyFactor();
    }

    function isCachedResponse(latency, downloadTime, mediaType) {
        let ret = false;

        if (latency < CACHE_LOAD_THRESHOLD_LATENCY) {
            ret = true;
        }

        if (!ret) {
            switch (mediaType) {
                case 'video':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_VIDEO;
                    break;
                case 'audio':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_AUDIO;
                    break;
                default:
                    break;
            }
        }

        return ret;
    }

    function getMaxIndex(rulesContext, idx) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = mediaInfo.type;
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const streamProcessor = rulesContext.getStreamProcessor();
        const abrController = streamProcessor.getABRController();
        const isDynamic = streamProcessor.isDynamic();
        const lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        const bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        const hasRichBuffer = rulesContext.hasRichBuffer();
        const switchRequest = SwitchRequest(context).create();

        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE || !bufferStateVO || hasRichBuffer) {
            return switchRequest;
        }

        if (webSockConnection.readyState !== 1) {
            return switchRequest;
        }

        let downloadTimeInMilliseconds;
        let latencyTimeInMilliseconds;

        if (lastRequest.trace && lastRequest.trace.length) {

            latencyTimeInMilliseconds = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) || 1;
            downloadTimeInMilliseconds = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) || 1; //Make sure never 0 we divide by this value. Avoid infinity!

            const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);

            const lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));

            let throughput;
            let latency;
            //Prevent cached fragment loads from skewing the average throughput value - allow first even if cached to set allowance for ABR rules..
            if (isCachedResponse(latencyTimeInMilliseconds, downloadTimeInMilliseconds, mediaType)) {
                if (!throughputArray[mediaType] || !latencyArray[mediaType]) {
                    throughput = lastRequestThroughput / 1000;
                    latency = latencyTimeInMilliseconds;
                } else {
                    throughput = getAverageThroughput(mediaType, isDynamic);
                    latency = getAverageLatency(mediaType);
                }
            } else {
                storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
                throughput = getAverageThroughput(mediaType, isDynamic);
                storeLatency(mediaType, latencyTimeInMilliseconds);
                latency = getAverageLatency(mediaType, isDynamic);
            }

            abrController.setAverageThroughput(mediaType, throughput);
            if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {
                if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                    if (mediaInfo.type == 'video') {
                        if (document.getElementById('latency').value != '-1')
                            latency = document.getElementById('latency').value;
                        if (document.getElementById('throghput').value != '-1')
                            throughput = document.getElementById('throghput').value;
                        switchRequest.value = abrController.getQualityForBitrate(mediaInfo, throughput, latency);
                        streamProcessor.getScheduleController().setTimeToLoadDelay(0);
                        console.log('AISwitchRule requesting switch to index: ', switchRequest.value, 'type: ', 'Average Throughput', Math.round(throughput), 'kbps');
                        let msg = { rule: this.name, idx: idx, msg: 'request quality', latency: latency, throughput: throughput, value: switchRequest.value };
                        console.log('msg: ', msg);
                        webSockConnection.send(JSON.stringify(msg));
                    }
                }
            }

        }
        return switchRequest;
    }

    function reset() {
        setup();
    }

    const instance = {
        getMaxIndex: getMaxIndex,
        reset: reset,
        name: name
    };

    setup();
    return instance;
}

RandomSwitchRule.__dashjs_factory_name = 'RandomSwitchRule';
export default FactoryMaker.getClassFactory(RandomSwitchRule);
