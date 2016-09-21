# Introduction

The purpose of this documentation is to provide information how to install WebTundra, a browser client-side library for making 3D Web applications.

# System Requirements

Any recent PC/Mac configuration that is capable of 3D rendering is considered as a minimum system requirement.

For networked connectivity WebSockets support is required in the browser.

Good quality rendering of detailed 3D scenes and effects requires WebGL support. In the following subsections we list the current status of WebGL availability on various platforms.

## Hardware Requirements

Any operating system that is supported by the target WebGL-enabled browser.

## Operating System Support

Any operating system capable of running a Web browser works. This includes Windows, Mac, Linux, Android and iOS with restrictions. The status with game consoles (xbox, play station) is to be investigated.

## Software Requirements

A WebGL-enabled browser, which includes, but not limited to:

* Google Chrome 9+
* Mozilla Firefox 4.0+
* Safari 6.0+ (WebGL disabled by default)
* Opera 11+ (WebGL disabled by default)

Other internal dependencies include:

* Three.js
* Require.js
* node.js
* Grunt

Some dependencies are contained into the repository, and the rest are fetched with the command `npm install` explained later in the text, so **no need to download them separately**, except for node.js and grunt.

# Software Installation and Configuration
### Building from source
 
1. Install node.js if you don't have it yet, then install the global grunt-cli:

		npm install -g grunt-cli

* Clone the WebTundra repository

		git clone git@github.com:realXtend/WebTundra.git

* Navigate inside, then install the dependencies:

		npm install

* Finally, run the grunt building that will create a minified and uglified file, along with zipped package

		grunt build

* To build the documentation, run:

		grunt doc

The resulting library will reside in the `build/` folder. Feel free to host it on your favorite server (apache, nodejs etc.)

### Development mode

* To run WebTundra in development mode, follow the above steps from 1 to 3. 

* Download, install and run a local Tundra server, as described in the [Synchronization GE guides](http://synchronization.readthedocs.org/en/latest/)

* Run this command in WebTundra's root:

		grunt dev

This will open up a local server on port 8082, and also automatically pop-up `http://localhost:8082/html/client.html` URL in your default browser. You can now connect to the empty server.

# Sanity check procedures

##End to End testing

By running a local Tundra server and hosted WebTundra built library, simply opening `http://yourhost/client.html` and hitting "Connect" should connect WebTundra to the Tundra server.
