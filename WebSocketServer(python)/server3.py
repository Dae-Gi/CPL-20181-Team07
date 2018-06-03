from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import json
import threading
 
class SimpleEcho(WebSocket):
    def handleMessage(self):
        msg = json.loads(self.data)
        print('recv', msg)
        x1 = msg['throughput']
        x2 = msg['latency']         
        y = msg['value']

        if msg['type'] == 'default':
            msg['quality'] = y
        if msg['type'] == "music":
            msg['quality'] = y/10
        if msg['type'] == "sport":
            msg['quality'] = y/5
        
        print('send', msg)
        self.sendMessage(json.dumps(msg))

    def handleConnected(self):
        print(self.address, 'connected')

    def handleClose(self):
        print(self.address, 'closed')

server = SimpleWebSocketServer('192.168.253.129', 9000, SimpleEcho)
server.serveforever()
