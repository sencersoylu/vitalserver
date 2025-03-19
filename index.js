const net = require('net');
require('dotenv').config();
const express = require('express');

const app = express();
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const demo = 1;

const connections = []; // view soket bağlantılarının tutulduğu array
let isWorking = 0;
let isConnectedPLC = 0;

const sensorData = [];

const { Console } = require('console');

app.use(express.json());

// Add headers before the routes are defined
app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
	allowedHeaders: ['X-Requested-With', 'content-type', 'Authorization'],
	credentials: true
}));

const server = http.Server(app);
server.listen(4000, () => console.log('Listening on port 4000'));

const io = socketIO(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
		allowedHeaders: ['X-Requested-With', 'content-type', 'Authorization'],
		credentials: true
	},
	handlePreflightRequest: (req, res) => {
		res.writeHead(200, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
			'Access-Control-Allow-Headers': 'X-Requested-With,content-type,Authorization',
			'Access-Control-Allow-Credentials': true
		});
		res.end();
	}
});

// SerialPort configuration
const serialPortConfig = {
	path: process.env.SERIAL_PORT_PATH || '/dev/ttyUSB0',
	baudRate: parseInt(process.env.SERIAL_BAUD_RATE) || 57600,
	autoOpen: false
};

// Initialize SerialPort
const serialport = new SerialPort(serialPortConfig);
const parser = serialport.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Open serial port
serialport.open((err) => {
	if (err) {
		console.error('Error opening serial port:', err.message);
	} else {
		console.log(`Serial port ${serialPortConfig.path} opened successfully`);
	}
});

// Handle data from serial port
parser.on('data', (data) => {
	console.log('SerialPort data:', data);
	// Broadcast data to all connected clients
	io.emit('serialData', { data });
});

// Handle serial port errors
serialport.on('error', (err) => {
	console.error('SerialPort error:', err.message);
	io.emit('serialError', { error: err.message });
});

io.on('connection', (socket) => {
	connections.push(socket);
	console.log(' %s sockets is connected', connections.length);
	//sendMessage();

	socket.on('disconnect', () => {
		connections.splice(connections.indexOf(socket), 1);
	});

	// Serial port events
	socket.on('serialSend', (data) => {
		console.log('Sending to serial port:', data);
		if (!data || typeof data !== 'string') {
			socket.emit('serialError', { error: 'Invalid data format. Expected a string.' });
			return;
		}

		if (serialport.isOpen) {
			serialport.write(data + '\r\n', (err) => {
				if (err) {
					console.error('Error writing to serial port:', err.message);
					socket.emit('serialError', { error: err.message });
				} else {
					console.log('Message sent to serial port:', data);
					socket.emit('serialSent', { success: true, message: data });
				}
			});
		} else {
			socket.emit('serialError', { error: 'Serial port is not open' });
		}
	});

	socket.on('openSerial', () => {
		if (!serialport.isOpen) {
			serialport.open((err) => {
				if (err) {
					console.error('Error opening serial port:', err.message);
					socket.emit('serialError', { error: err.message });
				} else {
					console.log(`Serial port opened successfully`);
					socket.emit('serialStatus', { isOpen: true });
				}
			});
		} else {
			socket.emit('serialStatus', { isOpen: true, message: 'Serial port is already open' });
		}
	});

	socket.on('closeSerial', () => {
		if (serialport.isOpen) {
			serialport.close((err) => {
				if (err) {
					console.error('Error closing serial port:', err.message);
					socket.emit('serialError', { error: err.message });
				} else {
					console.log('Serial port closed successfully');
					socket.emit('serialStatus', { isOpen: false });
				}
			});
		} else {
			socket.emit('serialStatus', { isOpen: false, message: 'Serial port is already closed' });
		}
	});

	socket.on('writeBit', async function (data) {
		console.log(data);

		try {
			console.log('**************** START ****************');

			isWorking = 1;
			const client = await openClientConnection();

			let bufData = await writeBit(data.register, data.value);
			await client.write(bufData);
		} catch (err) {
			console.log(err);
			isConnectedPLC = 0;
		} finally {
			isWorking = 0;
			// client.destroy();
			console.log('**************** END ****************');
		}
	});
});
