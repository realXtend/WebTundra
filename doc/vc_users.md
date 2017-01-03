#Virtual Characters - User and Programmers Guide

#Introduction
This document describes usage of the Virtual Characters Generic Enabler. It ties with the [3D-UI](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/FIWARE.OpenSpecification.MiWi.3D-UI) and [Synchronization](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/FIWARE.OpenSpecification.MiWi.Synchronization) GE's to implement animating characters, that optionally are synchronized over the network in multi-user networked applications. All three GE's are contained within the WebTundra Javascript codebase.

### Background and Detail
The Virtual Characters GE is part of the [Advanced Middleware and Web User Interfaces chapter](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/Advanced_Middleware_and_Web_UI_Architecture). Please find more information about this Generic Enabler in the related [Open Specification](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/FIWARE.OpenSpecification.MiWi.VirtualCharacters) and [Architecture Description](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/FIWARE.ArchitectureDescription.MiWi.VirtualCharacters).

#User guide

This is a developer oriented GE, ie. it allows to include animating 3D characters in web applications. Therefore there is no separate user guide, instead all the functionality is listed under the Programmer's Guide section.

#Programmers guide

The scene model utilized by the WebTundra codebase is component-based. This means that to enable functionality, various *components* are created to scene *entities* which are otherwise just empty containers. The basics of positioning and showing a 3D object happen through the Placeable and Mesh components implemented by the 3D-UI GE.

The animation capabilities are controlled through the AnimationController component. It controls, and automatically updates, the animations of a Mesh component contained in the same entity. This requires the Mesh component to refer to a mesh asset with animation data. The operations available include:

* Animation play / stop
* Speed and direction (forward / backward) control
* Animation fade in / fade out control

There is also a second component, Avatar, which allows automatic instantion of the necessary Placeable, Mesh and AnimationController components by parsing a JSON-format character description file.

##JavaScript client library reference

All the client library classes are embedded within the namespace Tundra.

To understand the basics of the rendering and the scene model, also refer to the user guides of the 3D-UI and the Synchronization GE's:

* [3D-UI - WebTundra - User and Programmers Guide](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/3D-UI_-_WebTundra_-_User_and_Programmers_Guide)
* [Synchronization - User and Programmers Guide](https://forge.fiware.org/plugins/mediawiki/wiki/fiware/index.php/Synchronization_-_User_and_Programmers_Guide)

###AnimationController

The following functions exist in the AnimationController component for controlling animation playback. Animations are referred to with their string names. The playing animations will be automatically updated in conjunction with rendering each frame.

 `animationController.play(name, fadeInTime, crossFade, looped)`

Start playback of an animation. fadeInTime specifies a time in seconds during which to smoothly blend the animation from zero blending weight to full weight. crossFade is a boolean which will cause other animations to be faded out as the playback of the new animation is started. looped is a boolean to indicate whether the animation should loop, or only play once.

 `animationController.playLooped(name, fadeInTime, crossFade)`

Same as above, but the animation will always be looped.

 `animationController.stop(name, fadeOutTime)`

Stop playback of an animation. fadeOutTime is the fade-out period in seconds, during which the blending weight is smoothly reduced to zero.

 `animationController.stopAll()`

Stop playback of all animation of the character.

 `animationController.setAnimWeight(name, weight)`

Set the blending weight of an animation between 0 (none) and 1 (full).

 `animationController.setAnimSpeed(name, speed)`

Set the playback speed of an animation, where 1 is the original speed forward, 2 would be twice as fast, and -1 would be reverse with original speed.

###Avatar

The Avatar component is simple to use. It does not have functions to call as such, only an attribute called "appearanceRef" which should refer to the appearance JSON file that it should load. The attribute is set in the following (slightly convoluted) manner:

```
 var ref = avatar.appearanceRef;
 ref.ref = "YourAvatarFile.json";
 avatar.appearanceRef = ref;
```

The change of this attribute automatically triggers the Avatar component to remove any existing Mesh component from its entity, and create new, once the JSON description has been loaded.

Once the Avatar component has finished loading the description, has instantiated the Mesh component(s) and their mesh assets have loaded, the character is ready to use for animation playback. At this point the Avatar component will emit a signal, avatarLoaded, to which application code can hook up.

###Character appearance description file format

The description JSON file format is best described with an example. Here is an example of a multi-mesh object. The root-level mesh ("robot.json") is created into a Mesh component in the same entity as the Avatar component itself, while the "parts" or sub-objects are created into Mesh components in child entities. Note that the 3D object assets in this example, such as the "robot.json" are in Three.js inbuilt JSON mesh format, which contains vertex data, skeleton hierarchy and animation all in one file. For supported 3D file formats in WebTundra, see the [[3D-UI - WebTundra - User and Programmers Guide | 3D-UI documentation]].

A 3D transform can be applied both to the main mesh and the sub-object meshes, where

* pos is a 3D vector translation
* rot is an Euler angle (degrees) rotation
* scale is a 3D vector scale

The sub-object meshes can also be parented to bones in the root level mesh's skeleton.

When such multi-part mesh is constructed, the AnimationController object will automatically drive animations in all of the sub-objects in a synchronized manner, given that the skeletons and animations in all the parts are comparible.

```
 {
     "name"      : "RobotAvatar",
     "geometry"  : "robot.json",
     "transform" :
     {
         "pos": [0, 0, 0],
         "rot": [0, 0, 0],
         "scale": [1, 1, 1]
     },
     "materials" :
     [
         "submesh1_materialref",
         "submesh2_materialref"
     ],
     "parts" :
     [
         {
             "name"      : "Sword1",
             "geometry"  : "sword.json",
             "transform" :
             {
                 "pos": [0, 0, 0],
                 "rot": [90, 0, 0],
                 "scale": [1, 1, 1],
                 "parentBone": "hand.L"
             },
             "materials" :
             [
                 "submesh1_materialref",
                 "submesh2_materialref"
             ]
         },
         {
             "name"      : "Sword2",
             "geometry"  : "sword.json",
             "transform" :
             {
                 "pos": [0, 0, 0],
                 "rot": [90, 0, 0],
                 "scale": [1, 1, 1],
                 "parentBone": "hand.R"
             },
             "materials" :
             [
                 "submesh1_materialref",
                 "submesh2_materialref"
             ]
         },
         {
             "name"      : "Pants",
             "geometry"  : "robot_pants.json",
             "transform" :
             {
                 "pos": [0, 0, 0],
                 "rot": [0, 0, 0],
                 "scale": [1, 1, 1]
             }
         },
         {
             "name"      : "Hat",
             "geometry"  : "robot_hat.json",
             "transform" :
             {
                 "pos": [0, 0, 0],
                 "rot": [0, 0, 0],
                 "scale": [1, 1, 1]
             }
         }
     ],
 }
```

##Examples

###Animation playback by using components directly

This example script requires the robot.json mesh asset from the examples/Avatar directory of the WebTundra source tree. For the required script includes, look at examples/Avatar/index.html

```
var app = new Tundra.Application();
app.start();
var scene = app.dataConnection.scene;

var ent = scene.createEntity(0);
ent.createComponent(0, "Placeable");
ent.placeable.setPosition(0, 0, -5);

ent.createComponent(0, "Mesh");
var meshRef = ent.mesh.meshRef;
meshRef.ref = "robot.json";
ent.mesh.meshRef = meshRef;

ent.createComponent(0, "AnimationController");

ent.mesh.meshAssetReady.add(function(){ ent.animationController.play("Walk", 0.0, true, true); });
```

###Character instantiation using a character description file, and playing an animation

This script requires all the assets from the examples/Avatar directory. Similarly to the example above, look at examples/Avatar/index.html for the needed script includes.

```
var app = new Tundra.Application();
app.start();
var scene = app.dataConnection.scene;

var ent = scene.createEntity(0);
ent.createComponent(0, "Placeable");
ent.placeable.setPosition(0, 0, -5);

ent.createComponent(0, "Avatar");
var ref = ent.avatar.appearanceRef;
ref.ref = "Avatar1.json";
ent.avatar.appearanceRef = ref;

ent.avatar.avatarLoaded.add(function(){ ent.animationController.play("Run", 0.0, true, true); });
```
