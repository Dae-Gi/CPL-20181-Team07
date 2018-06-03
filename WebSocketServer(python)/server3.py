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
            if y>7:                
                msg['quality'] = 3 #2
            if y<3:
                msg['quality'] = 1 #1
            else :
                msg['quality'] = 2 #2
        if msg['type'] == "sport":
            if y>7:
                msg['quality'] = 5
            if y<3:
                msg['quality'] = 2
            else :
                msg['quality'] = 3 
        
        print('send', msg)
        self.sendMessage(json.dumps(msg))

    def handleConnected(self):
        print(self.address, 'connected')

    def handleClose(self):
        print(self.address, 'closed')

server = SimpleWebSocketServer('192.168.253.129', 9000, SimpleEcho)
server.serveforever()
