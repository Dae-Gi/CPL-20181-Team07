# -*- coding: cp949 -*- 
import tensorflow as tf
import numpy as np
from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import json

xy = np.loadtxt('train.txt', unpack =True, dtype='float32')
x_data = xy[:-1]
x_data = np.transpose(x_data)

thr_max = max(x_data[:, 0])
lat_max = max(x_data[:, 1])

x_data[:, 0] = x_data[:, 0] / thr_max
x_data[:, 1] = x_data[:, 1] / lat_max

y_data = np.reshape(xy[-1], (-1))
print(x_data.shape, y_data.shape)

X = tf.placeholder(tf.float32, [None, 2])
Y = tf.placeholder(tf.uint8, [None])
Y_onehot = tf.one_hot(Y, 10)
W = tf.Variable(tf.random_normal([2, 10]))
b = tf.Variable(tf.random_normal([1]))

hypothesis = tf.nn.relu(tf.matmul(X, W) + b)
predictions = tf.argmax(hypothesis, 1)
cost = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=hypothesis, labels = Y_onehot))
rate = tf.Variable(0.01)
optimizer = tf.train.AdamOptimizer(rate)
train = optimizer.minimize(cost)
sess = tf.Session()
sess.run(tf.global_variables_initializer())

for step in range(50001):
   w, c, _ = sess.run([W, cost, train], feed_dict = {X: x_data, Y: y_data})
   if step % 10000 == 0:
      print(step, c)

class SimpleEcho(WebSocket):
    def handleMessage(self):
        msg = json.loads(self.data)
        print('recv', msg)
        f = open("train.txt", 'a')
        x1 = msg['throughput']
        x2 = msg['latency'] 
        #x3 = msg['error']
        y = msg['value']
        data = str(x1) + " " + str(x2) + " " + str(y) + str('\n')
        f.write(data)
        try:
            p = sess.run([predictions], feed_dict = {X:[[min(1, msg['throughput']/thr_max), min(1, msg['latency']/lat_max)]]})
        except Exception as e:
            print(e)
        print('AI가 결정한 품질 : ', p[0][0])
        msg['quality'] = int(p[0][0])
        msg['reason'] = 'random'
        
        #if int(p[0][0])> 20:
        #   msg['error'] = 'over'
        #else:
        #   msg['error'] = 'deault'
        
        print('send', msg)
        f.close()
        self.sendMessage(json.dumps(msg))

    def handleConnected(self):
        print(self.address, 'connected')

    def handleClose(self):
        print(self.address, 'closed')

server = SimpleWebSocketServer('localhost', 9000, SimpleEcho)
server.serveforever()

while(True):
   thr, lat = [float(i) for i in input().split()]
   print([thr / thr_max, lat / lat_max])
   p = sess.run([predictions], feed_dict = {X: [[thr / thr_max, lat / lat_max]]})
   print("AI : ", p[0][0])