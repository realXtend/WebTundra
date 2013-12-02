// For conditions of distribution and use, see copyright notice in LICENSE

var cAttributeNoneTypeName = "";
var cAttributeStringTypeName = "string";
var cAttributeIntTypeName = "int";
var cAttributeRealTypeName = "real";
var cAttributeColorTypeName = "Color";
var cAttributeFloat2TypeName = "float2";
var cAttributeFloat3TypeName = "float3";
var cAttributeFloat4TypeName = "float4";
var cAttributeBoolTypeName = "bool";
var cAttributeUIntTypeName = "uint";
var cAttributeQuatTypeName = "Quat";
var cAttributeAssetReferenceTypeName = "AssetReference";
var cAttributeAssetReferenceListTypeName = "AssetReferenceList";
var cAttributeEntityReferenceTypeName = "EntityReference";
var cAttributeQVariantTypeName = "QVariant";
var cAttributeQVariantListTypeName = "QVariantList";
var cAttributeTransformTypeName = "Transform";
var cAttributeQPointTypeName = "QPoint";

var cAttributeNone = 0;
var cAttributeString = 1;
var cAttributeInt = 2;
var cAttributeReal = 3;
var cAttributeColor = 4;
var cAttributeFloat2 = 5;
var cAttributeFloat3 = 6;
var cAttributeFloat4 = 7;
var cAttributeBool = 8;
var cAttributeUInt = 9;
var cAttributeQuat = 10;
var cAttributeAssetReference = 11;
var cAttributeAssetReferenceList = 12;
var cAttributeEntityReference = 13;
var cAttributeQVariant = 14;
var cAttributeQVariantList = 15;
var cAttributeTransform = 16;
var cAttributeQPoint = 17;
var cNumAttributeTypes = 18;

var attributeTypeNames = [
    cAttributeNoneTypeName,
    cAttributeStringTypeName,
    cAttributeIntTypeName,
    cAttributeRealTypeName,
    cAttributeColorTypeName,
    cAttributeFloat2TypeName,
    cAttributeFloat3TypeName,
    cAttributeFloat4TypeName,
    cAttributeBoolTypeName,
    cAttributeUIntTypeName,
    cAttributeQuatTypeName,
    cAttributeAssetReferenceTypeName,
    cAttributeAssetReferenceListTypeName,
    cAttributeEntityReferenceTypeName,
    cAttributeQVariantTypeName,
    cAttributeQVariantListTypeName,
    cAttributeTransformTypeName,
    cAttributeQPointTypeName
];

var attributeTypeIds = {
    cAttributeNoneTypeName : cAttributeNone,
    cAttributeStringTypeName : cAttributeString,
    cAttributeIntTypeName : cAttributeInt,
    cAttributeRealTypeName : cAttributeReal,
    cAttributeColorTypeName : cAttributeColor,
    cAttributeFloat2TypeName : cAttributeFloat2,
    cAttributeFloat3TypeName : cAttributeFloat3,
    cAttributeFloat4TypeName : cAttributeFloat4,
    cAttributeBoolTypeName : cAttributeBool,
    cAttributeUIntTypeName : cAttributeUInt,
    cAttributeQuatTypeName : cAttributeQuat,
    cAttributeAssetReferenceTypeName : cAttributeAssetReference,
    cAttributeAssetReferenceListTypeName : cAttributeAssetReferenceList,
    cAttributeEntityReferenceTypeName : cAttributeEntityReference,
    cAttributeQVariantTypeName : cAttributeQVariant,
    cAttributeQVariantListTypeName : cAttributeQVariantList,
    cAttributeTransformTypeName : cAttributeTransform,
    cAttributeQPointTypeName : cAttributeQPoint
};

function Attribute(typeId) {
    this.owner = null;
    this.name = "";
    this.id = "";
    this.value = null;
    this.typeId = typeId;
    this.typeName = attributeTypeNames[typeId];
}

// String

function AttributeString() {
    Attribute.call(this, cAttributeString);
    this.value = "";
}
AttributeString.prototype = new Attribute(cAttributeString);

AttributeString.prototype.fromBinary = function(dd){
    this.value = dd.readUtf8String();
};

AttributeString.prototype.toBinary = function(ds){
    ds.addUtf8String(this.value);
};

// Int

function AttributeInt() {
    Attribute.call(this, cAttributeInt);
    this.value = 0;
}
AttributeInt.prototype = new Attribute(cAttributeInt);

AttributeInt.prototype.fromBinary = function(dd){
    this.value = dd.readS32();
};

AttributeInt.prototype.toBinary = function(ds){
    ds.addS32(this.value);
}

// Real

function AttributeReal() {
    Attribute.call(this, cAttributeReal);
    this.value = 0.0;
}

AttributeReal.prototype = new Attribute(cAttributeReal);

AttributeReal.prototype.fromBinary = function(dd){
    this.value = dd.readFloat();
};

AttributeReal.prototype.toBinary = function(ds){
    ds.addFloat(this.value);
};

// Color

function AttributeColor() {
    Attribute.call(this, cAttributeColor);
    this.value = {};
    this.value.r = 0.0;
    this.value.g = 0.0;
    this.value.b = 0.0;
    this.value.a = 0.0;
}

AttributeColor.prototype = new Attribute(cAttributeColor);

AttributeColor.prototype.fromBinary = function(dd){
    this.value.r = dd.readFloat();
    this.value.g = dd.readFloat();
    this.value.b = dd.readFloat();
    this.value.a = dd.readFloat();
};

AttributeColor.prototype.toBinary = function(ds){
    ds.addFloat(this.value.r);
    ds.addFloat(this.value.g);
    ds.addFloat(this.value.b);
    ds.addFloat(this.value.a);
};

// Float2

function AttributeFloat2() {
    Attribute.call(this, cAttributeFloat2);
    this.value = {};
    this.value.x = 0.0;
    this.value.y = 0.0;
}

AttributeFloat2.prototype = new Attribute(cAttributeFloat2);

AttributeFloat2.prototype.fromBinary = function(dd){
    this.value.x = dd.readFloat();
    this.value.y = dd.readFloat();
};

AttributeFloat2.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
};

// Float3

function AttributeFloat3() {
    Attribute.call(this, cAttributeFloat3);
    this.value = {};
    this.value.x = 0.0;
    this.value.y = 0.0;
    this.value.z = 0.0;
}

AttributeFloat3.prototype = new Attribute(cAttributeFloat3);

AttributeFloat3.prototype.fromBinary = function(dd){
    this.value.x = dd.readFloat();
    this.value.y = dd.readFloat();
    this.value.z = dd.readFloat();
};

AttributeFloat3.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
};

// Float4

function AttributeFloat4() {
    Attribute.call(this, cAttributeFloat4);
    this.value = {};
    this.value.x = 0.0;
    this.value.y = 0.0;
    this.value.z = 0.0;
    this.value.w = 0.0;
}

AttributeFloat4.prototype = new Attribute(cAttributeFloat4);

AttributeFloat4.prototype.fromBinary = function(dd){
    this.value.x = dd.readFloat();
    this.value.y = dd.readFloat();
    this.value.z = dd.readFloat();
    this.value.w = dd.readFloat();
};

AttributeFloat4.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
    ds.addFloat(this.value.w);
};

// Bool

function AttributeBool() {
    Attribute.call(this, cAttributeBool);
    this.value = false;
}

AttributeBool.prototype = new Attribute(cAttributeBool);

AttributeBool.prototype.fromBinary = function(dd){
    this.value = dd.readU8() > 0 ? true : false;
};

AttributeBool.prototype.toBinary = function(ds){
    ds.addU8(this.value == true ? 1 : 0);
}

// UInt

function AttributeUInt() {
    Attribute.call(this, cAttributeUInt);
    this.value = 0;
}
AttributeUInt.prototype = new Attribute(cAttributeUInt);

AttributeUInt.prototype.fromBinary = function(dd){
    this.value = dd.readU32();
};

AttributeUInt.prototype.toBinary = function(ds){
    ds.addU32(this.value);
}

// Quat

function AttributeQuat() {
    Attribute.call(this, cAttributeQuat);
    this.value = {};
    this.value.x = 0.0;
    this.value.y = 0.0;
    this.value.z = 0.0;
    this.value.w = 0.0;
}

AttributeQuat.prototype = new Attribute(cAttributeQuat);

AttributeQuat.prototype.fromBinary = function(dd){
    this.value.x = dd.readFloat();
    this.value.y = dd.readFloat();
    this.value.z = dd.readFloat();
    this.value.w = dd.readFloat();
};

AttributeQuat.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
    ds.addFloat(this.value.w);
};

// AssetReference

function AttributeAssetReference() {
    Attribute.call(this, cAttributeAssetReference);
    this.value = {}
    this.value.ref = "";
    this.value.type = "";
}
AttributeAssetReference.prototype = new Attribute(cAttributeAssetReference);

AttributeAssetReference.prototype.fromBinary = function(dd){
    this.value.ref = dd.readString(); // Todo: migrate to Utf8String in the protocol
};

AttributeAssetReference.prototype.toBinary = function(ds){
    ds.addString(this.value.ref);
};

// AssetReferenceList

function AttributeAssetReferenceList() {
    Attribute.call(this, cAttributeAssetReferenceList);
    this.value = []
}

AttributeAssetReferenceList.prototype = new Attribute(cAttributeAssetReference);

AttributeAssetReferenceList.prototype.fromBinary = function(dd){
    this.value = [];
    var numRefs = dd.readU8();
    for (var i = 0; i < numRefs; i++)
    {
        var newRef = {};
        newRef.ref = dd.readString(); // Todo: migrate to Utf8String in the protocol
        newRef.type = "";
        this.value.push(newRef);
    }
};

AttributeAssetReferenceList.prototype.toBinary = function(ds){
    ds.addU8(this.value.length);
    for (var i = 0; i < this.value.length; i++)
    {
        ds.addString(this.value[i].ref);
    }
};

// EntityReference

function AttributeEntityReference() {
    Attribute.call(this, cAttributeEntityReference);
    this.value = "";
}
AttributeEntityReference.prototype = new Attribute(cAttributeEntityReference);

AttributeEntityReference.prototype.fromBinary = function(dd){
    this.value = dd.readString(); // Todo: migrate to Utf8String in the protocol
};

AttributeEntityReference.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariant

function AttributeQVariant() {
    Attribute.call(this, cAttributeQVariant);
    this.value = "";
}
AttributeQVariant.prototype = new Attribute(cAttributeQVariant);

AttributeQVariant.prototype.fromBinary = function(dd){
    this.value = dd.readString(); // Todo: migrate to Utf8String in the protocol
};

AttributeQVariant.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariantList

function AttributeQVariantList() {
    Attribute.call(this, cAttributeQVariantList);
    this.value = [];
}
AttributeQVariantList.prototype = new Attribute(cAttributeQVariantList);

AttributeQVariantList.prototype.fromBinary = function(dd){
    this.value = [];
    var numItems = dd.readU8();
    for (var i = 0; i < numItems; i++)
        this.value.push(dd.readString()); // Todo: migrate to Utf8String in the protocol
};

AttributeQVariantList.prototype.toBinary = function(ds){
    ds.addU8(this.value.length);
    for (var i = 0; i < this.value.length; ++i)
        ds.addString(this.value[i]);
};

// Transform

function AttributeTransform() {
    Attribute.call(this, cAttributeTransform);
    this.value = {};
    this.value.pos = {};
    this.value.rot = {};
    this.value.scale = {};
    this.value.pos.x = 0.0;
    this.value.pos.y = 0.0;
    this.value.pos.z = 0.0;
    this.value.rot.x = 0.0;
    this.value.rot.y = 0.0;
    this.value.rot.z = 0.0;
    this.value.scale.x = 0.0;
    this.value.scale.y = 0.0;
    this.value.scale.z = 0.0;
}

AttributeTransform.prototype = new Attribute(cAttributeTransform);

AttributeTransform.prototype.fromBinary = function(dd){
    this.value.pos.x = dd.readFloat();
    this.value.pos.y = dd.readFloat();
    this.value.pos.z = dd.readFloat();
    this.value.rot.x = dd.readFloat();
    this.value.rot.y = dd.readFloat();
    this.value.rot.z = dd.readFloat();
    this.value.scale.x = dd.readFloat();
    this.value.scale.y = dd.readFloat();
    this.value.scale.z = dd.readFloat();
};

AttributeTransform.prototype.toBinary = function(ds){
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
    Attribute.call(this, cAttributeQPoint);
    this.value = {};
    this.value.x = 0;
    this.value.y = 0;
}

AttributeQPoint.prototype = new Attribute(cAttributeQPoint);

AttributeQPoint.prototype.fromBinary = function(dd){
    this.value.x = dd.readS32();
    this.value.y = dd.readS32();
};

AttributeQPoint.prototype.toBinary = function(ds){
    ds.addS32(this.value.x);
    ds.addS32(this.value.y);
};

function createAttribute(typeId) {
    // Convert typename to numeric ID if necessary
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = attributeTypeIds[typeId];

    switch (typeId)
    {
    case cAttributeString:
        return new AttributeString();
    case cAttributeInt:
        return new AttributeInt();
    case cAttributeReal:
        return new AttributeReal();
    case cAttributeColor:
        return new AttributeColor();
    case cAttributeFloat2:
        return new AttributeFloat2();
    case cAttributeFloat3:
        return new AttributeFloat3();
    case cAttributeFloat4:
        return new AttributeFloat4();
    case cAttributeBool:
        return new AttributeBool();
    case cAttributeUInt:
        return new AttributeUInt();
    case cAttributeQuat:
        return new AttributeQuat();
    case cAttributeAssetReference:
        return new AttributeAssetReference();
    case cAttributeAssetReferenceList:
        return new AttributeAssetReferenceList();
    case cAttributeEntityReference:
        return new AttributeEntityReference();
    case cAttributeQVariant:
        return new AttributeQVariant();
    case cAttributeQVariantList:
        return new AttributeQVariantList();
    case cAttributeTransform:
        return new AttributeTransform();
    case cAttributeQPoint:
        return new AttributeQPoint();
    default:
        console.log("Can not create unknown attribute type " + typeId);
        return null;
    }
}

function sanitatePropertyName(name) {
    return (name.substring(0, 1).toLowerCase() + name.substring(1)).trim();
}
