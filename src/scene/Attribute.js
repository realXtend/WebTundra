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

var AttributeChange = {
    Default : 0,
    Disconnected : 1,
    LocalOnly : 2,
    Replicate : 3
};

function Attribute(typeId) {
    this.owner = null;
    this.name = "";
    this.id = "";
    this.valueInternal = null;
    this.index = 0;
    this.typeId = typeId;
    this.typeName = attributeTypeNames[typeId];
    this.dynamic = false;
}

Attribute.prototype = {
    set: function(newValue, changeType) {
        if (newValue != null) {
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
        this.set(newValue, AttributeChange.Default);
    }
}

// String

function AttributeString() {
    Attribute.call(this, cAttributeString);
    this.valueInternal = "";
}
AttributeString.prototype = new Attribute(cAttributeString);

AttributeString.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readUtf8String(), changeType);
};

AttributeString.prototype.toBinary = function(ds){
    ds.addUtf8String(this.value);
};

// Int

function AttributeInt() {
    Attribute.call(this, cAttributeInt);
    this.valueInternal = 0;
}
AttributeInt.prototype = new Attribute(cAttributeInt);

AttributeInt.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readS32(), changeType);
};

AttributeInt.prototype.toBinary = function(ds){
    ds.addS32(this.value);
}

// Real

function AttributeReal() {
    Attribute.call(this, cAttributeReal);
    this.valueInternal = 0.0;
}

AttributeReal.prototype = new Attribute(cAttributeReal);

AttributeReal.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readFloat(), changeType);
};

AttributeReal.prototype.toBinary = function(ds){
    ds.addFloat(this.value);
};

// Color

function AttributeColor() {
    Attribute.call(this, cAttributeColor);
    this.valueInternal = {};
    this.valueInternal.r = 0.0;
    this.valueInternal.g = 0.0;
    this.valueInternal.b = 0.0;
    this.valueInternal.a = 0.0;
}

AttributeColor.prototype = new Attribute(cAttributeColor);

AttributeColor.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.r = dd.readFloat();
    newValue.g = dd.readFloat();
    newValue.b = dd.readFloat();
    newValue.a = dd.readFloat();
    this.set(newValue, changeType);
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
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
}

AttributeFloat2.prototype = new Attribute(cAttributeFloat2);

AttributeFloat2.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    this.set(newValue, changeType);
};

AttributeFloat2.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
};

// Float3

function AttributeFloat3() {
    Attribute.call(this, cAttributeFloat3);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
}

AttributeFloat3.prototype = new Attribute(cAttributeFloat3);

AttributeFloat3.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    this.set(newValue, changeType);
};

AttributeFloat3.prototype.toBinary = function(ds){
    ds.addFloat(this.value.x);
    ds.addFloat(this.value.y);
    ds.addFloat(this.value.z);
};

// Float4

function AttributeFloat4() {
    Attribute.call(this, cAttributeFloat4);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
    this.valueInternal.w = 0.0;
}

AttributeFloat4.prototype = new Attribute(cAttributeFloat4);

AttributeFloat4.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    newValue.w = dd.readFloat();
    this.set(newValue, changeType);
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
    this.valueInternal = false;
}

AttributeBool.prototype = new Attribute(cAttributeBool);

AttributeBool.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readU8() > 0 ? true : false, changeType);
};

AttributeBool.prototype.toBinary = function(ds){
    ds.addU8(this.value == true ? 1 : 0);
}

// UInt

function AttributeUInt() {
    Attribute.call(this, cAttributeUInt);
    this.valueInternal = 0;
}
AttributeUInt.prototype = new Attribute(cAttributeUInt);

AttributeUInt.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readU32(), changeType);
};

AttributeUInt.prototype.toBinary = function(ds){
    ds.addU32(this.value);
}

// Quat

function AttributeQuat() {
    Attribute.call(this, cAttributeQuat);
    this.valueInternal = {};
    this.valueInternal.x = 0.0;
    this.valueInternal.y = 0.0;
    this.valueInternal.z = 0.0;
    this.valueInternal.w = 0.0;
}

AttributeQuat.prototype = new Attribute(cAttributeQuat);

AttributeQuat.prototype.fromBinary = function(dd, changeType){
    var newValue = {};
    newValue.x = dd.readFloat();
    newValue.y = dd.readFloat();
    newValue.z = dd.readFloat();
    newValue.w = dd.readFloat();
    this.set(newValue, changeType);
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
    this.valueInternal = {}
    this.valueInternal.ref = "";
    this.valueInternal.type = "";
}
AttributeAssetReference.prototype = new Attribute(cAttributeAssetReference);

AttributeAssetReference.prototype.fromBinary = function(dd, changeType){
    var oldValue = this.value;
    oldValue.ref = dd.readString(); // Todo: migrate to Utf8String in the protocol
    this.set(oldValue, changeType);
};

AttributeAssetReference.prototype.toBinary = function(ds){
    ds.addString(this.value.ref);
};

// AssetReferenceList

function AttributeAssetReferenceList() {
    Attribute.call(this, cAttributeAssetReferenceList);
    this.valueInternal = []
}

AttributeAssetReferenceList.prototype = new Attribute(cAttributeAssetReference);

AttributeAssetReferenceList.prototype.fromBinary = function(dd, changeType){
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
    this.valueInternal = "";
}
AttributeEntityReference.prototype = new Attribute(cAttributeEntityReference);

AttributeEntityReference.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readString(), changeType); // Todo: migrate to Utf8String in the protocol
};

AttributeEntityReference.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariant

function AttributeQVariant() {
    Attribute.call(this, cAttributeQVariant);
    this.valueInternal = "";
}
AttributeQVariant.prototype = new Attribute(cAttributeQVariant);

AttributeQVariant.prototype.fromBinary = function(dd, changeType){
    this.set(dd.readString(), changeType); // Todo: migrate to Utf8String in the protocol
};

AttributeQVariant.prototype.toBinary = function(ds){
    ds.addString(this.value);
};

// QVariantList

function AttributeQVariantList() {
    Attribute.call(this, cAttributeQVariantList);
    this.valueInternal = [];
}
AttributeQVariantList.prototype = new Attribute(cAttributeQVariantList);

AttributeQVariantList.prototype.fromBinary = function(dd, changeType){
    var newValue = [];
    var numItems = dd.readU8();
    for (var i = 0; i < numItems; i++)
        newValue.push(dd.readString()); // Todo: migrate to Utf8String in the protocol
    this.set(newValue);
};

AttributeQVariantList.prototype.toBinary = function(ds){
    ds.addU8(this.value.length);
    for (var i = 0; i < this.value.length; ++i)
        ds.addString(this.value[i]);
};

// Transform

function AttributeTransform() {
    Attribute.call(this, cAttributeTransform);
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

AttributeTransform.prototype = new Attribute(cAttributeTransform);

AttributeTransform.prototype.fromBinary = function(dd, changeType){
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
    this.valueInternal = {};
    this.valueInternal.x = 0;
    this.valueInternal.y = 0;
}

AttributeQPoint.prototype = new Attribute(cAttributeQPoint);

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
