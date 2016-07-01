
define([
        "lib/three",
        "core/scene/IComponent",
        "core/scene/Attribute"
    ], function(THREE, IComponent, Attribute) {

var EC_HtmlBillboard = IComponent.$extend(
/** @lends EC_HtmlBillboard.prototype */
{
    /**
        Renders a HTML element as 3D billboard. Uses CSS scaling and translation for perceived 3D effect.

        @ec_declare
    */
    __init__ : function(id, typeId, typeName, name)
    {
        this.$super(id, typeId, typeName, name);

        /**
            Offset from parent Placeable or absolute world position if no Placeable is present.
            @ec_attribute {THREE.Vector3} position THREE.Vector3(0,0,0)
        */
        this.declareAttribute(0, "position", new THREE.Vector3(0,0,0), Attribute.Float3);
        /**
            If axis is negative, the widget is not resized.
            @ec_attribute {THREE.Vector2} size THREE.Vector2(-1,-1)
        */
        this.declareAttribute(1, "size", new THREE.Vector2(-1,-1), Attribute.Float2);
        /**
            Magnify to full scale on hover.
            @ec_attribute {boolean} hoverMagnify false
        */
        this.declareAttribute(2, "hoverMagnify", false, Attribute.Bool);
    },

    __classvars__ :
    {
        TypeId   : 1000,
        TypeName : "HtmlBillboard"
    }
});

return EC_HtmlBillboard;

}); // require js
