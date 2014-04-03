realXtend Web Tundra
===================

Web Tundra is a project for taking realXtend 3D virtual worlds into modern web browsers. The provided `TundraSDK` and `TundraClient` can connect to a realXtend Tundra server. Implementing the Tundra network protocol via WebSocket and rendering with WebGL.

Running locally
---------------

1. Acquire a [realXtend Tundra](https://github.com/realXtend/tundra) server build that has `WebSocketServerModule`.
2. Run the server with `TundraConsole.exe --server --headless --nullrenderer --file x.txml`.
 * Make sure `WebSocketServerModule` is loaded by the config (default server config should do this)
 * You can use any .txml as the scene.
3. Open up the `html/client.html` in your browser (latest Chrome, Firefox or Opera is recommended).
 * If you are not hosting the WebTundra folder on a local web server (recommended), you need to allow local files so the local scripts load succesfully eg. in Chrome add command parameter `--allow-file-access-from-files`.
4. Connect to the server with Connect button.
5. You are done. Start developing your application. 
 * Use the browsers developer tools to see errors and other logging (`Ctrl+Shift+i` in Chrome)

Development
-----------

### RequireJS

This project uses [RequireJS](http://requirejs.org/) for a modular architecture. A module should be clean individual part of the codebase that can be used by other modules or the end user application. A module system is desired for large scale JavaScript codebases, without one managing script load order etc. will get impossible really quick.

The RequireJS system is meant to be used only for development. When you build the SDK RequireJS will be pulled out and combined into a single optimized JavaScript file. This build step is custom built for this repository as at the time there was no better method of doing this. RequireJS optimized build + [AlmondJS](https://github.com/jrburke/almond) was tried but it had some short comings.

This custom build system does enforce some naming conventions to be kept. When declaring your modules dependencies the original module name should be preserved, even if the RequireJS supports renaming them in general, for example: 

	define(["core/TundraLogging"], 
		function(TundraLogging) {
			var MyModule = ...
			var mylog = TundraLogging.getLogger("MyModule");
			return MyModule; 
	});

Now that the final build is done your code will still find `TundraLogging` correctly from the `window` object, as you kept referring to it by the original module name. On the other side module implementations must keep the module name as the filename in the repo. This ensures that the `TundraLogging` really can be found from the `window` object, for example:

	// core/framework/TundraLogging.js
	define([], function() {
		var TundraLogging = ...
		return TundraLogging;
	});

We recommend getting familiar with the [RequireJS](http://requirejs.org/) system and read the existing code to get your head wrapped around it.

**Note:** The custom build system will be replaced when a usable "standard" way to do it is found. Feel free to send a issue, discuss options and send code as pull requests.

### Nodejs and Grunt

We use [`node.js`](http://nodejs.org/) and [`grunt`](http://gruntjs.com/) for task automation eg. making builds, generating documentation.

1. Install [node.js](http://nodejs.org/)
2. Run `npm install` on the repo root folder to fetch dependencies.
3. Run `npm install -g grunt-cli` to install the grunt executable as a global tool 

Following grunt tasks are available

	// Build
	grunt build
	// Documentation
	grunt doc
	// Build both source and documentataion 
	// and compress SDK to a zip file.
	grunt

### Guidelines

* Application are developed in separate outside of the core SDK. This repo should only contain applications and examples that the SDK should ship with.
* Think carefully where you code should end up in, in the code SDK or a separate application repo that uses the SDK.
* Keep your code generic, clean and modular. Send pull requests to get your code reviewed and merged.
 
