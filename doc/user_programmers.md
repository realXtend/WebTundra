# Introduction

This documentation introduces the usage and development of WebTundra applications.

WebTundra is a WebGL & WebSockets based web client library for making multiuser applications by utilizing the realXtend Tundra SDK as the server. The server features 3d physics (with Bullet), Javascript scripting for server side logic and efficient networking with the kNet library. WebTundra provides the application developer with a scene model which is automatically synchronized over the network and vizualised in 3d in the browser client.

To make own applications you can use WebTundra as a Javascript library in your web application. The focus is on networked multiuser applications with (realtime) interaction / collaboration. The game of Pong is used as minimal but complete example of a multiuser application created on the platform. We use it to illustrate the use of the overall system: what is typically running on the server side and what kind of hooks the client library has for custom functionality. How you can create your own web application which uses WebTundra as a very high level library for networking.

Developer documentation for the underlying parts from the Synchronization GE [is documented here](http://synchronization.readthedocs.org/en/latest/).

WebTundra and Three.js in general allow the whole application to be developed with software code, even generating the 3d geometry etc. However 3D models, animations and full scenes are often created in modelling applications, such as open source Blender or Autodesk's Max. Therefore a key part of 3D-UI is the asset pipeline from modelling applications, or possible other sources, to the runtime engine. Exporting of 3d creations from Blender is documented in detail in the User Guide section of this manual.

Meshmoon Rocket and its web client counterpart Meshmoon WebRocket are commercially available solutions targeted towards the end-user that 

### Background and Detail

These guides relate to the 3D-UI-WebTundra implementation of the 3D-UI Generic Enabler which is part of the Advanced Middleware and Web User Interfaces chapter. Please find more details about this Generic Enabler in the according architecture description and open specification documents.

# User Guide

User-made applications are up to the application developer to define their functionality. Therefore, the usage of this GE varies from application to application. 

To create applications one typically needs to program the functionality in Javascript as in all Web development. That is covered in the Programmer's guide section of this manual. But it is possible to use WebTundra also to just publish 3d models from other 3D engines such as Ogre, or scenes on the web without any programming. Basic functionality can be introduced by using existing components such as a free-flying camera or the interface designer GE.

On exporting said Ogre 3d models from Blender, refer to the [Meshmoon documentation pages](http://doc.meshmoon.com/index.html?page=from-blender-to-meshmoon-part-1)

## Preparing own scenes

First, run WebTundra in development mode. Refer to the "Installation and administration guide" on how to run it in development mode. Running it in development mode will automatically open up a tab in your browser with address pointing to `http://localhost:8082/client.html`.

Second, clone the Interface Designer repository in `WEBTUNDRA_ROOT/src/application` in a folder named `editor`:

	cd WebTundra
	cd src/application
	git clone git@github.com:Adminotech/fiware-interface-designer.git editor

Install and run an empty Tundra server. Refer to [Synchronization GE docs](http://synchronization.readthedocs.org/en/latest/User_and_Programmers_guide/#user-guide) for instructions. Navigate with a command prompt to the installed Tundra, and run:

	TundraConsole.exe --server --headless

It will start listening to a port 2345.

Return to the tab that opened in your browser and hit the `Connect` button. 

You will be now brought to a black scene. 

Open up the Interface Designer by pressing "Shift + S". Create a sky box, by clicking "Create entity", and drag the "SkyX" component in the dialog, so that we are not surrounded by darkness. Refer to the Interface Designer user guide for adding content with it.

Add a single cube from the "Create" menu, and add a light by again clicking on "Create entity" and dragging "Light" and "Placeable" components. Put a name "Light" in the "Create new entity" dialog. Cube and light will be created into the 0,0,0 position in the world, so move around with the camera by using the WSAD keys and right-click-drag with your mouse to turn around. You can move the light and the cube with the interface designer.

We can now create an application that will simply add a button in the upper-left corner of the scene, that upon clicking will simply rotate the created cube.

# Programmer's Guide

This guide helps programmers to get started with developing WebTundra applications.

#### Declaration of an application
We are using [Classy.js](https://github.com/mitsuhiko/classy) to have an object-oriented-like notation and capabilities in our scripts. Additionally, we use RequireJs to include only the files that we will be using during development, and for building the application along with WebTundra. An empty application class that is only declared as such, looks like this:


	define([
    	    "core/framework/Tundra",
    	    "core/script/IApplication"
    	], function(Tundra, IApplication) {

	var HelloWorld = IApplication.$extend(
	{
		__init__ : function()
		{
			this.$super("Hello World");
		}
	}

	return HelloWorld;

	});

Let's disect these lines:

* `HelloWorld` is a class that extends (or inherits from) the `IApplication` interface.

* The `__init__` method will be called immediately when an instance of `HelloWorld` is created. Think of it as the "constructor" of the class;

* `this.$super("Hello world");` calls the constructor of the base class `IApplication`. It takes one argument: a string of the name of your application;

#### `this` variable

The `this` variable is a reference to the current instance of your application. Through it you can access variables and methods anywhere in the scope of the application class.

For example, in `HelloWorld`, we have a variable of Object type named `ui` where we store the UI elements that we are using. By referencing it through `this`, we can access that variable in all methods in the scope of `HelloWorld`, which you will observe in the following sections of this document:

	this.ui = {};
	this.ui.baseCSS = {
	    "position" : "absolute",
        "padding"  : 25,
        "top" : 25,
        "left" : 25,
        "font-family" : "RobotoDraft, Arial",
        "color" : "white",
        "background-color" : "rgba(8,149,195,0.8)"
	}


#### Adding methods

We will add a method called `initUi` that will create a simple `<button>` element that we will put in our main view, using jQuery:

    initUi : function()
    {
        this.ui = {};
        this.ui.baseCSS = {
            "position" : "absolute",
            "padding"  : 25,
            "top" : 25,
            "left" : 25,
            "font-family" : "RobotoDraft, Arial",
            "color" : "white",
            "background-color" : "rgba(8,149,195,0.8)"
        };

        this.ui.welcome = $("<button/>", { text : "Welcome to the 'Hello World' application" });
        this.ui.welcome.css(this.ui.baseCSS);
        this.ui.welcome.hide();

        Tundra.ui.add(this.ui.welcome);
        this.ui.welcome.fadeIn(5000);
    },

You should be already familiar with creating HTML elements through jQuery. The line:

	Tundra.ui.add(this.ui.welcome);

involves referencing the **`Tundra` global object** that provides easy access to all the APIs (Input, Scene, UI, Renderer etc). The line that we look at is making a call to the `UiAPI` to add the new created 'widget' into the scene. More on the `Tundra` global object and `UiAPI` here [@todo link to API ref here].

Call this method in the constructor of the class like so:

	this.initUi();

#### Destructor

There are no destructors in Javascript per say, however we can always simulate one. The `IApplication` interface contains a virtual method called `onScriptDestroyed`, where you can put code that will clean-up everything your application has created, and not needed for the rest of a WebTundra instance lifetime. Think of this as the "destructor". For this example, we are going to remove the UI that we created in `initUi`:

    onScriptDestroyed : function()
    {
        this.log.info("Shutting down");

        // Clean up any UI created by this application.
        if (this.ui && this.ui.welcome)
            this.ui.welcome.remove();
        this.ui = null;
    },

It simply removes the UI from the scene, and nullifies `this.ui`.

### Adding some functionality

In the "User guide" section, you created a simple scene consisting of a sky, a cube and a light. Now you can add code that will rotate the cube upon clicking the button you created.

    	this.ui.welcome.click(function()
    	{
    		Tundra.frame.onUpdate(this, this.rotateCube);
    	}.bind(this));
	},

This will make a call to the FrameAPI, and listen to the `onUpdate` event, which fires every frame.

We define a new method called `rotateCube` that will simply get the "Placeable" component, and modify its `Transform` attribute, or rotation in particular. By using the `SceneAPI`, you can get the `"Cube"` entity, and manipulate it:

	rotateCube : function()
	{
		var cubeEntity = Tundra.scene.entityByName("Cube");
		if (cubeEntity)
		{
			var t = cubeEntity.placeable.transform; 
			t.rot.x += 1;
			t.rot.y += 1;
			t.rot.z += 1;
			cubeEntity.placeable.transform = t;
		}
	}

### Running the application

Following above steps, the app body should looks like this:
	
	define([
	    "lib/three",
	    "core/framework/Tundra",
	    "core/script/IApplication"
	], function(THREE, Tundra, IApplication) {

	var HelloWorld = IApplication.$extend(
	{
		__init__ : function()
		{
			this.$super("Hello world");

			this.initUi();
		},

		onScriptDestroyed : function()
		{
    		this.log.info("Shutting down");

    		// Clean up any UI created by this application.
    		if (this.ui && this.ui.welcome)
        		this.ui.welcome.remove();
    		this.ui = null;
		},

		initUi : function()
		{
    		this.ui = {};
    		this.ui.baseCSS = {
    	    	"position" : "absolute",
     	   		"padding"  : 25,
        		"top" : 25,
       	 		"left" : 25,
        		"font-family" : "RobotoDraft, Arial",
        		"color" : "white",
        		"background-color" : "rgba(8,149,195,0.8)"
    		};

	    	this.ui.welcome = $("<button/>", { text : "Welcome to the 'Hello World' application" });
    		this.ui.welcome.css(this.ui.baseCSS);
    		this.ui.welcome.hide();

    		Tundra.ui.add(this.ui.welcome);
    		this.ui.welcome.fadeIn(5000);

    		this.ui.welcome.click(function()
    		{
    			Tundra.frame.onUpdate(this, this.rotateCube);
    		}.bind(this));
		},

		rotateCube : function()
		{
			var cubeEntity = Tundra.scene.entityByName("Cube");
			if (cubeEntity)
			{
				var t = cubeEntity.placeable.transform; 
				t.rot.x += 1;
				t.rot.y += 1;
				t.rot.z += 1;
				cubeEntity.placeable.transform = t;
			}
		}
	});

	return HelloWorld;

	});

Save your application in `WEBTUNDRA_ROOT/src/application` and name it for example `myapp.webtundrajs`.

Using the interface designer, create an entity with a "Script" component, and name it `"App"`. In the scene tree editor, right-click on `"App"` and select "Edit".

In the "Script" accordion, at the field `scriptRef` at position `[0]`, write the reference to your script like so:

	webtundra-applications://myapp.webtundrajs

Tick the `runOnLoad` attribute.

The button should fade in into the upper-left corner. If you click on it, the cube will start rotating on all angles.

