import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest.js';

function RandomSwitchRule(config) {
    const context = this.context;
    const name = 'RandomSwitchrule';
    let webSockConnection;

    function setup() {
        webSockConnection = config.webSockConnection;
    }

    function getMaxIndex(rulesContext, idx) {
        const switchRequest = SwitchRequest(context).create();
        if (webSockConnection.readyState != 1) {
            return switchRequest;
        }
        let msg = { rule: this.name, idx: idx, msg: 'request quality' };
        console.log('msg: ', msg);
        webSockConnection.send(JSON.stringify(msg));
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
