
define([
        "lib/classy",
    ], function(Class) {

var OgreDefines =
{
    RenderOperation :
    {
        // A list of points, 1 vertex per point
        POINT_LIST       : 1,
        // A list of lines, 2 vertices per line
        LINE_LIST        : 2,
        // A strip of connected lines, 1 vertex per line plus 1 start vertex
        LINE_STRIP       : 3,
        // A list of triangles, 3 vertices per triangle
        TRIANGLE_LIST    : 4,
        // A strip of triangles, 3 vertices for the first triangle, and 1 per triangle after that
        TRIANGLE_STRIP   : 5,
        // A fan of triangles, 3 vertices for the first triangle, and 1 per triangle after that
        TRIANGLE_FAN     : 6
    }
};

return OgreDefines;

}); // require js
