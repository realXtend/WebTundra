
define([
        "lib/three",
        "lib/three/gltf/glTF-parser",
        "lib/three/gltf/glTFLoader",
        "lib/three/gltf/glTFLoaderUtils",
        "lib/three/gltf/glTFAnimation",
        "lib/three/gltf/glTFShaders"
    ], function(THREE, _glTFParser) {

/**
    Represents a Ogre rendering engine mesh asset. This asset is processed and Three.js rendering engine meshes are generated.
    @class GltfAsset
    @extends IAsset
    @constructor
    @param {String} name Unique name of the asset, usually this is the asset reference.
*/
var WebTundraGltfWrapper = {
    Parser : glTFParser,
    Loader: THREE.glTFLoader,
    LoaderUtils : THREE.GLTFLoaderUtils,
    Animation : THREE.glTFAnimation,
    Animator : THREE.glTFAnimator,
    Shaders : THREE.glTFShaders
};

return WebTundraGltfWrapper;

}); // require js
