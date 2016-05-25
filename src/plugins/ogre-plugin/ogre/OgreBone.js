
define([
        "lib/classy",
    ], function(Class) {

var OgreBone = Class.$extend(
{
    __init__ : function(name, id, position, quaternion, scale)
    {
        this.name = name;
        this.id = id;
        this.position = position;
        this.quaternion = quaternion;
        this.scale = scale;
    }
});

return OgreBone;

}); // require js
