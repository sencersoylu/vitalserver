// Client-side example for connecting to the server and interacting with the serial port
// Include this in your frontend JavaScript file

// Connect to the Socket.IO server
const socket = io('http://localhost:4000');

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to the server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from the server');
});

// Listen for serial data from the server
socket.on('serialData', (data) => {
  console.log('Received data from serial port:', data.data);
  // Do something with the data, like updating the UI
});

// Listen for serial port errors
socket.on('serialError', (data) => {
  console.error('Serial port error:', data.error);
  // Display error to the user
});

// Listen for serial port status updates
socket.on('serialStatus', (data) => {
  console.log('Serial port status:', data.isOpen ? 'Open' : 'Closed');
  // Update UI to reflect current status
});

socket.on('serialSent', (data) => {
  console.log('Message sent to serial port:', data.success);
  // Update UI to show message was sent
});

// Example functions to interact with the serial port

// Send data to the serial port
function sendSerialData(message) {
  socket.emit('serialSend', { message });
}

// Open the serial port
function openSerialPort() {
  socket.emit('openSerial');
}

// Close the serial port
function closeSerialPort() {
  socket.emit('closeSerial');
}

// Example usage:
// sendSerialData('AT+CMGF=1'); // Send a command to the serial port
// openSerialPort();            // Open the serial port
// closeSerialPort();           // Close the serial port 