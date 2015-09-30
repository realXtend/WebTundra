
define([
        "lib/classy",
        "lib/three",
        "core/framework/CoreStringUtils"
    ], function(Class, THREE, CoreStringUtils) {

var OgreShader = Class.$extend(
{
    __init__ : function(_type, _data, logging)
    {
        this.type = _type;
        this.blockId = (this.type === OgreShader.Type.Vertex ? "vertex_program_ref" : "fragment_program_ref");
        this.name = "";
        this.data = "";
        this.params = {};
        this.logging = (logging || false);

        if (_data !== undefined && typeof _data === "string")
            this.deserializeFromData(_data);
    },

    __classvars__ :
    {
        Type :
        {
            Vertex   : 0,
            Fragment : 1
        }
    },

    deserializeFromData : function(data)
    {
        var blockStartIndex = data.indexOf(this.blockId + " ");
        if (blockStartIndex !== -1)
        {
            var proceedIndex = blockStartIndex + this.blockId.length + 1;
            this.name = CoreStringUtils.readLine(data.substring(proceedIndex), null, true, true);

            var open = data.indexOf("{", proceedIndex);
            var close = data.indexOf("}", proceedIndex);
            if (open !== -1 && close !== -1)
                this.data = data.substring(open + 1, close - 1);
        }
        if (this.logging && this.name !== "")
            console.log("  >>", this.blockId + (this.type === OgreShader.Type.Vertex ? "  " : ""), "'" + this.name + "'");
    },

    isValid : function()
    {
        return (this.name !== "");
    },

    nameContains : function(_name)
    {
        return (this.name !== "" && this.name.indexOf(_name) !== -1);
    },

    nameMatches : function(_name)
    {
        return (this.name === _name);
    },

    readNamedParameters : function(_params)
    {
        if (this.data === "")
            return;
        for (var _name in _params)
        {
            var _type = _params[_name];
            this.namedParameter(_name, _type);
        }
    },

    namedParameter : function(_name, _type)
    {
        if (this.data === "")
            return undefined;
        if (this.params[_name] !== undefined)
            return this.params[_name];

        var indentifier = "param_named " + _name;
        if (_type !== "") indentifier += " " + _type;
        indentifier += " ";

        var paramIndex = this.data.indexOf(indentifier);
        if (paramIndex !== -1)
        {
            var _value = CoreStringUtils.readLine(this.data.substring(paramIndex + indentifier.length), null, true, true).split(" ");
            var paramData =
            {
                id    : _name,
                type  : _type,
                value : _value
            };
            this.params[_name] = paramData;
            if (this.logging)
                console.log("     --", _name, _type, _value.join(" "));
            return paramData;
        }
        return undefined;
    },

    getNamedParameter : function(_name, _type)
    {
        var param = this.params[_name];
        if (param != null && param.id === _name)
        {
            if (typeof _type === "string")
            {
                if (_type === "float2")
                {
                    if (param.value.length < 2)
                    {
                        console.error("OgreShader: Named parameter value " + _name +" does not have enough indexes. Requested " + _type + " actual value is", param.value);
                        return null;
                    }
                    return new THREE.Vector2(parseFloat(param.value[0]), parseFloat(param.value[1]));
                }
                else if (_type === "float4")
                {
                    if (param.value.length < 4)
                    {
                        console.error("OgreShader: Named parameter value " + _name +" does not have enough indexes. Requested " + _type + " actual value is", param.value);
                        return null;
                    }
                    return new THREE.Vector4(parseFloat(param.value[0]), parseFloat(param.value[1]), parseFloat(param.value[2]), parseFloat(param.value[3]));
                }
                else if (_type === "float")
                {
                    if (param.value.length < 1)
                    {
                        console.error("OgreShader: Named parameter value " + _name +" does not have enough indexes. Requested " + _type + " actual value is", param.value);
                        return null;
                    }
                    return parseFloat(param.value[0]);
                }
                else if (_type == "floatarray")
                {
                    var floatArray = [];
                    for (var i = 0; i < param.value.length; i++)
                    {
                        var value = parseFloat(param.value[i]);
                        if (!isNaN(value))
                            floatArray.push(value);
                        else
                        {
                            console.warn("OgreShader: Failed to parse float for floatarray type from", value);
                            floatArray.push(0.0);
                        }
                    }
                    return floatArray;
                }
                else if(_type == "float4array")
                {
                    var floatArray = [];
                    for (var i = 0; i < param.value.length; i++)
                    {
                        var value = parseFloat(param.value[i]);
                        if (!isNaN(value))
                            floatArray.push(value);
                        else
                        {
                            console.warn("OgreShader: Failed to parse float for floatarray type from", value);
                            floatArray.push(0.0);
                        }
                    }
                    if (floatArray.length <= 0)
                        return null;

                    var float4array = [];
                    for (var i = 0; i < floatArray.length; i += 4)
                    {
                        var value = new THREE.Vector4(0, 0, 0, 0);
                        if (floatArray.length >= (i + 1))
                            value.x = floatArray[i];
                        if (floatArray.length >= (i + 2))
                            value.y = floatArray[i + 1];
                        if (floatArray.length >= (i + 3))
                            value.z = floatArray[i + 2];
                        if (floatArray.length >= (i + 4))
                            value.w = floatArray[i + 3];
                        float4array.push(value);
                    }

                    return float4array;
                }
            }
            return param.value;
        }
        return null;
    }
});

return OgreShader;

}); // require js
