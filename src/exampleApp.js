"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var app = new Application();

var host = "localhost"; // hostname of the Tundra server
var port = 2345; // and port to the server

app.start();
app.connect(host, port);
