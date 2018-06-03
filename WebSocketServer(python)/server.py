from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import random
import json
import threading
 
class SimpleEcho(WebSocket):
    def handleMessage(self):
        msg = json.loads(self.data)
        print('recv', msg)
        f = open("train.txt", 'a')
        x1 = msg['throughput']
        x2 = msg['latency']         
        y = msg['value']
        data = str(x1) + " " + str(x2) + " " + str(y) + str('\n')
        f.write(data)
        msg['quality'] = 10
        msg['reason'] = 'random'
        print('send', msg)
        f.close()
        self.sendMessage(json.dumps(msg))

    def handleConnected(self):
        print(self.address, 'connected')

    def handleClose(self):
        print(self.address, 'closed')

server = SimpleWebSocketServer('localhost', 9000, SimpleEcho)
server.serveforever()