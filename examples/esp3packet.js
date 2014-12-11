var serialport = require("../serialport");
var parsers = require("../parsers");

/*
 To use EnOcean Pi module you must disable serial console on /dev/ttyAMA0,
 you can do that with https://github.com/lurch/rpi-serial-console

 And /dev/ttyAMA0 must be readable from your user.
 add your user to dialout group or simple run "sudo chmod 777 /dev/ttyAMA0"

 */
tcm310 = new serialport.SerialPort('/dev/ttyAMA0', {
  baudrate: 57600,
//  parser: serialport.parsers.raw
  parser: serialport.parsers.esp3()
}, false);

tcm310.open(function (error) {
  if ( error ) {
    console.log('failed to open: ' + error);
  } else {
    console.log('Connected to "TCM310".');

    if (tcm310.options.parser.toString() === parsers.raw.toString()) {
      console.log(
        "You are using raw parser from serialport.\n\n" +

        "As you can see, serialport splits(from the second transmission) ESP3 Packets,\n" +
        "because serialport fires data events as soon as it gets data.\n\n" +

        "So you must use EnOcean parser to collect ESP3 packets together. \n" +
        "To see how does it work, comment raw parser at line 14 and uncomment line 15. \n");

      tcm310.on('data', function(rawData) {
        console.log(rawData.toString("hex"));
      });
    } else {
      console.log(
        "You are using esp3 parser from serialport.\n" +
        "As you can see, esp3 parser collects all bytes together to ESP3 packets.\n\n"
      );

      tcm310.on('data', function(esp3Packet) {
        console.log(ESP3PacketRawAsString(esp3Packet) + " -> To see structure from ESP3Packet, comment line 44 and uncomment line 45.");
//        console.log(ESP3PacketStructure(esp3Packet) + "\n-> To see description for ESP3Packet, comment line 45 and uncomment line 46.");
//        console.log(ESP3PacketDescription(esp3Packet) + "-> if you have an EnOcean Rocker Switch(PTM200), comment line 46 and uncomment line 47 to see how to fetch events from.");
//	      console.log(ESP3PacketFromRockerSwitch_PTMXXX(esp3Packet));
      });
    }
  }
});


function ESP3PacketRawAsString(data) {
  return new Buffer([data.syncByte]).toString("hex") +
      (new Buffer([data.header.dataLength]).toString("hex").length == 2 ? "00": "") + new Buffer([data.header.dataLength]).toString("hex") +
      new Buffer([data.header.optionalLength]).toString("hex") +
      new Buffer([data.header.packetType]).toString("hex") +
      new Buffer([data.crc8Header]).toString("hex") +
      data.data.toString("hex") +
      data.optionalData.toString("hex") +
      new Buffer([data.crc8Data]).toString("hex");
};

function ESP3PacketStructure(esp3Packet) {
  return "{\n" +
    "  syncByte:     0x55,\n" +
    "  header: {\n" +
    "    dataLength:     0x" + (new Buffer([esp3Packet.header.dataLength]).toString("hex").length == 2 ? "00": "") + new Buffer([esp3Packet.header.dataLength]).toString("hex") + ", // decimal " + esp3Packet.header.dataLength + "\n" +
    "    optionalLength: 0x" + new Buffer([esp3Packet.header.optionalLength]).toString("hex")+ ", // decimal " + esp3Packet.header.optionalLength + "\n" +
    "    packetType:     0x" + new Buffer([esp3Packet.header.packetType]).toString("hex") + "\n" +
    "  },\n" +
    "  crc8Header:   0x" + new Buffer([esp3Packet.crc8Header]).toString("hex") + ",\n" +
    "  data:         0x" + esp3Packet.data.toString("hex") + ",\n" +
    "  optionalData: 0x" + esp3Packet.optionalData.toString("hex") + ",\n" +
    "  crc8Data:     0x" + new Buffer([esp3Packet.crc8Data]).toString("hex") + "\n" +
    "}";
};

function ESP3PacketDescription(esp3Packet) {
  var dataLength     = 'Data Length: 0x00'     + new Buffer([esp3Packet.header.dataLength]).toString("hex");
  var optionalLength = 'Optional Length: 0x' + new Buffer([esp3Packet.header.optionalLength]).toString("hex");
  var packetType     = 'Packet Type: 0x'     + new Buffer([esp3Packet.header.packetType]).toString("hex");
  var crc8Header     = 'CRC8 Header: 0x'     + new Buffer([esp3Packet.crc8Header]).toString("hex");
  var data           = 'Data: 0x'            + esp3Packet.data.toString("hex");
  var optionalData   = 'Optional Data: 0x'   + esp3Packet.optionalData.toString("hex");

  var crc8Datas      = 'CRC8 Data: 0x' + new Buffer([esp3Packet.crc8Data]).toString("hex");

  return ' _______________________________________________ \n' +
  '|...............................................|\n' +
  '|................. ESP3 Packet .................|\n' +
  '|...............................................|\n' +
  '|-----------------------------------------------|_\n' +
  '|                                               | \\           _\n' +
  '|                Sync Byte: 0x55                |   > 1 byte   \\\n' +
  '|_______________________________________________|_/             |\n' +
  '|             |                                 | \\             |\n' +
  '|             |   ' + dataLength +  '           |  |            |\n' +
  '|   H         |_________________________________|  |            |\n' +
  '|   e         |                                 |  |            |\n' +
  '| H e a d e r |   ' + optionalLength +'         |   > 4 bytes   |\n' +
  '|   d         |_________________________________|  |            |\n' +
  '|   e         |                                 |  |            |\n' +
  '|   r         |   ' + packetType +'             |  |            |\n' +
  '|_____________|_________________________________|_/             |\n' +
  '|                                               | \\             |\n' +
  '|  ' + crc8Header +'                            |   > 1 byte    |\n' +
  '|_______________________________________________|_/             |\n' +
  '|                                               | \\             |\n' +
  '|                                               |  |            |\n' +
  '|  ' + data +           '                       |   > ' + esp3Packet.header.dataLength + ' bytes   |\n' +
  '|                                               |  |            |\n' +
  '|_______________________________________________|_/             |\n' +
  '|                                               | \\             > ' + (6 + esp3Packet.header.dataLength + esp3Packet.header.optionalLength + 1) + ' bytes\n' +
  '|                                               |  |            |\n' +
  '|  ' + optionalData +            '              |   > ' + esp3Packet.header.optionalLength + ' bytes   |\n' +
  '|                                               |  |            |\n' +
  '|_______________________________________________|_/             |\n' +
  '|                                               | \\             |\n' +
  '|  ' + crc8Datas+'                              |   > 1 byte    |\n' +
  '|_______________________________________________|_/           _/\n\n';
};

function ESP3PacketFromRockerSwitch_PTMXXX(esp3Packet) {

	var telegram = {
		"RORG": esp3Packet.data[0],
		"data": esp3Packet.data[1],
		"senderID": new Buffer([esp3Packet.data[2], esp3Packet.data[3], esp3Packet.data[4], esp3Packet.data[5]]),
		"status": esp3Packet.data[6]
	};

	if (telegram.RORG !== 0xF6) {
		return "I don't understand " + telegram.RORG.toString(16) + " this telegram, i can show only Rocker Switch telegrams!";
	}

	// see RPS Telegram in "EnOcean Equipment Profiles (EEP)"
	var rockersFirstAction = (telegram.data >>> 5);          // 11100000 >> 5              | Shortcut : R1
	var energyBow = ((telegram.data >> 4) & 1) ;             // 00010000                   | Shortcut : EB  -> 0 = released or 1 = pressed
	var rockersSecondAction = ((telegram.data >> 1) & 0x07); // (00001110 >> 1) & 00000111 | Shortcut : R2
	var secondActionIsPresent = ((telegram.data) & 1);       // 00000001                   | Shortcut : EB

	// see Statusfield for RPS in "EnOcean Equipment Profiles (EEP)"
	var T21 = (telegram.status & 0x20) == 0x20;              // 00100000                   | 0 = PTM1xx or 1 = PTM2xx
	var NU = (telegram.status & 0x10) == 0x10;               // 00010000                   | 0 = unassigned or 1 = normal

	var buttonName = {
		0: "AI",
		1: "A0",
		2: "BI",
		3: "B0",
		4: "CI",
		5: "C0",
		6: "DI",
		7: "D0"
	};

	var energyBowDescription = {
		0: "on up", // released
		1: "on down" // pressed
	}

	var pushedButtons = "";

	if (NU == 1) {
		pushedButtons += buttonName[rockersFirstAction];
	} else {
		pushedButtons += "no";
	}
	if (secondActionIsPresent == 1) {
		pushedButtons += " & " + buttonName[rockersSecondAction];
	}

	var output = "{" + "\n" +
		"  Sender ID:  " + telegram.senderID.toString("hex") + "\n" +
		"  energy bow: " + energyBowDescription[energyBow] + "\n" +
		"  button[s]:  " + pushedButtons + "\n" +
		"}\n"
	;

	return output;

}