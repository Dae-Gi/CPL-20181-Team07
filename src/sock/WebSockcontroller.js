import FactoryMaker from '../core/FactoryMaker';

const HOST_NAME = 'ws://192.168.253.129';
const HOST_PORT = '9000';

function WebSocketController() {

    let instance,
		conn;

    function initialize() {
        console.log('webSock Module Test : call initializer');
        conn = new WebSocket(HOST_NAME + ':' + HOST_PORT + '/ws');
    }

    function getConnection() {
        return conn;
    }

    function setCallback(cb) {
        conn.onmessage = cb;
    }

    instance = {
        initialize: initialize,
        getConnection: getConnection,
        setCallback: setCallback
    };

    return instance;
}

WebSocketController.__dashjs_factory_name = 'WebSocketcontroller';
let factory = FactoryMaker.getSingletonFactory(WebSocketController);
export default factory;
