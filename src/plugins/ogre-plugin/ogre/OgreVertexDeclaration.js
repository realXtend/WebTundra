
define([
        "lib/classy",
        "core/framework/Tundra",
        "plugins/ogre-plugin/ogre/OgreVertexElement"
    ], function(Class, Tundra, OgreVertexElement) {

var OgreVertexDeclaration = Class.$extend(
{
    __init__ : function()
    {
        this.elements = [];
    },

    addElement : function(element)
    {
        if (element instanceof OgreVertexElement)
            this.elements.push(element);
        else
            Tundra.client.logError("[OgreVertexDeclaration]: addElement() called with non OgreVertexElement parameter");
    },

    getElement : function(semantic, index)
    {
        for (var i = 0; i < this.elements.length; i++)
        {
            var element = this.elements[i];
            if (element.semantic === semantic)
            {
                if (index === undefined)
                    return element;
                else if (element.index === index)
                    return element;
            }
        }
        return null;
    },

    getElementsInOffsetOrder : function(source)
    {
        if (this.elements.length === 0)
            return [];

        var ordered = [];
        var element = null;
        var added = false;
        for (var i=0; i<this.elements.length; ++i)
        {
            element = this.elements[i];
            if (element.source !== source)
                continue;

            added = false;
            for (var k=0; k<ordered.length; ++k)
            {
                if (element.offset < ordered[k].offset)
                {
                    ordered.splice(k, 1, element);
                    added = true;
                    break;
                }
            };
            if (!added)
                ordered.push(element);
        }
        return ordered;
    },

    getVertexSize : function(source)
    {
        var size = 0, len = this.elements.length;
        for (var i = 0; i < len; i++)
        {
            var element = this.elements[i];
            if (element.source === source)
                size += element.getSize();
        }
        return size;
    }
});

return OgreVertexDeclaration;

}); // require js
