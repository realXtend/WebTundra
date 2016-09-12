
define([
        "lib/three",
        "core/framework/Tundra",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, Tundra, IComponent, Attribute) {

var EC_Camera = IComponent.$extend(
/** @lends EC_Camera.prototype */
{
    /**
        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            @ec_attribute {THREE.Vector3} upVector THREE.Vector3(0,1,0)
        */
        this.declareAttribute(0, "upVector", new THREE.Vector3(0,1,0), Attribute.Float3); /// @todo Make our own vec class to remove the dependency
        /**
            @ec_attribute {number} nearPlane 0.1
        */
        this.declareAttribute(1, "nearPlane", 0.1, Attribute.Real);
        /**
            @ec_attribute {number} farPlane 5000.0
        */
        this.declareAttribute(2, "farPlane", (Tundra.browser.isMobile() ? 3000 : 5000.0), Attribute.Real); /// @todo Should we increase this default?
        /**
            @ec_attribute {number} verticalFov 45.0
        */
        this.declareAttribute(3, "verticalFov", 45.0, Attribute.Real); // Ignored for now, taken from browser window size.
        /**
            @ec_attribute {string} aspectRatio ""
        */
        this.declareAttribute(4, "aspectRatio", "", Attribute.String);

        this._orthographic = false;

        /**
        */

        Object.defineProperties(this, {
            orthographic : {
                get : function () {
                    return this._orthographic;
                },
                set : function (value) {
                    this._orthographic = value;
                    this.onOrthographicChanged(this._orthographic);
                }
            }
        });
    },

    onOrthographicChanged : function()
    {
    },

    __classvars__ :
    {
        TypeId   : 15,
        TypeName : "Camera"
    }
});

return EC_Camera;

}); // require js
