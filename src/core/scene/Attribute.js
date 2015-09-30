
define([
        "lib/classy",
        "lib/three",
        "core/framework/Tundra",
        "core/data/ITundraSerializer",
        "core/framework/TundraLogging",
        "core/scene/AttributeChange",
        "core/math/Transform",
        "core/math/MathUtils",
        "core/math/Color"
    ], function(Class, THREE, Tundra, ITundraSerializer, TundraLogging, AttributeChange, Transform, MathUtils, Color) {

var Attribute = ITundraSerializer.$extend(
/** @lends Attribute.prototype */
{
    /**
        Attributes are networks synchronized variables in entity components.

        This class is responsible, in combination with {@link IComponent},
        of the deserializing the network data sent by the server.

        This class should never be instantiated directly. If you are implementing a component use
        {@link IComponent#declareAttribute} to declare your components static structure.

        @constructs
        @extends ITundraSerializer
        @param {IComponent} owner
        @param {Number} index
        @param {String} name
        @param {Object} value
        @param {Number} typeId
    */
    __init__ : function(owner, index, name, value, typeId)
    {
        this.$super();
        /**
            Component that owns this attribute.
            @var {IComponent}
        */
        this.owner = owner;
        /**
            Attribute interpolation data. Components must set an implementation
            if they wish interpolation for an attribute.
            @var {AttributeInterpolationData}
        */
        this.interpolation = undefined;
        /**
            Attribute index. Unique for the parent component.
            @var {Number}
        */
        this.index = index;
        /**
            Attribute name.
            @var {String}
        */
        this.name = name;
        /**
            Attribute id. Currently unused in Web Tundra.
            @var {Number}
            @default undefined
        */
        this.id = undefined;
        /**
            Attribute value.
            @var {Object}
        */
        this.value = value;
        /**
            Attribute type id.
            @var {Number}
        */
        this.typeId = typeId;
        /**
            Attribute type name.
            @var {String}
        */
        this.typeName = Attribute.toTypeName(typeId);
        /**
            Attribute size in bytes. For String, AssetReference, AssetReferenceList,
            EntityReference, QVariant and QVariantList size will be 'undefined'.
            Exact size is determined during network deserialization.
            @var {Number}
        */
        this.sizeBytes = Attribute.sizeInBytes(typeId);
        /**
            Attribute header size. Reading the header will determine the attribute byte
            size during network deserialization. Note that sizeBytes will still be 'undefined'
            even after the size has been resolved.
            @var {Number}
        */
        this.headerSizeBytes = Attribute.headerSizeInBytes(typeId);
    },

    __classvars__ :
    {
        None                : 0,
        /**
            Attribute type id for String.

            * @example
            * typeof attribute.get() === "string";

            @static
            @var {Number}
            @default 1
        */
        String              : 1,
        /**
            Attribute type id for Int.

            * @example
            * typeof attribute.get() === "number";

            @static
            @var {Number}
            @default 2
        */
        Int                 : 2,
        /**
            Attribute type id for Real.

            * @example
            * typeof attribute.get() === "number";

            @static
            @var {Number}
            @default 3
        */
        Real                : 3,
        /**
            Attribute type id for Color.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof Color === true;

            @static
            @var {Number}
            @default 4
        */
        Color               : 4,
        /**
            Attribute type id for Float2.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof THREE.Vector2 === true;

            @static
            @var {Number}
            @default 5
        */
        Float2              : 5,
        /**
            Attribute type id for Float3.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof THREE.Vector3 === true;

            @static
            @var {Number}
            @default 6
        */
        Float3              : 6,
        /**
            Attribute type id for Float4.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof THREE.Vector4 === true;

            @static
            @var {Number}
            @default 7
        */
        Float4              : 7,
        /**
            Attribute type id for Bool.

            * @example
            * typeof attribute.get() === "boolean";

            @static
            @var {Number}
            @default 8
        */
        Bool                : 8,
        /**
            Attribute type id for UInt.

            * @example
            * typeof attribute.get() === "number";

            @static
            @var {Number}
            @default 9
        */
        UInt                : 9,
        /**
            Attribute type id for Quat.

            * @example
            * typeof attribute.get() === "number";
            * attribute.get() instanceof THREE.Quaternion === true;

            @static
            @var {Number}
            @default 10
        */
        Quat                : 10,
        /**
            Attribute type id for AssetReference.

            * @example
            * typeof attribute.get() === "string";

            @static
            @var {Number}
            @default 11
        */
        AssetReference      : 11,
        /**
            Attribute type id for AssetReferenceList.

            * @example
            * typeof attribute.get() === "object";
            * typeof attribute.get()[0] === "string";
            * Array.isArray(attribute.get()) === true;

            @static
            @var {Number}
            @default 12
        */
        AssetReferenceList  : 12,
        /**
            Attribute type id for EntityReference.

            * @example
            * typeof attribute.get() === "string";

            @static
            @var {Number}
            @default 13
        */
        EntityReference     : 13,
        /**
            Attribute type id for QVariant.

                typeof attribute.get() === "string";

            @static
            @var {Number}
            @default 14
        */
        QVariant            : 14,
        /**
            Attribute type id for QVariantList.

            * @example
            * typeof attribute.get() === "object";
            * typeof attribute.get()[0] === "string";
            * Array.isArray(attribute.get()) === true;

            @static
            @var {Number}
            @default 15
        */
        QVariantList        : 15,
        /**
            Attribute type id for Transform.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof Transform === true;

            @static
            @var {Transform}
            @default 16
        */
        Transform           : 16,
        /**
            Attribute type id for QPoint.

            * @example
            * typeof attribute.get() === "object";
            * attribute.get() instanceof THREE.Vector2 === true;

            @static
            @var {Number}
            @default 17
        */
        QPoint              : 17,

        /**
            Returns list of available attribute type names.

            <b>Note:</b> This function creates a new list that you can manipulate. You can use {{#crossLink "Attribute/typeNameList:property"}}{{/crossLink}}
            for faster access but be sure that you don't modify the list!

            @static
            @return {Array<String>} Available attribute type names list.
        */
        typeNames : function()
        {
            var clone = [];
            for (var i=0; i<Attribute.typeNameList.length; ++i)
                clone.push(Attribute.typeNameList[i]);
            return clone;
        },

        /**
            Returns list of available attribute type ids.

            <b>Note:</b> This function creates a new list that you can manipulate. You can use {{#crossLink "Attribute/typIdList:property"}}{{/crossLink}}
            for faster access but be sure that you don't modify the list!

            @static
            @return {Array<int>} Available attribute type ids list.
        */
        typeIds : function()
        {
            var clone = [];
            for (var i=0; i<Attribute.typIdList.length; ++i)
                clone.push(Attribute.typIdList[i]);
            return clone;
        },

        /**
            Returns attribute type name for a type id.

            @static
            @param {Number} typeId Attribute type id.
            @return {String} Attribute type name.
        */
        toTypeName : function(typeId)
        {
            if (typeof typeId !== "number")
            {
                TundraLogging.getLogger("Attribute").error("toTypeName function called with non number 'typeId'", typeId);
                return null;
            }
            switch (typeId)
            {
                case 1: return "string";
                case 2: return "int";
                case 3: return "real";
                case 4: return "Color";
                case 5: return "float2";
                case 6: return "float3";
                case 7: return "float4";
                case 8: return "bool";
                case 9: return "uint";
                case 10: return "Quat";
                case 11: return "AssetReference";
                case 13: return "EntityReference";
                case 12: return "AssetReferenceList";
                case 15: return "QVariantList";
                case 14: return "QVariant";
                case 16: return "Transform";
                case 17: return "QPoint";
            }
            return null;
        },

        /**
            Returns attribute type id for a type name.

            @static
            @param {String} typeName Attribute type name.
            @return {Number} Attribute type id.
        */
        toTypeId : function(typeName)
        {
            if (typeof typeName !== "string")
            {
                TundraLogging.getLogger("Attribute").error("toTypeId function called with non string 'typeName'", typeName);
                return null;
            }
            var typeNameLower = typeName.toLowerCase();
            if (typeNameLower === "string") return 1;
            else if (typeNameLower === "int") return 2;
            else if (typeNameLower === "real") return 3;
            else if (typeNameLower === "color") return 4;
            else if (typeNameLower === "float2") return 5;
            else if (typeNameLower === "float3") return 6;
            else if (typeNameLower === "float4") return 7;
            else if (typeNameLower === "bool") return 8;
            else if (typeNameLower === "uint") return 9;
            else if (typeNameLower === "quat") return 10;
            else if (typeNameLower === "assetreference") return 11;
            else if (typeNameLower === "entityreference") return 12;
            else if (typeNameLower === "assetreferencelist") return 13;
            else if (typeNameLower === "qvariantlist" || typeNameLower === "variantlist") return 14;
            else if (typeNameLower === "qvariant" || typeNameLower === "variant") return 15;
            else if (typeNameLower === "transform") return 16;
            else if (typeNameLower === "qpoint" || typeNameLower === "point") return 17;
            return null;
        },

        /**
            List of all available attribute type names.

            <b>Note:</b> If you need a mutable list use {{#crossLink "Attribute/typeNames:method"}}{{/crossLink}}.

            @static
            @var {Array.<String>}
        */
        typeNameList :
        [
                "string",       "int",      "real",             "Color",
                "float2",       "float3",   "float4",           "bool",
                "uint",         "Quat",     "EntityReference",  "AssetReferenceList",
                "QVariantList", "QVariant", "Transform",        "QPoint"
        ],

        /**
            List of all available attribute type ids.

            <b>Note:</b> If you need a mutable list use {{#crossLink "Attribute/typeIds:method"}}{{/crossLink}}.

            @static
            @var {Array.<Number>}
        */
        typIdList :
        [
             1,  2,  3,  4,  5,  6,  7,  8,
             9,  10, 11, 12, 13, 14, 15, 16, 17
        ],

        /**
            Returns the size of an attribute in bytes. For String, AssetReference, AssetReferenceList,
            EntityReference, QVariant and QVariantList this function returns 'undefined'.

            @static
            @param {Number} typeId Attribute type id.
            @return {Number|undefined} Size in bytes or undefined.
        */
        sizeInBytes : function(typeId)
        {
            switch (typeId)
            {
                // String
                case 1:
                    return undefined;
                // Int
                case 2:
                    return 4;
                // Real
                case 3:
                    return 4;
                // Color
                case 4:
                    return 4*4;
                // Float2
                case 5:
                    return 2*4;
                // Float3
                case 6:
                    return 3*4;
                // Float4
                case 7:
                    return 4*4;
                // Bool
                case 8:
                    return 1;
                // Uint
                case 9:
                    return 4;
                // Quat
                case 10:
                    return 4*4;
                // AssetReference
                case 11:
                // EntityReference
                case 13:
                // AssetReferenceList
                case 12:
                // QVariantList
                case 15:
                // QVariant
                case 14:
                    return undefined;
                // Transform
                case 16:
                    return 9*4;
                // QPoint
                case 17:
                    return 2*4;
            }
            TundraLogging.getLogger("Attribute").error("Unknown attribute type id " + typeId + ". Cannot resolve size in bytes!");
            return undefined;
        },

        /**
            Returns the pre-known header size for an attribute type,
            if one is needed for the network deserialization.

            @static
            @param {Number} typeId Attribute type id.
            @return {Number} Size in bytes.
        */
        headerSizeInBytes : function(typeId)
        {
            switch (typeId)
            {
                /* String ref with 2 byte header as the length. */
                // String
                case 1:
                    return 2;

                /* String ref with 1 byte header as the length. */
                // AssetReference
                case 11:
                // EntityReference
                case 13:
                    return 1;

                /* String list with 1 byte header as the list lenght.
                   Each string has their own 1 byte header as the lenght. */
                // AssetReferenceList
                case 12:
                // QVariantList
                case 15:
                    return 1;

                /* QVariant is just converted to a string so,
                   string value with 1 byte header as the length. */
                // QVariant
                case 14:
                    return 1;
            }
            return 0;
        },

        /**
            Returns a default "empty" value for a type id.

            @static
            @param {Number} typeId Attribute type id.
            @return {Object}
        */
        defaultValueForType : function(typeId)
        {
            switch (typeId)
            {
                // String
                case 1:
                    return "";
                // Int
                case 2:
                // Uint
                case 9:
                    return 0;
                // Real
                case 3:
                    return 0.0;
                // Color
                case 4:
                    return new Color();
                // Float2
                case 5:
                // QPoint
                case 17:
                    return new THREE.Vector2(0, 0);
                // Float3
                case 6:
                    return new THREE.Vector3(0, 0, 0);
                // Float4
                case 7:
                    return new THREE.Vector4(0, 0, 0, 0);
                // Bool
                case 8:
                    return false;
                // Quat
                case 10:
                    return new THREE.Quaternion();
                // AssetReference
                case 11:
                // EntityReference
                case 13:
                // QVariant
                case 14:
                    return "";
                // AssetReferenceList
                case 12:
                // QVariantList
                case 15:
                    return [];
                // Transform
                case 16:
                    return new Transform();
            }
            TundraLogging.getLogger("Attribute").error("defaultValueForType() Unknown attribute type id " + typeId);
            return null;
        }
    },

    _reset : function()
    {
        this.owner = null;
        this.index = null;
        this.name = null;
        this.id = null;
        this.value = null;
        this.typeId = null;
        this.typeName = null;
        this.sizeBytes = null;
        this.headerSizeBytes = null;
    },

    serializeValue : function()
    {
        switch(this.typeId)
        {
            case 2: // int
            case 9: // uint
            case 3: // real
            case 8: // Bool
                return this.value.toString();
            case 1: // string
            case 11: // AssetReference
            case 13: // EntityReference
            case 14: // QVariant
                return this.value;
            case 17: // QPoint
                return (this.value.x + " " + this.value.y);
            case 5: // Float2
            case 6: // Float3
            case 7: // Float4
            case 10: // Quat
                return this.value.toArray().join(" ");
            case 4: // Color
                return this.value.serializetoString();
            case 12: // AssetReferenceList
            case 15: // QVariantList
                return this.value.join(";");
            case 16: // Transform
                return this.value.formatParts().join(",");
        }
    },

    /**
        Serializes this attribute to JSON.
        @return {object} - The attribute as JSON.
        @example
        * var attributeObject = someAttribute.serializeToObject();
        * // The object is described as follows:
        * // {
        * //      id            : {string}, The attribute ID or "name"
        * //      type          : {string}, The type name of the attribute
        * //      value         : {string}, The value as string
        * // }
    */
    serializeToObject : function()
    {
        var object = {};
        object.id = this.name;
        object.type = this.typeName;
        object.value = this.serializeValue();

        return object;
    },

    /**
        Serializes this attribute to the TXML format.
        @return {Node} - The attribute in XML 
    */
    serializeToXml : function()
    {
        var attributeElement = document.createElement("attribute");
        attributeElement.setAttribute("id", this.name);
        attributeElement.setAttribute("type", this.typeName);
        attributeElement.setAttribute("value", this.serializeValue());

        return attributeElement;
    },

    /**
        Deserializes the attribute from JSON
        @param {object} obj The object to be deserialized
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromObject : function(obj, change)
    {
        change = change || AttributeChange.Default;
        var value = obj.value;
        if (value)
            this.setFromString(value, change);
    },

    /**
        Deserializes the attribute from a XML node
        @param {Node} attributeElement The XML node to be parsed
        @param {AttributeChange} [change=AttributeChange.Default] Change signaling mode.
    */
    deserializeFromXml : function(attributeElement, change)
    {
        change = change || AttributeChange.Default;
        var value = attributeElement.getAttribute("value");
        if (value)
            this.setFromString(value, change);
    },

    /**
        Returns full infromation about this attribute as a string.

        @return {String} Data string.
    */
    toString : function()
    {
        return "index=" + this.index + " name=" + this.name + " typeId=" + this.typeId +
               " typeName=" + this.typeName + " size=" + this.sizeBytes + " header=" + this.headerSizeBytes + " value=" + this.value.toString();
    },

    /**
        Returns attribute value.

        <b>Note:</b> This function can return a reference depending on the attribute type.
        Even if it is a reference the any change signaling wont happen if the value is changes.
        You must use {{#crossLink "Attribute/set:method"}}set(){{/crossLink}} to make a
        permanent signaled and (potentially) network replicated change.

        Use {{#crossLink "Attribute/getClone:method"}}getClone(){{/crossLink}} if you want to be
        sure you are not changing the internal state by modifying a reference.

        @return {Object} Attribute value.
    */
    get : function()
    {
        return this.value;
    },

    /**
        Returns clone of the attribute value. This ensures you are not changing
        the internal state by accidentally modifying a reference.

        See also {{#crossLink "Attribute/get:method"}}get(){{/crossLink}}.

        @return {Object} Clone of the attribute value.
    */
    getClone : function()
    {
        // Handles Transform and Color with our clone() implemention.
        // Handles QPoint, Float2, Float3, Float4, and Quat with three.js clone() implemention.
        if (typeof this.value.getClone === "function")
            return this.value.getClone();
        if (typeof this.value.clone === "function")
            return this.value.clone();

        // Handles QVariant, String, AssetReference, EntityReference, Bool, Int, UInt and Real
        var typeOfValue = typeof this.value;
        if (typeOfValue === "string" || typeOfValue === "boolean" || typeOfValue === "number")
            return this.value;
        // Handles AssetReferenceList and QVariantList
        else if (Array.isArray(this.value))
        {
            var attrClone = [];
            for (var i = 0; i < this.value.length; i++)
                attrClone.push(this.value[i]);
            return attrClone;
        }

        TundraLogging.getLogger("Attribute").warn("getClone() not implemented for type", this.typeName, typeOfValue);
        TundraLogging.getLogger("Attribute").warn(this);
        return this.value;
    },

    /**
        Set attribute value.

        @param {Object} New attribute value.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {Boolean} `true` if set was successful, `false` othewise.
    */
    set : function(value, change)
    {
        if (change === undefined || change === null)
            change = AttributeChange.Default;
        if (typeof change !== "number")
        {
            TundraLogging.getLogger("Attribute").error("set called with non-number change type: " + change);
            return false;
        }

        // Read default change type from parent component.
        if (change === AttributeChange.Default)
            change = (this.owner != null && this.owner.replicated ? AttributeChange.Replicate : AttributeChange.LocalOnly);

        if (this.interpolation)
            this.interpolation.change(value);

        this.value = value;

        if (this.owner != null && change !== AttributeChange.Disconnected)
        {
            this.owner._attributeChanged(this, change);
        }
        return true;
    },

    /**
        Registers a callback for changed event originating for this attribute.

        Also see {{#crossLink "IComponent/onAttributeChanged:method"}}{{/crossLink}} for a more generic change event on a component.

        * @example
        * var entity = Tundra.scene.entityById(12);
        * if (entity == null || entity.placeable == null)
        *     return;
        *
        * entity.placeable.getAttribute("transform").onChanged(null, function(newAttributeValue) {
        *     // instenceof newAttributeValue === Transform
        *     console.log("Transform changed to: " + newAttributeValue.toString());
        * });

        @param {Object} context Context of in which the `callback` function is executed. Can be `null`.
        @param {Function} callback Function to be called.
        @return {EventSubscription|null} Subscription data or null if parent entity or component not set.
        See {{#crossLink "EventAPI/unsubscribe:method"}}EventAPI.unsubscribe(){{/crossLink}} on how to unsubscribe from this event.
    */
    onChanged : function(context, callback)
    {
        if (this.owner == null || !this.owner.hasParentEntity())
        {
            TundraLogging.getLogger("Attribute").error("Cannot subscribe onChanged, parent component or parent entity not set!");
            return null;
        }

        return Tundra.events.subscribe("Scene.AttributeChanged." + this.owner.parentEntity.id.toString() + "." +
            this.owner.id.toString() + "." + this.index.toString(), context, callback);
    },

    headerFromBinary : function(ds)
    {
        if (this.headerSizeBytes > 0)
        {
            if (this.headerSizeBytes === 1)
                return ds.readU8();
            else if (this.headerSizeBytes === 2)
                return ds.readU16();
        }
        return undefined;
    },

    dataFromBinary : function(ds, len)
    {
        /// @todo Pass utf8=true when invoking readString* funcs.
        /// It will be added to Tundra at some point. 'String' type is already UTF8.

        // Parse data
        switch (this.typeId)
        {
            // String
            case 1:
            {
                this.set(ds.readString(len, true), AttributeChange.LocalOnly);
                break;
            }
            // AssetReference
            case 11:
            // EntityReference
            case 13:
            // QVariant
            case 14:
            {
                this.set(ds.readString(len), AttributeChange.LocalOnly);
                break;
            }
            // Int
            case 2:
            {
                this.set(ds.readS32(), AttributeChange.LocalOnly);
                break;
            }
            // Real
            case 3:
            {
                this.set(ds.readFloat32(), AttributeChange.LocalOnly);
                break;
            }
            // Color
            case 4:
            {
                this.value.r = ds.readFloat32();
                this.value.g = ds.readFloat32();
                this.value.b = ds.readFloat32();
                this.value.a = ds.readFloat32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // Float2
            case 5:
            {
                this.value.x = ds.readFloat32();
                this.value.y = ds.readFloat32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // Float3
            case 6:
            {
                this.value.x = ds.readFloat32();
                this.value.y = ds.readFloat32();
                this.value.z = ds.readFloat32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // Float4
            case 7:
            {
                this.value.x = ds.readFloat32();
                this.value.y = ds.readFloat32();
                this.value.z = ds.readFloat32();
                this.value.w = ds.readFloat32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // Bool
            case 8:
            {
                this.set(ds.readBoolean(), AttributeChange.LocalOnly);
                break;
            }
            // Uint
            case 9:
            {
                this.set(ds.readU32(), AttributeChange.LocalOnly);
                break;
            }
            // Quat
            case 10:
            {
                this.value.x = ds.readFloat32();
                this.value.y = ds.readFloat32();
                this.value.z = ds.readFloat32();
                this.value.w = ds.readFloat32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // AssetReferenceList
            case 12:
            // QVariantList
            case 15:
            {
                this.value = [];
                for (var i=0; i<len; ++i)
                    this.value.push(ds.readStringU8());
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // Transform
            case 16:
            {
                this.value.pos.x = ds.readFloat32();
                this.value.pos.y = ds.readFloat32();
                this.value.pos.z = ds.readFloat32();

                this.value.rot.x = ds.readFloat32();
                this.value.rot.y = ds.readFloat32();
                this.value.rot.z = ds.readFloat32();

                this.value.scale.x = ds.readFloat32();
                this.value.scale.y = ds.readFloat32();
                this.value.scale.z = ds.readFloat32();

                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
            // QPoint
            case 17:
            {
                this.value.x = ds.readS32();
                this.value.y = ds.readS32();
                this.set(this.value, AttributeChange.LocalOnly);
                break;
            }
        }
    },

    fromBinary : function(ds)
    {
        // Parse header if size is unknown for this type.
        var len = (this.sizeBytes !== undefined ? this.sizeBytes : this.headerFromBinary(ds));
        if (len === undefined)
        {
            TundraLogging.getLogger("Attribute").error("Size and header size of '" + this.name + "' seems to be unknown, did you mess up the IComponent.declareAttribute() calls?");
            return;
        }
        this.dataFromBinary(ds, len);
    },

    /**
        Set attribute value from string. This asks the underlying attribute to serialize itself from a string.

        @param {String} Attribute value.
        @param {AttributeChange} [change=AttributeChange.Default] Attribute change signaling mode.
        Note: Only AttributeChange.LocalOnly is supported at the moment!
        @return {Boolean} `true` if set was successful, `false` othewise.
    */
    setFromString : function(str, change)
    {
        switch(this.typeId)
        {
            // String
            case 1:
            // AssetReference
            case 11:
            // EntityReference
            case 13:
            // QVariant
            case 14:
            {
                return this.set(str, change);
            }
            // Int
            case 2:
            // Uint
            case 9:
            {
                return this.set(MathUtils.parseInt(str), change);
            }
            // Real
            case 3:
            {
                return this.set(MathUtils.parseFloat(str), change);
            }
            // Float2
            case 5:
            // QPoint
            case 17:
            {
                var parts = MathUtils.splitToFloats(str);
                if (parts.length >= 2)
                {
                    this.value.x = parts[0];
                    this.value.y = parts[1];
                    return this.set(this.value, change);
                }
                return false;
            }
            // Float3
            case 6:
            {
                var parts = MathUtils.splitToFloats(str);
                if (parts.length >= 3)
                {
                    this.value.x = parts[0];
                    this.value.y = parts[1];
                    this.value.z = parts[2];
                    return this.set(this.value, change);
                }
                return false;
            }
            // Float4
            case 7:
            // Quat
            case 10:
            {
                var parts = MathUtils.splitToFloats(str);
                if (parts.length >= 4)
                {
                    this.value.x = parts[0];
                    this.value.y = parts[1];
                    this.value.z = parts[2];
                    this.value.w = parts[3];
                    return this.set(this.value, change);
                }
                return false;
            }
            // Bool
            case 8:
            {
                var lower = str.trim().toLowerCase();
                this.value = (lower === "true" || lower === "1");
                return this.set(this.value, change);
            }
            // AssetReferenceList
            case 12:
            // QVariantList
            case 15:
            {
                this.value = str.split(";");
                return this.set(this.value, change);
            }
            // Color
            // Transform
            default:
            {
                // @todo Assume on failure that the attribute value logs and error?
                if (typeof this.value.fromString === "function")
                {
                    var success = this.value.fromString(str);
                    if (typeof success === "boolean" && success === false)
                        return false;
                    return this.set(this.value, change);
                }
                else
                {
                    TundraLogging.getLogger("Attribute").error("Attribute value type does not implement setFromString/fromString:", this.toString());
                    return false;
                }
            }
        }
    }
});

return Attribute;

}); // require js
