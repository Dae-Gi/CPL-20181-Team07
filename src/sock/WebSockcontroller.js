import FactoryMaker from '../core/FactoryMaker';

const HOST_NAME = 'ws://localhost';
const HOST_PORT = '9000';

function WebSocketcontroller(){

	let instance,
		conn;

	function initialize(){
		console.log('webSock Module Test : call initializer');
		conn = new WebSocket(HOST_NAME + ':' + HOST_PORT + '/ws');
	}

	function getConnection(){
		return conn;
	}

	function setCallback(cb){
		conn.onmessage = cb;
	}

	instance = {
		initialize: initialize,
		getConnection: getConnection,
		setCallback: setCallback
	};

	return instance;
}

WebSocketcontroller.__dashjs_factory_name = 'WebSocketcontroller';
let factory = FactoryMaker.getSingletonFactory(webSocketController);
export default factory;
