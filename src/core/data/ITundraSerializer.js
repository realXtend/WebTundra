
define([
        "lib/classy"
    ], function(Class)
{

var ITundraSerializer = Class.$extend(
/** @lends ITundraSerializer.prototype */
{
    /**
        ITundraSerializer is a base class for objects that can be serialized into JSON, XML or binary.
        Serializer implementations need to provide the functionality, preferably by extending this object.

        @constructs
        @private
    */
    __init__ : function()
    {
    },

    /**
        Serialize to object.
        @return {Object}
    */
    serializeToObject : function()
    {
        console.error("[ITundraSerializer]: serializeToObject not implemented!");
    },

    /**
        Serialize to XML.
        @return {Node}
    */
    serializeToXml : function()
    {
        console.error("[ITundraSerializer]: serializeToXml not implemented!");
    },

    /**
        Serialize to binary.
        @return {ArrayBuffer}
    */
    serializeToBinary : function()
    {
        console.error("[ITundraSerializer]: serializeToBinary not implemented!");
    },

    /**
        Deserialize from object
        @param {object} obj The JSON to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromObject : function(obj, change)
    {
        console.error("[ITundraSerializer]: deserializeFromObject not implemented!");
    },

    /**
        Deserialize from XML element.
        @param {Node} xmlElement The XML node to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromXml : function(xmlElement, change)
    {
        console.error("[ITundraSerializer]: deserializeFromXml not implemented!");
    }
});

return ITundraSerializer; // requirejs

});
