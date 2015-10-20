import sys, os
from collections import defaultdict
import re

typetrans = {
    'float': 'Real',
    'bool': 'Bool'
    #'qstring': 'String',
    #'qvariantlist': 'QVariantList',
    #'qvariant': 'QVariant'
}

attrtemplate = """        /**
            @property %s (attribute)
            @type Attribute
        */
        this.declareAttribute(%d, "%s", %s, %s, "%s");"""

def main():
    for input_fn in sys.argv[1:]:
        gen_ec(input_fn)

def gen_ec(filename):
    attr_defaults= read_defaults(re.sub(r'\.h$', '.cpp', filename))

    aidx = 0
    for line in open(filename):
        m = re.search(r'COMPONENT_NAME\("(\w+)", (\d+)', line)
        if m:
            name, typecode = m.groups()
            typevar = 'cComponentType' + name
            print 'var %s = %s;' % (typevar, typecode);
            
            print 'function EC_%s() {' %  name
            print '    Component.call(this, %s);' % typevar

        # DEFINE_QPROPERTY_ATTRIBUTE(Color, diffColor);
        m = re.search(r'DEFINE_QPROPERTY_ATTRIBUTE\((\w+), (\w+)', line)
        if m:
            atype, aid = m.groups()
            atype = typetrans.get(atype.lower(), atype)
            atype = 'Attribute.' + atype
            aname, adefault = attr_defaults.get(aid)
            if adefault.startswith('AssetReference(""'):
                adefault = '""'
            #if adefault:
            print attrtemplate % (aid, aidx, aid, adefault, atype, aname)
            #"else:
            #    print '    this.addAttribute(cAttribute%s, "%s", "%s");' % (atype, aid, aname)
            aidx += 1

    print '}'
    print
    print 'EC_%s.prototype = new Component(%s);' % (name, typevar);
    print
    print 'registerComponent(%s, "%s", function(){ return new EC_%s(); });' % (typevar, name, name)

def read_defaults(filename):        
    out = {}
    if not os.path.exists(filename):
        return out
    for line in open(filename):
        m = re.search(r'INIT_ATTRIBUTE_VALUE\((["\w]+), "([^"]+)", (.*?)\),?s*$', line)
        if m:
            aid, aname, adefault = m.groups()
            mo = re.search(r'Color\((\S+)f, (\S+)f, (\S+)f', adefault)
            if mo:
                adefault = '{r: %s, g: %s, b: %s, a: 0.0}' % mo.groups()
            if re.search(r'\df$', adefault):
                adefault = adefault[:-1]
            out[aid] = aname, adefault
        else:
            if 'INIT_ATTRIBUTE_VALUE' in line:
                raise ValueError("failed to parse INIT_ATTRIBUTE_VALUE line: " + repr(line))
    return out
        
if __name__ == '__main__':
    main()
