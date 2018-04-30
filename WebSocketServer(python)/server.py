from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import random
import json
import threading
 
def setqual():
    while True:
        qual = input("input : ")
        f = open("qual.txt", 'w')
        f.write(qual)
        f.close()

class SimpleEcho(WebSocket):
    def handleMessage(self):
        msg = json.loads(self.data)
        f = open("qual.txt", 'r')
        qual = f.read()
        msg['quality'] = qual
        f.close()
        msg['reason'] = 'random'
        self.sendMessage(json.dumps(msg))

    #def handleConnected(self):
    #    print(self.address, 'connected')

    #def handleClose(self):
    #    print(self.address, 'closed')

server = SimpleWebSocketServer('192.168.253.129', 9000, SimpleEcho)
t = threading.Thread(target=setqual, args=())
t.daemon = True
t.start()
server.serveforever()