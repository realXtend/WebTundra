
define([
        "lib/classy",
    ], function(Class) {

var OgreTransformKeyFrame = Class.$extend(
{
    __init__ : function(time, quaternion, translate, scale)
    {
        this.time = time;
        this.quaternion = quaternion;
        this.translate = translate;
        this.scale = scale;
    },

    positionFromParent : function()
    {
        var pos =  { x : this.translate.x, y : this.translate.y, z : this.translate.z };
        if (this.bone != null)
        {
            pos.x += this.bone.position.x;
            pos.y += this.bone.position.y;
            pos.z += this.bone.position.z;
        }
        return pos;
    },

    toArray : function(element, fromParent)
    {
        var array = [];
        if (element === "translate" || element === "position")
        {
            if (fromParent === true)
            {
                var fromParentPos = this.positionFromParent();
                array = [fromParentPos.x, fromParentPos.y, fromParentPos.z];
            }
            else
                array = [this.translate.x, this.translate.y, this.translate.z];
        }
        else if (element === "scale")
            array = [this.scale.x, this.scale.y, this.scale.z];
        else
            array = null;
        return array;
    }
});

return OgreTransformKeyFrame;

}); // require js
