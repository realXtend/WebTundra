
define([
        "core/network/INetworkMessage",
        "core/network/Network",
        "core/data/DataSerializer"
    ], function(INetworkMessage, Network, DataSerializer) {

/**
    Login message.

    @class ObserverPositionMessage
    @extends INetworkMessage
    @constructor
*/
var ObserverPositionMessage = INetworkMessage.$extend(
{
    __init__ : function()
    {
        this.$super(ObserverPositionMessage.id, "ObserverPositionMessage");
    },

    __classvars__ :
    {
        id   : 105,
        name : "ObserverPositionMessage"
    },

    /**
        Serializes observer position & orientation to this message.

        @method serialize
        @param {THREE.Vector3} position Observer position
        @param {THREE.Quaternion} orientation Observer orientation
    */
    serialize : function(position, orientation)
    {
        this.$super(4 + 1 + 6 * 4);
        this.ds.writeU16(this.id);
        this.ds.writeVLE(0); // Todo: use proper scene ID
        var posSendType = 2; // Full. Todo: detect minimal size as necessary
        var rotSendType = 3; // 3 DOF. Todo: detect minimal size as necessary
        this.ds.writeArithmeticEncoded2(8, posSendType, 3, rotSendType, 4);
        this.ds.writeFloat32(position.x);
        this.ds.writeFloat32(position.y);
        this.ds.writeFloat32(position.z);
        
        // Angle-axis decompose from MathGeoLib
        var angle = Math.acos(orientation.w) * 2;
        var sinz = Math.sin(angle/2);
        var axis = {};
        if (Math.abs(sinz) > 0.00001)
        {
            sinz = 1 / sinz;
            axis.x = orientation.x * sinz;
            axis.y = orientation.y * sinz;
            axis.z = orientation.z * sinz;
        }
        else
        {
            angle = 0;
            axis.x = 1;
            axis.y = 0;
            axis.z = 0;
        }
        if (angle >= Math.PI)
        {
            axis.x = -axis.x;
            axis.y = -axis.y;
            axis.z = -axis.z;
            angle = 2 * Math.PI - angle;
        }
        this.ds.writeQuantizedFloat(0, Math.PI, 10, angle);
        this.ds.writeNormalizedVector3D(axis.x, axis.y, axis.z, 11, 10);
    }
});

return ObserverPositionMessage;

}); // require js
