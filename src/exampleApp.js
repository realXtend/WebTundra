"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *      @author Tapani Jamsa
 *      @author Erno Kuusela
 *      @author Toni Alatalo
 *      Date: 2013
 */

var app = new Application();

app.host = "localhost"; // IP to the Tundra server
app.port = 2345; // and port to the server

app.start();

// app.viewer.useCubes = true; // Use wireframe cube material for all objects

app.connect(app.host, app.port);