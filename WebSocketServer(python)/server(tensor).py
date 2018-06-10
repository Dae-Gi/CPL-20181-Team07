import tensorflow as tf
import numpy as np
from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import json

xy1 = np.loadtxt('train1.txt', unpack =True, dtype='float32')
x_data1 = xy1[:-1]
x_data1 = np.transpose(x_data1)

thr_max1 = max(x_data1[:, 0])
lat_max1 = max(x_data1[:, 1])

x_data1[:, 0] = x_data1[:, 0] / thr_max1
x_data1[:, 1] = x_data1[:, 1] / lat_max1

y_data1 = np.reshape(xy1[-1], (-1))
print(x_data1.shape, y_data1.shape)

X1 = tf.placeholder(tf.float32, [None, 2])
Y1 = tf.placeholder(tf.uint8, [None])
Y1_onehot = tf.one_hot(Y1, 10)
W1 = tf.Variable(tf.random_normal([2, 10]))
b1 = tf.Variable(tf.random_normal([1]))

hypothesis1 = tf.nn.relu(tf.matmul(X1, W1) + b1)
predictions1 = tf.argmax(hypothesis1, 1)
cost1 = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=hypothesis1, labels = Y1_onehot))
rate1 = tf.Variable(0.01)
optimizer1 = tf.train.AdamOptimizer(rate1)
train1 = optimizer1.minimize(cost1)
sess1 = tf.Session()
sess1.run(tf.global_variables_initializer())

for step in range(1001):
   w, c, _ = sess1.run([W1, cost1, train1], feed_dict = {X1: x_data1, Y1: y_data1})
   if step % 1000 == 0:
      print(step, c)

xy2 = np.loadtxt('train2.txt', unpack =True, dtype='float32')
x_data2 = xy2[:-1]
x_data2 = np.transpose(x_data2)

thr_max2 = max(x_data2[:, 0])
lat_max2 = max(x_data2[:, 1])

x_data2[:, 0] = x_data2[:, 0] / thr_max2
x_data2[:, 1] = x_data2[:, 1] / lat_max2

y_data2 = np.reshape(xy2[-1], (-1))
print(x_data2.shape, y_data2.shape)

X2 = tf.placeholder(tf.float32, [None, 2])
Y2 = tf.placeholder(tf.uint8, [None])
Y2_onehot = tf.one_hot(Y2, 10)
W2 = tf.Variable(tf.random_normal([2, 10]))
b2 = tf.Variable(tf.random_normal([1]))

hypothesis2 = tf.nn.relu(tf.matmul(X2, W2) + b2)
predictions2 = tf.argmax(hypothesis2, 1)
cost2 = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=hypothesis2, labels = Y2_onehot))
rate2 = tf.Variable(0.01)
optimizer2 = tf.train.AdamOptimizer(rate2)
train2 = optimizer2.minimize(cost2)
sess2 = tf.Session()
sess2.run(tf.global_variables_initializer())

for step in range(1001):
   w, c, _ = sess2.run([W2, cost2, train2], feed_dict = {X2: x_data2, Y2: y_data2})
   if step % 1000 == 0:
      print(step, c)

xy3 = np.loadtxt('train3.txt', unpack =True, dtype='float32')
x_data3 = xy3[:-1]
x_data3 = np.transpose(x_data3)

thr_max3 = max(x_data3[:, 0])
lat_max3 = max(x_data3[:, 1])

x_data3[:, 0] = x_data3[:, 0] / thr_max3
x_data3[:, 1] = x_data3[:, 1] / lat_max3

y_data3 = np.reshape(xy3[-1], (-1))
print(x_data3.shape, y_data3.shape)

X3 = tf.placeholder(tf.float32, [None, 2])
Y3 = tf.placeholder(tf.uint8, [None])
Y3_onehot = tf.one_hot(Y3, 10)
W3 = tf.Variable(tf.random_normal([2, 10]))
b3 = tf.Variable(tf.random_normal([1]))

hypothesis3 = tf.nn.relu(tf.matmul(X3, W3) + b3)
predictions3 = tf.argmax(hypothesis3, 1)
cost3 = tf.reduce_mean(tf.nn.softmax_cross_entropy_with_logits(logits=hypothesis3, labels = Y3_onehot))
rate3 = tf.Variable(0.01)
optimizer3 = tf.train.AdamOptimizer(rate3)
train3 = optimizer3.minimize(cost3)
sess3 = tf.Session()
sess3.run(tf.global_variables_initializer())

for step in range(1001):
   w, c, _ = sess3.run([W3, cost3, train3], feed_dict = {X3: x_data3, Y3: y_data3})
   if step % 1000 == 0:
      print(step, c)

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
        try:
            if msg['type'] == 'default':
                p = sess1.run([predictions1], feed_dict = {X1:[[min(1, msg['throughput']/thr_max1), min(1, msg['latency']/lat_max1)]]})
            if msg['type'] == 'sport':
                p = sess2.run([predictions2], feed_dict = {X2:[[min(1, msg['throughput']/thr_max2), min(1, msg['latency']/lat_max2)]]})
            if msg['type'] == 'music':
                p = sess3.run([predictions3], feed_dict = {X3:[[min(1, msg['throughput']/thr_max3), min(1, msg['latency']/lat_max3)]]})
        except Exception as e:
            print(e)
        print('AI가 결정한 품질 : ', int(p[0][0]))
        msg['quality'] = int(p[0][0])
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
