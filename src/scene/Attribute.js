"use strict";
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global signals, Tundra */
// For conditions of distribution and use, see copyright notice in LICENSE

if (Tundra === undefined)
    var Tundra = {};

Tundra.cAttributeNoneTypeName = "";
Tundra.cAttributeStringTypeName = "string";
Tundra.cAttributeIntTypeName = "int";
Tundra.cAttributeRealTypeName = "real";
Tundra.cAttributeColorTypeName = "Color";
Tundra.cAttributeFloat2TypeName = "float2";
Tundra.cAttributeFloat3TypeName = "float3";
Tundra.cAttributeFloat4TypeName = "float4";
Tundra.cAttributeBoolTypeName = "bool";
Tundra.cAttributeUIntTypeName = "uint";
Tundra.cAttributeQuatTypeName = "Quat";
Tundra.cAttributeAssetReferenceTypeName = "AssetReference";
Tundra.cAttributeAssetReferenceListTypeName = "AssetReferenceList";
Tundra.cAttributeEntityReferenceTypeName = "EntityReference";
Tundra.cAttributeQVariantTypeName = "QVariant";
Tundra.cAttributeQVariantListTypeName = "QVariantList";
Tundra.cAttributeTransformTypeName = "Transform";
Tundra.cAttributeQPointTypeName = "QPoint";

Tundra.cAttributeNone = 0;
Tundra.cAttributeString = 1;
Tundra.cAttributeInt = 2;
Tundra.cAttributeReal = 3;
Tundra.cAttributeColor = 4;
Tundra.cAttributeFloat2 = 5;
Tundra.cAttributeFloat3 = 6;
Tundra.cAttributeFloat4 = 7;
Tundra.cAttributeBool = 8;
Tundra.cAttributeUInt = 9;
Tundra.cAttributeQuat = 10;
Tundra.cAttributeAssetReference = 11;
Tundra.cAttributeAssetReferenceList = 12;
Tundra.cAttributeEntityReference = 13;
Tundra.cAttributeQVariant = 14;
Tundra.cAttributeQVariantList = 15;
Tundra.cAttributeTransform = 16;
Tundra.cAttributeQPoint = 17;
Tundra.cNumAttributeTypes = 18;

Tundra.attributeTypeNames = [
    Tundra.cAttributeNoneTypeName,
    Tundra.cAttributeStringTypeName,
    Tundra.cAttributeIntTypeName,
    Tundra.cAttributeRealTypeName,
    Tundra.cAttributeColorTypeName,
    Tundra.cAttributeFloat2TypeName,
    Tundra.cAttributeFloat3TypeName,
    Tundra.cAttributeFloat4TypeName,
    Tundra.cAttributeBoolTypeName,
    Tundra.cAttributeUIntTypeName,
    Tundra.cAttributeQuatTypeName,
    Tundra.cAttributeAssetReferenceTypeName,
    Tundra.cAttributeAssetReferenceListTypeName,
    Tundra.cAttributeEntityReferenceTypeName,
    Tundra.cAttributeQVariantTypeName,
    Tundra.cAttributeQVariantListTypeName,
    Tundra.cAttributeTransformTypeName,
    Tundra.cAttributeQPointTypeName
];

Tundra.attributeTypeIds = {
    "" : Tundra.cAttributeNone,
    "string" : Tundra.cAttributeString,
    "int" : Tundra.cAttributeInt,
    "real" : Tundra.cAttributeReal,
    "Color" : Tundra.cAttributeColor,
    "float2" : Tundra.cAttributeFloat2,
    "float3" : Tundra.cAttributeFloat3,
    "float4" : Tundra.cAttributeFloat4,
    "bool" : Tundra.cAttributeBool,
    "uint" : Tundra.cAttributeUInt,
    "Quat" : Tundra.cAttributeQuat,
    "AssetReference" : Tundra.cAttributeAssetReference,
    "AssetReferenceList" : Tundra.cAttributeAssetReferenceList,
    "EntityReference" : Tundra.cAttributeEntityReference,
    "QVariant" : Tundra.cAttributeQVariant,
    "QVariantList" : Tundra.cAttributeQVariantList,
    "Transform" : Tundra.cAttributeTransform,
    "QPoint" : Tundra.cAttributeQPoint
};

Tundra.AttributeChange = {
    Default : 0,
    Disconnected : 1,
    LocalOnly : 2,
    Replicate : 3
};

Tundra.Attribute = function(typeId) {
    this.owner = null;
    this.name = "";
    this.id = "";
    this.valueInternal = null;
    this.index = 0;
    this.typeId = typeId;
    this.typeName = Tundra.attributeTypeNames[typeId];
    this.dynamic = false;
}

Tundra.Attribute.prototype = {
    set: function(newValue, changeType) {
        if (newValue !== null) {
            //TODO: would be good to validate here. as the attributes are typed and all..
            this.valueInternal = newValue;
            if (this.owner)
                this.owner.emitAttributeChanged(this, changeType);
        }
    },

    get value(){
        return this.valueInternal;
    },

    set value(newValue){
        this.set(newValue, Tundra.AttributeChange.Default);
    }
};

// String

Tundra.AttributeString = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeString);
    this.valueInternal = "";
};
Tundra.AttributeString.prototype = new Tundra.Attribute(Tundra.cAttributeString);

Tundra.AttributeString.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readUtf8String(), changeType);
};

Tundra.AttributeString.prototype.toBinary = function(ds){
    ds.addUtf8String(this.value);
};

// Int

Tundra.AttributeInt = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeInt);
    this.valueInternal = 0;
};
Tundra.AttributeInt.prototype = new Tundra.Attribute(Tundra.cAttributeInt);

Tundra.AttributeInt.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readS32(), changeType);
};

Tundra.AttributeInt.prototype.toBinary = function(ds){
    ds.addS32(this.value);
};

// Real

Tundra.AttributeReal = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeReal);
    this.valueInternal = 0.0;
}

Tundra.AttributeReal.prototype = new Tundra.Attribute(Tundra.cAttributeReal);

Tundra.AttributeReal.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readFloat(), changeType);
};

Tundra.AttributeReal.prototype.toBinary = function(ds){
    ds.addFloat(this.value);
};

// Color

Tundra.AttributeColor = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeColor);
    this.valueInternal = {};
    this.valueInternal.r = 0.0;
    this.valueInternal.g = 0.0;
    this.valueInternal.b = 0.0;
    this.valueInternal.a = 0.0;
};

Tundra.AttributeColor.prototype = new Tundra.Attribute(Tundra.cAttributeColor);

Tundra.AttributeColor.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.r = dd.readFloat();
    newValue.g = dd.readFloat();
    newValue.b = dd.readFloat();
    newValue.a = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeColor.prototype.toBinary = function(ds){
    ds.addFloat(this.value.r);
    ds.addFloat(this.value.g);
    ds.addFloat(this.value.b);
    ds.addFloat(this.value.a);
};

// Float2

Tundra.AttributeFloat2 = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeFloat2);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
};

Tundra.AttributeFloat2.prototype = new Tundra.Attribute(Tundra.cAttributeFloat2);

Tundra.AttributeFloat2.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeFloat2.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
};

// Float3

Tundra.AttributeFloat3 = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeFloat3);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
}

Tundra.AttributeFloat3.prototype = new Tundra.Attribute(Tundra.cAttributeFloat3);

Tundra.AttributeFloat3.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeFloat3.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
};

// Float4

Tundra.AttributeFloat4 = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeFloat4);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
    this.valueInternal.w = 0.0;
}

Tundra.AttributeFloat4.prototype = new Tundra.Attribute(Tundra.cAttributeFloat4);

Tundra.AttributeFloat4.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    newValue.w = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeFloat4.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
    ds.addFloat(this.value.w);
};

// Bool

Tundra.AttributeBool = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeBool);
    this.valueInternal = false;
}

Tundra.AttributeBool.prototype = new Tundra.Attribute(Tundra.cAttributeBool);

Tundra.AttributeBool.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readU8() > 0 ? true : false, changeType);
};

Tundra.AttributeBool.prototype.toBinary = function(ds){
    ds.addU8(this.value == true ? 1 : 0);
};

// UInt

Tundra.AttributeUInt = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeUInt);
    this.valueInternal = 0;
}
Tundra.AttributeUInt.prototype = new Tundra.Attribute(Tundra.cAttributeUInt);

Tundra.AttributeUInt.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readU32(), changeType);
};

Tundra.AttributeUInt.prototype.toBinary = function(ds){
    ds.addU32(this.value);
}

// Quat

Tundra.AttributeQuat = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeQuat);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
    this.valueInternal.w = 0.0;
};

Tundra.AttributeQuat.prototype = new Tundra.Attribute(Tundra.cAttributeQuat);

Tundra.AttributeQuat.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    newValue.w = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeQuat.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
    ds.addFloat(this.value.w);
};

// AssetReference

Tundra.AttributeAssetReference = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeAssetReference);
    this.valueInternal = {}
    this.valueInternal.ref = "";
    this.valueInternal.type = "";
};
Tundra.AttributeAssetReference.prototype = new Tundra.Attribute(Tundra.cAttributeAssetReference);

Tundra.AttributeAssetReference.prototype.fromBinary = function(dd, changeType){
    var oldValue = this.value;
    oldValue.ref = dd.readString(); // Todo: migrate to Utf8String in the protocol
    this.set(oldValue, changeType);
};

Tundra.AttributeAssetReference.prototype.toBinary = function(ds){
    ds.addString(this.value.ref);
};

// AssetReferenceList

Tundra.AttributeAssetReferenceList = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeAssetReferenceList);
    this.valueInternal = []
}

Tundra.AttributeAssetReferenceList.prototype = new Tundra.Attribute(Tundra.cAttributeAssetReference);

Tundra.AttributeAssetReferenceList.prototype.fromBinary = function(dd, changeType){
    var newValue = [];
    var numRefs = dd.readU8();
    for (var i = 0; i < numRefs; i++)
    {
        var newRef = {};
        newRef.ref = dd.readString(); // Todo: migrate to Utf8String in the protocol
        newRef.type = "";
        newValue.push(newRef);
    }
    this.set(newValue, changeType);
};

Tundra.AttributeAssetReferenceList.prototype.toBinary = function(ds){
    ds.addU8(this.value.length);
    for (var i = 0; i < this.value.length; i++)
    {
        ds.addString(this.value[i].ref);
    }
};

// EntityReference

Tundra.AttributeEntityReference = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeEntityReference);
    this.valueInternal = "";
};
Tundra.AttributeEntityReference.prototype = new Tundra.Attribute(Tundra.cAttributeEntityReference);

Tundra.AttributeEntityReference.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readString(), changeType); // Todo: migrate to Utf8String in the protocol
};

Tundra.AttributeEntityReference.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariant

Tundra.AttributeQVariant = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeQVariant);
    this.valueInternal = "";
};
Tundra.AttributeQVariant.prototype = new Tundra.Attribute(Tundra.cAttributeQVariant);

Tundra.AttributeQVariant.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readString(), changeType); // Todo: migrate to Utf8String in the protocol
};

Tundra.AttributeQVariant.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariantList

Tundra.AttributeQVariantList = function() {
    Tundra.Attribute.call(this, Tundra.cAttributeQVariantList);
    this.valueInternal = [];
}
Tundra.AttributeQVariantList.prototype = new Tundra.Attribute(Tundra.cAttributeQVariantList);

Tundra.AttributeQVariantList.prototype.fromBinary = function(dd, changeType){
    var newValue = [];
    var numItems = dd.readU8();
    for (var i = 0; i < numItems; i++)
        newValue.push(dd.readString()); // Todo: migrate to Utf8String in the protocol
    this.set(newValue);
};

Tundra.AttributeQVariantList.prototype.toBinary = function(ds){
    ds.addU8(this.value.length);
    for (var i = 0; i < this.value.length; ++i)
        ds.addString(this.value[i]);
};

// Transform

Tundra.AttributeTransform = function () {
    Tundra.Attribute.call(this, Tundra.cAttributeTransform);
    this.valueInternal = {};
    this.valueInternal.pos = {};
    this.valueInternal.rot = {};
    this.valueInternal.scale = {};
    this.valueInternal.pos.x = 0.0;
    this.valueInternal.pos.y = 0.0;
    this.valueInternal.pos.z = 0.0;
    this.valueInternal.rot.x = 0.0;
    this.valueInternal.rot.y = 0.0;
    this.valueInternal.rot.z = 0.0;
    this.valueInternal.scale.x = 1.0;
    this.valueInternal.scale.y = 1.0;
    this.valueInternal.scale.z = 1.0;
}

Tundra.AttributeTransform.prototype = new Tundra.Attribute(Tundra.cAttributeTransform);

Tundra.AttributeTransform.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.pos = {};
    newValue.rot = {};
    newValue.scale = {};
    newValue.pos.x = dd.readFloat();
    newValue.pos.y = dd.readFloat();
    newValue.pos.z = dd.readFloat();
    newValue.rot.x = dd.readFloat();
    newValue.rot.y = dd.readFloat();
    newValue.rot.z = dd.readFloat();
    newValue.scale.x = dd.readFloat();
    newValue.scale.y = dd.readFloat();
    newValue.scale.z = dd.readFloat();
    this.set(newValue, changeType);
};

Tundra.AttributeTransform.prototype.toBinary = function(ds){
    ds.addFloat(this.value.pos.x);
    ds.addFloat(this.value.pos.y);
    ds.addFloat(this.value.pos.z);
    ds.addFloat(this.value.rot.x);
    ds.addFloat(this.value.rot.y);
    ds.addFloat(this.value.rot.z);
    ds.addFloat(this.value.scale.x);
    ds.addFloat(this.value.scale.y);
    ds.addFloat(this.value.scale.z);
};

// QPoint

function AttributeQPoint() {
    Tundra.Attribute.call(this, Tundra.cAttributeQPoint);
    this.valueInternal = {};
    this.valueInternal.x = 0;
    this.valueInternal.y = 0;
}

AttributeQPoint.prototype = new Tundra.Attribute(Tundra.cAttributeQPoint);

AttributeQPoint.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readS32();
    newValue.y = dd.readS32();
    this.set(newValue);
};

AttributeQPoint.prototype.toBinary = function(ds){
    ds.addS32(this.value.x);
    ds.addS32(this.value.y);
};

Tundra.createAttribute = function(typeId) {
    // Convert typename to numeric ID if necessary
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = Tundra.attributeTypeIds[typeId];

    switch (typeId)
    {
    case Tundra.cAttributeString:
        return new Tundra.AttributeString();
    case Tundra.cAttributeInt:
        return new Tundra.AttributeInt();
    case Tundra.cAttributeReal:
        return new Tundra.AttributeReal();
    case Tundra.cAttributeColor:
        return new Tundra.AttributeColor();
    case Tundra.cAttributeFloat2:
        return new Tundra.AttributeFloat2();
    case Tundra.cAttributeFloat3:
        return new Tundra.AttributeFloat3();
    case Tundra.cAttributeFloat4:
        return new Tundra.AttributeFloat4();
    case Tundra.cAttributeBool:
        return new Tundra.AttributeBool();
    case Tundra.cAttributeUInt:
        return new Tundra.AttributeUInt();
    case Tundra.cAttributeQuat:
        return new Tundra.AttributeQuat();
    case Tundra.cAttributeAssetReference:
        return new Tundra.AttributeAssetReference();
    case Tundra.cAttributeAssetReferenceList:
        return new Tundra.AttributeAssetReferenceList();
    case Tundra.cAttributeEntityReference:
        return new Tundra.AttributeEntityReference();
    case Tundra.cAttributeQVariant:
        return new Tundra.AttributeQVariant();
    case Tundra.cAttributeQVariantList:
        return new Tundra.AttributeQVariantList();
    case Tundra.cAttributeTransform:
        return new Tundra.AttributeTransform();
    case Tundra.cAttributeQPoint:
        return new Tundra.AttributeQPoint();
    default:
        console.log("Can not create unknown attribute type " + typeId);
        return null;
    }
};

Tundra.sanitatePropertyName = function(name) {
    return (name.substring(0, 1).toLowerCase() + name.substring(1)).trim();
};
